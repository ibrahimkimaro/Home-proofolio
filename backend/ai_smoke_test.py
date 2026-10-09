"""Checks the AI end to end: token -> model -> tool calling -> MCP -> full agent. No database needed.

    python ai_smoke_test.py            run all checks            (Docker: docker compose exec backend python ai_smoke_test.py)
    python ai_smoke_test.py --chat     then chat with the model in the terminal (general tools only, no user data)
"""
import asyncio
import sys
import time

from langchain_core.tools import StructuredTool

from app.ai.agent import history_messages, run_agent
from app.ai.engine import ConnectedEngine, explain_error, model_name, system_prompt
from app.ai.knowledge import relevant_knowledge
from app.ai.mcp_client import general_tools, status as mcp_status
from app.core.config import settings

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # Windows consoles

results: list[tuple[str, bool]] = []


def report(name: str, ok: bool, detail: str = "") -> bool:
    results.append((name, ok))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f"\n       {detail}" if detail else ""))
    return ok


async def get_my_projects() -> list[dict]:
    """The user's projects."""
    return [{"title": "Home Proofolio", "status": "active"}, {"title": "Realtime chat", "status": "done"}]


async def check() -> ConnectedEngine | None:
    provider = settings.ai_provider.lower()
    token = settings.huggingface_api_token
    print(f"Provider: {provider}   Model: {model_name()}   Thinking: {settings.ai_reasoning_effort or 'default'}")
    if provider in ("gemini", "google"):
        key = settings.gemini_api_key
        print(f"Endpoint: {settings.gemini_base_url}   Key: {'...' + key[-6:] if key else 'MISSING'}")
    elif provider != "ollama":
        print(f"Router:   {settings.huggingface_base_url}   Token: {'hf_...' + token[-4:] if token else 'MISSING'}")
    print()

    # 1. configuration
    try:
        engine = ConnectedEngine()
        report("1. Configuration (token and packages)", True)
    except Exception as e:
        report("1. Configuration (token and packages)", False, explain_error(e))
        return None

    # 2. plain message out, message back
    sent = "Reply with the single word: pong"
    try:
        started = time.perf_counter()
        got = await engine.ping()
        ok = report("2. Send a message, receive the answer", "pong" in got.lower(),
                    f"sent: {sent!r}\n       received: {got!r} in {time.perf_counter() - started:.1f}s")
    except Exception as e:
        ok = report("2. Send a message, receive the answer", False, explain_error(e))
    if not ok:
        return None  # nothing below can work without the model

    # 3. the model asks for a tool, gets the result, answers from it
    try:
        tool = StructuredTool.from_function(coroutine=get_my_projects, name="get_my_projects", description="The user's projects.")
        r = await run_agent(engine.llm, system_prompt(), [], "Which projects do I have? Use your tool.", [tool])
        report("3. Tool calling (model -> tool -> model)", "get_my_projects" in r.tools_used and "proofolio" in r.text.lower(),
               f"tools used: {r.tools_used}, {r.steps} model calls, {r.seconds}s\n       answer: {r.text[:200]!r}")
    except Exception as e:
        report("3. Tool calling (model -> tool -> model)", False, explain_error(e))

    # 4. MCP server starts and serves its tools
    tools = await general_tools(dev=True)
    state = mcp_status()
    names = [t.name for t in tools]
    try:
        value = await next(t for t in tools if t.name == "calculate").ainvoke({"expression": "18 / 24 * 100"})
    except Exception as e:
        value = f"{type(e).__name__}: {e}"
    over_mcp = state["builtin_transport"] == "mcp"
    report("4. MCP server (tools listed and called over MCP)", over_mcp and str(value).startswith("75"),
           f"transport: {state['builtin_transport']}   tools: {', '.join(names)}\n       calculate('18 / 24 * 100') -> {value}"
           + ("" if over_mcp else f"\n       MCP did not start, tools run in-process instead: {state['failed']}"))

    # 5. the whole chain the app uses: prompt + knowledge + MCP tools + agent loop
    try:
        question = "I finished 18 of my 24 tasks. What percent is that? Use the calculator, then answer in one sentence."
        r = await run_agent(engine.llm, system_prompt(knowledge=relevant_knowledge(question), who="You are talking to a tester."),
                            [], question, tools)
        report("5. Full agent (prompt + knowledge + tools)", "calculate" in r.tools_used and "75" in r.text,
               f"tools used: {r.tools_used}, {r.steps} model calls, {r.seconds}s\n       answer: {r.text[:200]!r}")
    except Exception as e:
        report("5. Full agent (prompt + knowledge + tools)", False, explain_error(e))

    # 6. Kiswahili and memory of the conversation
    try:
        r = await run_agent(engine.llm, system_prompt(), history_messages(["User: Jina langu ni Amina.", "AI: Karibu Amina!"]),
                            "Jina langu ni nani? Jibu kwa Kiswahili.", [])
        report("6. Conversation history and Kiswahili", "amina" in r.text.lower(), f"answer: {r.text[:200]!r}")
    except Exception as e:
        report("6. Conversation history and Kiswahili", False, explain_error(e))
    return engine


async def chat(engine: ConnectedEngine) -> None:
    print("\nChat with the model (empty line or Ctrl+C to stop). General tools only: no user data here.\n")
    tools, history = await general_tools(dev=True), []
    while True:
        try:
            text = (await asyncio.to_thread(input, "You: ")).strip()
        except (EOFError, KeyboardInterrupt):
            break
        if not text:
            break
        try:
            r = await run_agent(engine.llm, system_prompt(knowledge=relevant_knowledge(text), who="You are talking to the developer."),
                                history_messages(history), text, tools)
        except Exception as e:
            print(f"  ! {explain_error(e)}\n")
            continue
        print(f"AI:  {r.text}\n     ({r.seconds}s" + (f", tools: {', '.join(r.tools_used)}" if r.tools_used else "") + ")\n")
        history += [f"User: {text}", f"AI: {r.text}"]


async def main() -> int:
    engine = await check()
    passed = sum(ok for _, ok in results)
    print(f"\n{passed}/{len(results)} checks passed." + ("" if engine else " Fix the first failure and run again."))
    if engine and "--chat" in sys.argv:
        await chat(engine)
    return 0 if engine and passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
