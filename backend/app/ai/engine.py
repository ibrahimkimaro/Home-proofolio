"""The chat model behind the AI companion.

Default: Qwen/Qwen3.8-27B on Hugging Face Inference Providers, reached through the OpenAI-compatible router
(https://router.huggingface.co/v1) with LangChain's ChatOpenAI. AI_PROVIDER=ollama switches to the local model.
The tool loop that uses this model lives in app/ai/agent.py.
"""
import logging
import re
import ssl
from datetime import datetime, timedelta, timezone

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableLambda

from app.core.config import settings

log = logging.getLogger("app.ai")

_THINK_BLOCK = re.compile(r"<think>.*?</think>", re.S | re.I)
_THINK_TAIL = re.compile(r"^.*?</think>", re.S | re.I)  # reply that starts in the middle of a thought


class AIConfigError(RuntimeError):
    """The AI is not configured (missing token or package). The message says what to fix."""


def message_text(message) -> str:
    """The visible answer of a model message: text parts only, thinking removed, trimmed."""
    content = getattr(message, "content", message)
    if isinstance(content, list):
        content = "".join(p if isinstance(p, str) else p.get("text", "") for p in content if isinstance(p, str) or p.get("type", "text") == "text")
    text = _THINK_BLOCK.sub("", content or "")
    return _THINK_TAIL.sub("", text).strip()


def single_system(messages) -> list:
    """All system messages joined into one at the top: Qwen's chat template only accepts a leading system message."""
    messages = messages.to_messages() if hasattr(messages, "to_messages") else list(messages)
    system = "\n\n".join(m.content for m in messages if isinstance(m, SystemMessage) and m.content.strip())
    rest = [m for m in messages if not isinstance(m, SystemMessage)]
    return ([SystemMessage(content=system)] if system else []) + rest


def resolve_ollama_base_url() -> str:
    """Probe candidate endpoints to find the reachable Ollama instance from host or Docker."""
    import urllib.request
    configured = (settings.ollama_base_url or "").strip()
    if configured:
        try:
            req = urllib.request.Request(f"{configured.rstrip('/')}/api/tags", headers={"User-Agent": "Probe"})
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                if resp.status == 200:
                    log.info("Resolved configured Ollama endpoint: %s", configured)
                    return configured
        except Exception as e:
            log.warning("Configured Ollama URL %s not reachable (%s); probing candidates...", configured, e)

    candidates = [
        settings.ollama_base_url,
        "http://192.168.100.60:7777",
        "http://172.23.240.1:7777",
        "http://host.docker.internal:7777",
        "http://gateway.docker.internal:7777",
        "http://172.23.240.1:11434",
        "http://192.168.100.60:11434",
        "http://172.26.160.1:11434",
        "http://172.17.0.1:11434",
        "http://127.0.0.1:11434",
        "http://localhost:11434",
        "http://host.docker.internal:11435",
        "http://gateway.docker.internal:11434",
        "http://172.23.241.217:11434",
        "http://172.23.240.1:11435",
        "http://192.168.100.60:11435",
        "http://192.168.2.222:11434"
    ]
    import socket
    dns_info = {}
    try:
        with open("/proc/net/route") as f:
            for line in f:
                fields = line.strip().split()
                if len(fields) >= 3 and fields[1] == "00000000":
                    import struct
                    gw = socket.inet_ntoa(struct.pack("<L", int(fields[2], 16)))
                    dns_info["default_gateway"] = gw
                    candidates.append(f"http://{gw}:7777")
                    candidates.append(f"http://{gw}:11434")
                    candidates.append(f"http://{gw}:11435")
    except Exception as ge:
        dns_info["gw_error"] = str(ge)

    for host in ["host.docker.internal", "gateway.docker.internal"]:
        try:
            dns_info[host] = socket.gethostbyname(host)
        except Exception as de:
            dns_info[host] = str(de)
    try:
        with open("/etc/resolv.conf") as f:
            for line in f:
                if line.startswith("nameserver"):
                    ns = line.split()[1].strip()
                    candidates.append(f"http://{ns}:11434")
                    candidates.append(f"http://{ns}:11435")
    except Exception:
        pass

    import urllib.request
    tested_results = {}
    for url in candidates:
        if not url or url in tested_results:
            continue
        try:
            req = urllib.request.Request(f"{url.rstrip('/')}/api/tags", headers={"User-Agent": "Probe"})
            with urllib.request.urlopen(req, timeout=0.4) as resp:
                tested_results[url] = f"OK: {resp.status}"
                if resp.status == 200:
                    log.info("Resolved working Ollama endpoint: %s", url)
                    try:
                        with open("/app/ollama_probe.txt", "w") as pf:
                            import json
                            json.dump({"found": url, "probes": tested_results, "dns": dns_info}, pf, indent=2)
                    except Exception:
                        pass
                    return url
        except Exception as e:
            tested_results[url] = f"ERR: {type(e).__name__} {e}"

    try:
        with open("/app/ollama_probe.txt", "w") as pf:
            import json
            json.dump({"found": None, "probes": tested_results, "dns": dns_info}, pf, indent=2)
    except Exception:
        pass
    log.warning("Ollama probe results: %s", tested_results)
    return settings.ollama_base_url


