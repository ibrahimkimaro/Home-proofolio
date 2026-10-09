"""The tool-calling loop: the model asks for tools, we run them, it answers from the results.

    result = await run_agent(engine.llm, system, history, "What did I build this year?", tools)

Tools are LangChain tools: the user's own data (app/ai/tools.py) and the MCP tools (app/ai/mcp_client.py).
Tool calls of one step run one after another, because the user-data tools share one database session.
"""
import json
import logging
import re
import time
from dataclasses import dataclass, field

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.ai.engine import message_text
from app.core.config import settings

log = logging.getLogger("app.ai.agent")

MAX_TOOL_CHARS = 6000  # one tool result, as the model sees it
MAX_HISTORY_LINES = 8
MAX_LINE_CHARS = 2000
AI_PREFIXES = ("ai", "assistant", "kimmy", "bot")
FINISH = "Answer the user now with what you already have. Do not call any tool."


class EmptyReply(RuntimeError):
    """The model returned no text (for example it spent the whole token budget thinking)."""


@dataclass
class AgentResult:
    text: str
    tools_used: list[str] = field(default_factory=list)
    steps: int = 0  # model calls made
    seconds: float = 0.0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


def history_messages(lines: list[str]) -> list:
    """Earlier turns ("User: ..." / "AI: ...", oldest first) as chat messages. Unlabelled lines count as the user's."""
    out = []
    for line in lines[-MAX_HISTORY_LINES:]:
        label, sep, text = line.partition(":")
        if sep and label.strip().lower() in AI_PREFIXES:
            out.append(AIMessage(content=text.strip()[:MAX_LINE_CHARS]))
        else:
            out.append(HumanMessage(content=(text.strip() if sep and label.strip().lower() == "user" else line.strip())[:MAX_LINE_CHARS]))
    return [m for m in out if m.content]


def earlier_turns(history: list[str], message: str) -> list[str]:
    """History without the message being answered now: some clients (the website) send it as the last line too."""
    if history and re.sub(r"^\s*user\s*:\s*", "", history[-1], flags=re.I).strip() == message.strip():
        return history[:-1]
    return history


def _as_text(output) -> str:
    if not isinstance(output, str):
        output = json.dumps(output, ensure_ascii=False, default=str)
    return output if len(output) <= MAX_TOOL_CHARS else output[:MAX_TOOL_CHARS] + "\n...(cut: ask for fewer items or a narrower search)"


async def _run_tool(tools: dict, name: str, arguments: dict) -> str:
    tool = tools.get(name)
    if tool is None:
        return f"Error: there is no tool named {name}. Available: {', '.join(tools) or 'none'}."
    try:
        return _as_text(await tool.ainvoke(arguments or {}))
    except Exception as e:  # bad arguments, database or network trouble: tell the model, it can retry or apologise
        log.warning("tool %s failed: %s: %s", name, type(e).__name__, e)
        return f"Error: {name} failed ({type(e).__name__}: {str(e)[:300]})"


def tool_state(name: str) -> str:
    """What the user sees while this tool runs: writing a story is "composing", reading their data is "searching"."""
    return "composing" if name.startswith(("write_", "create_")) else "searching"


async def run_agent(llm, system: str, history: list, user_input: str, tools: list, max_steps: int | None = None, on_state=None,
                    think_state: str = "thinking") -> AgentResult:
    """One chat turn. `history` is a list of messages (see history_messages), `tools` a list of LangChain tools.

    A tool with return_direct=True ends the turn: its output is the reply, word for word.
    Raises EmptyReply if the model never produces text, and whatever the model client raises when it is unreachable.
    """
    started = time.perf_counter()

    async def say(state: str):
        if on_state:
            await on_state(state)

    # Deduplicate tools by name so the LLM never receives duplicate function declarations
    seen_tool_names = set()
    unique_tools = []
    for t in tools:
        if t.name not in seen_tool_names:
            seen_tool_names.add(t.name)
            unique_tools.append(t)
    tools = unique_tools

    max_steps = max_steps or settings.ai_max_tool_steps
    by_name = {t.name: t for t in tools}
    model = llm.bind_tools(tools) if tools else llm
    messages = [SystemMessage(content=system), *history, HumanMessage(content=user_input)]
    used: list[str] = []
    calls_made = 0
    prompt_tokens = 0
    completion_tokens = 0
    total_tokens = 0

    def add_usage(msg):
        nonlocal prompt_tokens, completion_tokens, total_tokens
        usage = getattr(msg, "usage_metadata", None) or getattr(msg, "response_metadata", {}).get("token_usage", {})
        if isinstance(usage, dict):
            p = usage.get("input_tokens") or usage.get("prompt_tokens") or 0
            c = usage.get("output_tokens") or usage.get("completion_tokens") or 0
            t = usage.get("total_tokens") or (p + c)
            prompt_tokens += p
            completion_tokens += c
            total_tokens += t

    def done(text: str) -> AgentResult:
        nonlocal prompt_tokens, completion_tokens, total_tokens
        if total_tokens == 0:
            prompt_tokens = sum(len(str(getattr(m, "content", ""))) for m in messages) // 4
            completion_tokens = max(1, len(text) // 4)
            total_tokens = prompt_tokens + completion_tokens
        result = AgentResult(
            text, used, calls_made, round(time.perf_counter() - started, 2),
            prompt_tokens, completion_tokens, total_tokens
        )
        log.info("ai turn: %d model call(s), tools=%s, %.1fs, tokens=%d", result.steps, used or "-", result.seconds, total_tokens)
        return result

    for _ in range(max_steps):
        await say(think_state)
        answer = await model.ainvoke(messages)
        calls_made += 1
        add_usage(answer)
        calls = list(getattr(answer, "tool_calls", None) or [])
        broken = list(getattr(answer, "invalid_tool_calls", None) or [])  # arguments that were not valid JSON
        if not calls and not broken:
            text = message_text(answer)
            if text:
                return done(text)
            break  # empty answer: one last try below
        messages.append(answer)
        for call in calls:
            used.append(call["name"])
            await say(tool_state(call["name"]))
            output = await _run_tool(by_name, call["name"], call.get("args"))
            if getattr(by_name.get(call["name"]), "return_direct", False) and not output.startswith("Error:"):
                return done(output)
            messages.append(ToolMessage(content=output, tool_call_id=call.get("id") or call["name"], name=call["name"]))
        for call in broken:
            messages.append(ToolMessage(content="Error: the arguments were not valid JSON. Call the tool again with a JSON object.",
                                        tool_call_id=call.get("id") or call.get("name") or "call", name=call.get("name") or "tool"))

    # Out of tool rounds, or the model answered with nothing: ask once more, without tools.
    await say(think_state)
    answer = await llm.ainvoke([*messages, HumanMessage(content=FINISH)])
    calls_made += 1
    add_usage(answer)
    text = message_text(answer)
    if not text:
        raise EmptyReply("the model returned an empty answer")
    return done(text)