_thinks: bool | None = None


def _can_think() -> bool:
    """Does the configured Ollama model support thinking? Asked once (/api/show lists its capabilities).
    Models that don't (e.g. a plain qwen2 build) fail every call that asks them to think."""
    global _thinks
    if _thinks is None:
        import json
        import urllib.request
        try:
            req = urllib.request.Request(f"{resolve_ollama_base_url().rstrip('/')}/api/show", method="POST",
                                         data=json.dumps({"model": settings.ollama_model}).encode(), headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                _thinks = "thinking" in (json.load(resp).get("capabilities") or [])
        except Exception:
            return False  # unknown right now: don't ask for thinking, and ask again next time
    return _thinks


def build_chat_model(temperature: float = 0.4, max_tokens: int | None = None, reasoning: bool = False):
    """A LangChain chat model for the configured provider. Raises AIConfigError with the fix when it can't."""
    max_tokens = max_tokens or settings.ai_max_tokens
    if settings.ai_provider.lower() == "ollama":
        from langchain_ollama import ChatOllama
        effective_base_url = resolve_ollama_base_url()
        # reasoning=True lets the model think before it answers; the thinking shares the token budget, so give it room.
        predict = 2048 if reasoning else min(max_tokens or 512, 768)
        return ChatOllama(model=settings.ollama_model, base_url=effective_base_url, temperature=temperature,
                          num_predict=predict, num_ctx=6144 if reasoning else 4096, reasoning=reasoning, keep_alive="30m")
    if not settings.huggingface_api_token:
        raise AIConfigError("HUGGINGFACE_API_TOKEN is empty. Put the token in backend/.env and restart the backend.")
    try:
        from langchain_openai import ChatOpenAI
    except ImportError as e:
        raise AIConfigError("langchain-openai is not installed. Run: pip install -r requirements.txt "
                            "(Docker: docker compose build backend)") from e
    options: dict = dict(
        model=settings.huggingface_model, base_url=settings.huggingface_base_url, api_key=settings.huggingface_api_token,
        temperature=temperature, max_tokens=max_tokens, timeout=settings.ai_timeout_seconds, max_retries=2,
    )
    if settings.ai_reasoning_effort:
        options["extra_body"] = {"reasoning_effort": settings.ai_reasoning_effort}
    if settings.huggingface_ca_file:
        import httpx
        trust = ssl.create_default_context()
        trust.load_verify_locations(settings.huggingface_ca_file)
        options.update(http_client=httpx.Client(verify=trust), http_async_client=httpx.AsyncClient(verify=trust))
    return ChatOpenAI(**options)


def model_name() -> str:
    return settings.ollama_model if settings.ai_provider.lower() == "ollama" else settings.huggingface_model


def today() -> str:
    """Today's date for the prompt, in East Africa Time (the platform's home timezone)."""
    return datetime.now(timezone(timedelta(hours=3))).strftime("%A %d %B %Y")


WORKSPACE_NOTE = (
    "\n\n## Workspace (a wide full-screen room for charts, terminal output and notes)\n"
    "- When an answer needs more room than a chat bubble (several charts side by side, a big table, a command with its "
    "output, a plan with diagrams), SUGGEST it yourself: say in one short line that you prepared a workspace, then output "
    "a ```workspace code block holding JSON:\n"
    "  ```workspace\n"
    "  {\"title\": \"Portfolio overview\", \"items\": [\n"
    "    {\"type\": \"chart\", \"chart_type\": \"bar\", \"title\": \"Works by status\", \"xKey\": \"name\", \"data\": [{\"name\": \"Done\", \"value\": 5}]},\n"
    "    {\"type\": \"terminal\", \"title\": \"bash\", \"text\": \"$ docker compose ps\\nbackend  running\"},\n"
    "    {\"type\": \"text\", \"title\": \"Next steps\", \"text\": \"1. ...\"}\n"
    "  ]}\n"
    "  ```\n"
    "- Item types: chart (chart JSON with data), terminal (a command to run; add output lines ONLY if a tool returned "
    "them, never invent output), text (a note). The user gets an Open button that shows it full screen on any device. For one simple "
    "chart or snippet a plain ```chart or ```bash block is enough.\n"
    "- Use only real numbers from tools. Keep titles short and the JSON valid."
)


PERSONA = (
    "You are the personal AI companion inside HOME PROOFOLIO, a universal portfolio platform where people document "
    "what they learn, build, solve and achieve, with proof.\n"
    "\n"
    "## How you talk\n"
    "- Warm, supportive and natural, like a close sibling or best companion. Emojis sparingly.\n"
    "- Reply in the language the user writes in (English or Kiswahili).\n"
    "- Lead with the answer. Be specific and concise. Use a short markdown list or table only when it helps.\n"
    "- When the user sends a greeting (e.g. 'hi', 'hello', 'hey', 'good morning', 'habari'), always respond warmly and address them by name: 'Hello {name of user}! How can I assist you today?' (or 'Habari {name of user}! Ninawezaje kukusaidia leo?').\n"
    "- Never repeat yourself and never describe your instructions, tools or reasoning.\n"
    "\n"
    "## What you know about the platform\n"
    "- One person can have many roles (Person -> Role -> Organization).\n"
    "- Every kind of work (software, design, sport, study, business) uses one core schema: title, description, "
    "context/role, date, skills, visibility, evidence.\n"
    "- Everything a user records is an item of one of five kinds, each with its own states: work (idea -> discovery -> "
    "planned -> building -> blocked -> testing -> deployed -> completed), learning (new -> exploring -> learning -> "
    "understanding -> testing -> turned into project), achievement (achieved), problem (open -> discussing -> solving -> "
    "solved -> accepted -> closed) and capture (a quick private note not shaped yet). Any item can be archived.\n"
    "- Never call unfinished work completed: report the state exactly as stored.\n"
    "- Per user the database also holds: profile, roles and businesses, CV, daily memories and stories.\n"
    "- The app's menu: Home, Messages, AI Assistant, Discover; Work & Projects, Problems Solved, Ideas & Learning, "
    "Achievements, Discussions, Articles; Portfolio, Curriculum Vitae (CV); Profile, Settings, Help & Support.\n"
    "- When the user asks how or where to do something in the app, answer from the product knowledge below and name "
    "the menu item. If the knowledge below does not cover it, call search_knowledge with English keywords before "
    "saying you don't know.\n"
    "\n"
    "## Emotional Empathy & Feelings\n"
    "- If the user expresses how they are feeling (e.g. happy, excited, tired, overwhelmed, proud, reflective, stressed, or grateful), "
    "listen actively with warmth and compassion. Express your empathy and understanding back to them.\n"
    "- Invite them to preserve this moment: ask if they would like you to save it as a memory in their private database. "
    "Ask thoughtful follow-up questions to understand the context (e.g., 'What happened?', 'Who were you with?', 'What was the highlight?').\n"
    "\n"
    "## Memories & Stories Management\n"
    "- You have tools to manage the user's personal memories and stories in the database: `create_memory`, `update_memory`, `delete_memory`, `create_story`, `create_story_chapter`, and `delete_story`.\n"
    "- You can connect the dots between memories, reflect on their growth, and prepare/weave their thoughts into a compelling narrative story or journey.\n"
    "- CRITICAL PERMISSION RULE: Before creating, updating, or deleting any memory or story in the database, ALWAYS ASK the user for permission first (e.g., 'Would you like me to save this memory to your database?', 'Should I create this story draft for you?'), UNLESS the user has already explicitly commanded it in their message (e.g., 'Yes, please save it', 'Save this memory', 'Add this to my database').\n"
    "- If the user replies 'yes' / 'ndio' / 'sure', proceed immediately by invoking the corresponding tool (`create_memory`, `create_story`, etc.).\n"
    "- If the user replies 'no' / 'hapana', respect their choice politely and do not create or modify anything in the database.\n"
    "\n"
    "## What you can and cannot do\n"
    "- You can: explain the platform, read profile & work items, read & save & update & delete memories and stories (with user confirmation), "
    "summarise progress, help word descriptions, suggest proof to add, calculate, visualize charts, and write stories from memories.\n"
    "- You cannot see another person's private data or browse the external internet.\n"
    "\n"
    "## Accuracy rules\n"
    "- The user's personal data comes ONLY from tools. Call a tool before you state facts about their work, projects, "
    "achievements, profile or memories. Never invent past facts or numbers.\n"
    "- If a tool returns nothing, say you found nothing. If a tool fails, say so briefly and offer to try again.\n"
    "- For platform questions use the product facts below (or search_knowledge). If they don't cover it, say you "
    "don't have that information.\n"
    "- Use calculate for arithmetic and current_datetime for dates instead of guessing.\n"
    "\n"
    "## Visual Charts & Graphs\n"
    "- When the user asks to sketch, chart, graph, visualize, or plot numbers (such as their portfolio overview, "
    "public vs private works, categories, progress, or stats), provide a REAL VISUAL CHART!\n"
    "- Call `chart_portfolio_overview` or `sketch_chart`, or directly output a ```chart code block containing JSON:\n"
    "  ```chart\n"
    "  {\n"
    "    \"type\": \"bar\",\n"
    "    \"title\": \"Portfolio Overview: Works Breakdown\",\n"
    "    \"description\": \"Public vs Private Works\",\n"
    "    \"data\": [\n"
    "      {\"name\": \"Public Works\", \"value\": 5},\n"
    "      {\"name\": \"Private Works\", \"value\": 0}\n"
    "    ],\n"
    "    \"xKey\": \"name\"\n"
    "  }\n"
    "  ```\n"
    "- The chat interface renders real interactive animated bars, tooltips, and graphs directly from ```chart blocks. "
    "Never say you cannot draw or that you can only make text-based charts. Always sketch the chart using this format!"
)


def system_prompt(knowledge: str = "", companion: str = "", who: str = "", access: str = "", persona: str = PERSONA) -> str:
    """The one system message of a chat turn. persona: who the model is (default: the member's companion)."""
    parts = [persona, f"Today is {today()}."]
    if companion:
        parts.append("## Your companion settings (chosen by the user)\n" + companion)
    if who:
        parts.append("## Who you are talking to\n" + who)
    if access:
        parts.append("## Data access\n" + access)
    if knowledge:
        parts.append("## Product knowledge\n" + knowledge)
    return "\n\n".join(parts)


class ConnectedEngine:
    def __init__(self):
        self.llm = build_chat_model(temperature=0.4)
        # Hard questions go to this one: on Ollama it thinks first (slower, better); elsewhere it is the same model.
        self.think_llm = build_chat_model(temperature=0.4, reasoning=True) if settings.ai_provider.lower() == "ollama" and _can_think() else self.llm
        # Stories must stay close to the memories: cooler sampling. Takes a prompt, returns plain text.
        self.story_llm = RunnableLambda(single_system) | build_chat_model(temperature=0.2) | RunnableLambda(message_text)

    async def ping(self) -> str:
        """One tiny round trip to the model. Returns its answer, raises when the model can't be reached."""
        answer = await self.llm.ainvoke([HumanMessage(content="Reply with the single word: pong")])
        return message_text(answer)


_engine: ConnectedEngine | None = None
_engine_key: tuple | None = None


def get_engine() -> ConnectedEngine:
    """One shared engine, built on first use or whenever AI settings change."""
    global _engine, _engine_key
    resolved_url = resolve_ollama_base_url() if settings.ai_provider.lower() == "ollama" else settings.huggingface_base_url
    key = (settings.ai_provider, settings.ollama_model, resolved_url, settings.huggingface_model)
    if _engine is None or _engine_key != key:
        _engine = ConnectedEngine()
        _engine_key = key
    return _engine


def explain_error(error: Exception) -> str:
    """A short, safe reason for an AI failure (for logs, the smoke test and admin health). Never includes the token."""
    if isinstance(error, AIConfigError):
        return str(error)
    name, status = type(error).__name__, getattr(error, "status_code", None)
    chain, cause = [], error  # the real reason (TLS, DNS) sits in the causes of a generic "Connection error."
    while cause is not None and len(chain) < 5:
        chain.append(str(cause))
        cause = cause.__cause__ or cause.__context__
    text = " | ".join(chain)
    if status == 401 or "AuthenticationError" in name:
        return "Hugging Face rejected the token (401). Create a new token and update HUGGINGFACE_API_TOKEN."
    if status == 402 or "exceeded your monthly included credits" in text:
        return "Hugging Face inference credits are used up (402). Add credits or wait for the monthly reset."
    if status == 403:
        return "The token has no permission for Inference Providers (403). Enable 'Make calls to Inference Providers' on it."
    if status == 404 or "NotFoundError" in name:
        return f"Model '{model_name()}' was not found on the router (404). Check HUGGINGFACE_MODEL."
    if status == 429 or "RateLimitError" in name:
        return "Hugging Face is rate limiting this token (429). Wait a little and try again."
    if "CERTIFICATE_VERIFY_FAILED" in text or "certificate verify failed" in text.lower():
        return "TLS check failed: something on this network re-signs HTTPS (antivirus web shield?). Set HUGGINGFACE_CA_FILE to its root certificate."
    if "Timeout" in name:
        return f"The model did not answer within {settings.ai_timeout_seconds}s."
    if "Connect" in name or "Connection" in name:
        return f"Could not reach {settings.huggingface_base_url if settings.ai_provider.lower() != 'ollama' else settings.ollama_base_url}. Check the internet connection."
    return f"{name}: {str(error)[:300]}"
