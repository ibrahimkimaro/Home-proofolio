import logging
import re

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.agent import AgentResult, earlier_turns, history_messages, run_agent
from app.ai.companion import companion_prompt, load_companion
from app.ai.db_context import user_profile_context, user_full_database_summary, user_work_context
from app.ai.engine import PERSONA, WORKSPACE_NOTE, ConnectedEngine, clean_ai_response_text, explain_error, system_prompt
from app.ai.knowledge import relevant_knowledge
from app.ai.mcp_client import general_tools
from app.ai.security_guard import sanitize_user_prompt
from app.ai.story import NoMemories, generate_story
from app.ai.tools import user_tools
from app.ai.usage_monitor import check_user_quota, record_ai_usage
from app.core.config import settings
from app.models.memory import StoryChapter

log = logging.getLogger("app.ai.chat")

GATE = "projects"  # access_permissions entry for the user's work data
MEMORY_GATE = "memories"  # entry for the user's daily memories and stories
_ASK = "Do you allow me to keep this access?"
CONSENT_PROMPT = (
    "I can access your HOME PROOFOLIO data (your own work items, projects and memories) to assist you, "
    "and help you record memories and draft stories with your permission. "
    f"{_ASK} Reply **yes** / **ndio** to allow, or **no** / **hapana** to decline. You can revoke it any time."
)
STORY_Q = re.compile(r"\b(create|write|make|generate|build|tell)\b.{0,40}\b(story|journey)\b|tengeneza hadithi|andika hadithi", re.I)
FEELING_Q = re.compile(
    r"\b(i feel|i am feeling|i'm feeling|feeling|tired|exhausted|happy|sad|stressed|excited|overwhelmed|anxious|proud|grateful|burned out|burnout|lonely|great|terrible|bad day|good day|nahisi|nimechoka|nina furaha)\b",
    re.I
)
MEMORY_Q = re.compile(
    r"\b(what happened|remember|my memor(y|ies)|when i (started|began|first)|kumbukumbu|nini kilitokea|"
    r"save (a )?memory|add (a )?memory|write (a )?memory|record (a )?memory|update (a )?memory|delete (a )?memory|"
    r"hifadhi kumbukumbu|futa kumbukumbu)\b",
    re.I
)
PROFILE_Q = re.compile(
    r"\b(profile|who am i|about me|my details|my account|my email|my phone|my name|my bio|my roles?|wasifu|taarifa zangu)\b", re.I)
DATA_Q = re.compile(
    r"\b(my (work|projects?|data|items?|portfolio|achievements?|learning|progress|ideas|profile|details|account|email|phone|bio|roles?)|"
    r"who am i|about me|my information|my info|my contact|database|db|"
    r"wasifu wangu|kazi zangu|data yangu|miradi yangu|taarifa zangu|latest work|recent work)\b", re.I)
CHART_Q = re.compile(r"\b(chart|charts|sketch|graph|graphs|plot|bars?|visualiz|diagram)\b", re.I)
MESSAGE_Q = re.compile(r"\b(messages?|chats?|inbox|conversations?|dms?|ujumbe|jumbe)\b", re.I)
YES = re.compile(r"^\s*(yes|y|yeah|yep|ok|okay|sure|allow|ndio|ndiyo|sawa|naruhusu)\b", re.I)
NO = re.compile(r"^\s*(no|n|nope|hapana|sitaki|don'?t)\b", re.I)
GREETING_Q = re.compile(
    r"^\s*(hi|hello|hey|heya|howdy|habari|mambo|jambo|shikamoo|salama|sup|yo|hola|bonjour|greetings|good\s+(morning|afternoon|evening|day))\b",
    re.I
)
SWAHILI_GREETING_Q = re.compile(r"\b(habari|mambo|jambo|shikamoo|salama|hujambo|hamjambo)\b", re.I)


async def get_user_display_name(db: AsyncSession, user_id, who: str = "") -> str:
    """Resolve the user's preferred greeting name (profile display name, fullname, or username)."""
    if user_id:
        try:
            from app.models.user import User
            from app.models.profile import Profile
            user = await db.get(User, user_id)
            if user:
                profile = await db.scalar(select(Profile).where(Profile.user_id == user_id))
                if profile and profile.display_name and profile.display_name.strip():
                    return profile.display_name.strip()
                if user.fullname and user.fullname.strip():
                    return user.fullname.strip()
                if user.username and user.username.strip():
                    return user.username.strip()
        except Exception as e:
            log.warning("Could not resolve user display name: %s", e)

    if who:
        m = re.search(r"talking to ([^(@\.\n]+)", who)
        if m and m.group(1).strip():
            return m.group(1).strip()

    return "there"


GREETING_WORDS = r"(hi|hello|hey|heya|howdy|habari|mambo|jambo|shikamoo|salama|hujambo|hamjambo|sup|yo|hola|bonjour|greetings|good\s+(morning|afternoon|evening|day))"
PURE_GREETING_PATTERN = re.compile(
    r"^\s*("
    + GREETING_WORDS + r"(\s+(there|all|everyone|companion|kimmy|bot|ai|assistant|friend|yako|za\s+asubuhi|za\s+mchana|za\s+jioni|vipi))?"
    r"|how\s+are\s+you(\s+doing)?"
    r"|how\'?s\s+it\s+going"
    r"|how\s+is\s+it\s+going"
    r"|" + GREETING_WORDS + r"[,.]?\s+(how\s+are\s+you(\s+doing)?|how\'?s\s+it\s+going|how\s+is\s+it\s+going|habari\s+yako)"
    r")[\s!.,?:;~😊👋❤️]*$",
    re.I
)


def is_pure_greeting(message: str) -> bool:
    clean = message.strip()
    if not clean:
        return False
    if PURE_GREETING_PATTERN.match(clean):
        return True
    if DATA_Q.search(clean) or PROFILE_Q.search(clean) or STORY_Q.search(clean) or MEMORY_Q.search(clean) or CHART_Q.search(clean) or MESSAGE_Q.search(clean):
        return False
    if re.search(r"\b(calc|calculate|math|work|project|code|token|db|database|file|download|pdf|report|export|table|why|how (do|does|can|to)|what('s| is)|who (is|are)|explain|reason)\b", clean, re.I):
        return False
    return len(clean.split()) <= 4 and bool(GREETING_Q.search(clean))



WORKSPACE_Q = re.compile(r"\b(workspace|terminal|command|dashboard|full ?screen|side by side|pdf|report|several charts)\b", re.I)
REASON_Q = re.compile(
    r"\b(why|how (do|does|can|should|would|come)|explain|compare|difference|analy[sz]e|plan|strategy|decide|should i|"
    r"pros and cons|step[- ]by[- ]step|solve|debug|fix|prove|derive|reason|improve|review|recommend|advice|"
    r"kwa nini|eleza|linganisha|nishauri|panga|suluhisha)\b", re.I)


def needs_reasoning(message: str) -> bool:
    """Hard questions get the model that thinks first; greetings, lookups and small talk get the fast one."""
    return len(message) > 280 or message.count("?") > 1 or bool(REASON_Q.search(message))


def _needed_gate(message: str) -> str | None:
    if STORY_Q.search(message) or MEMORY_Q.search(message) or FEELING_Q.search(message):
        return MEMORY_GATE
    return GATE if (DATA_Q.search(message) or PROFILE_Q.search(message) or MESSAGE_Q.search(message)) else None


class StoryArgs(BaseModel):
    topic: str = Field(description="What the story is about, in the user's own words, e.g. 'my first year learning to code'.")


class NoArgs(BaseModel):
    pass


async def _story_reply(engine: ConnectedEngine, db: AsyncSession, user_id, topic: str, companion: str) -> str:
    """Write a story from the user's memories and say what was saved. Never invents: no memories, no story."""
    try:
        story = await generate_story(engine, db, user_id, topic, companion)
    except NoMemories:
        return "I couldn't find memories about that yet, and I won't invent any. Add a few memories about it and ask me again."
    except Exception:
        await db.rollback()  # drop the half-written draft
        raise
    chapters = list(await db.scalars(select(StoryChapter).where(StoryChapter.story_id == story.id).order_by(StoryChapter.position)))
    return (f"I wrote your story **{story.title}** from {sum(len(ch.memory_ids) for ch in chapters)} of your memories. "
            "It is saved as a private draft in Stories, where you can edit, reorder, regenerate or delete every chapter.\n\n"
            + "\n".join(f"{i}. {ch.title}" for i, ch in enumerate(chapters, 1)))


def _story_tool(engine: ConnectedEngine, db: AsyncSession, user_id, companion: str) -> StructuredTool:
    async def write_story_from_memories(topic: str) -> str:
        return await _story_reply(engine, db, user_id, topic, companion)
    return StructuredTool.from_function(
        coroutine=write_story_from_memories, name="write_story_from_memories", args_schema=StoryArgs, return_direct=True,
        description="Turn the user's own memories about a topic into a story and save it as a private draft. "
                    "Use it when they ask for a story or a written journey. Takes a while; do not call it for simple questions.")


def _consent_tool() -> StructuredTool:
    async def request_data_access() -> str:
        return CONSENT_PROMPT
    return StructuredTool.from_function(
        coroutine=request_data_access, name="request_data_access", args_schema=NoArgs, return_direct=True,
        description="Ask the user to allow read-only access to their own HOME PROOFOLIO data (profile, work, projects, "
                    "achievements, memories). Call it whenever the answer needs their personal data and you have no tool for it.")


def _access_note(permissions: set[str]) -> str:
    labels = {GATE: "profile and work items", MEMORY_GATE: "memories and stories"}
    allowed = [label for gate, label in labels.items() if gate in permissions]
    missing = [label for gate, label in labels.items() if gate not in permissions]
    if not missing:
        return "The user allowed read-only access to their profile, work items and memories. Read them with your tools; never guess."
    note = f"The user has NOT allowed access to their {' or '.join(missing)} yet"
    if allowed:
        note += f" (allowed so far: their {allowed[0]})"
    return note + ". If the answer needs that data, call request_data_access. Do not guess and do not ask in your own words."


async def answer(engine: ConnectedEngine, db: AsyncSession, user_id, who: str, message: str, history: list[str],
                 dev: bool = False, on_state=None) -> AgentResult:
    """One chat turn. The user's data is only read after they said yes to the consent question.

    history: earlier turns as "User: ..." / "AI: ..." lines, oldest first.
    dev=True (developer dashboard only) also gives the model the sandbox file tools and the extra MCP servers.
    """
    from app.ai.engine import load_ai_config_from_db, get_engine
    await load_ai_config_from_db(db)
    engine = get_engine()
    history = earlier_turns(history, message)

    c = await load_companion(db, user_id)
    asked = bool(history) and _ASK in history[-1]
    need = _needed_gate(message)
    if asked and need is None and not {GATE, MEMORY_GATE} <= set(c.access_permissions):
        # the reply to a consent question is "yes"/"no", which has no keywords of its own
        need = MEMORY_GATE if any(STORY_Q.search(h) or MEMORY_Q.search(h) for h in history[-2:]) else GATE
    if need and need not in c.access_permissions:
        if asked and YES.match(message):
            c.access_permissions = sorted({*c.access_permissions, GATE, MEMORY_GATE})
            db.add(c)
            await db.commit()
            earlier = history[-2] if len(history) > 1 else ""
            message = re.sub(r"^\s*user\s*:\s*", "", earlier, flags=re.I) or "Give me an overview of my work."
            history = history[:-2]  # drop the consent exchange so the model can't echo it
            need = _needed_gate(message) or GATE
        elif asked and NO.match(message):
            return AgentResult("No problem, I won't access your data. Ask me about your work or memories any time if you change your mind.")
        else:
            return AgentResult(CONSENT_PROMPT)

    companion = companion_prompt(c)
    if need == MEMORY_GATE and STORY_Q.search(message):
        if on_state:
            await on_state("composing")
        return AgentResult(await _story_reply(engine, db, user_id, message, companion), ["write_story_from_memories"])

    permissions = set(c.access_permissions)
    from app.ai.engine import get_active_ai_config, get_active_model_name
    active_cfg = get_active_ai_config()
    active_provider = (active_cfg.get("provider") or "gemini").lower()
    is_ollama = active_provider == "ollama"
    active_model = get_active_model_name()
    needs_tools = bool(
        need
        or DATA_Q.search(message)
        or PROFILE_Q.search(message)
        or STORY_Q.search(message)
        or MEMORY_Q.search(message)
        or FEELING_Q.search(message)
        or CHART_Q.search(message)
        or MESSAGE_Q.search(message)
        or re.search(r"\b(calc|calculate|math|project|work|database|chart|sketch|graph|plot|message|chat|memory|story|save|delete|pdf|download|report|export)\b|what('s| is) the (date|time)|today's date|current (date|time)", message, re.I)
    )

    tools = []
    if not is_ollama or needs_tools:
        tools = user_tools(db, user_id, permissions)
        if MEMORY_GATE in permissions:
            tools.append(_story_tool(engine, db, user_id, companion))
        if not is_ollama or dev or re.search(r"\b(calc|calculate|math|sum|date|time|today|chart|sketch|graph|plot)\b", message, re.I):
            gen_tools = await general_tools(dev=dev)
            existing_names = {t.name for t in tools}
            tools += [t for t in gen_tools if t.name not in existing_names]

    message = sanitize_user_prompt(message)
    k_val = 2 if is_ollama else 4
    max_k_chars = 1000 if is_ollama else 2200

    access_note = _access_note(permissions)
    if GATE in permissions and (PROFILE_Q.search(message) or DATA_Q.search(message) or CHART_Q.search(message) or MESSAGE_Q.search(message)):
        try:
            user_db_context = await user_profile_context(db, user_id)
            access_note += f"\n\n[USER DATABASE PROFILE RECORD - PASSWORDS EXCLUDED]:\n{user_db_context}\n"
        except Exception as e:
            log.warning("Could not pre-fetch user profile context: %s", e)

    # The workspace instructions are long and slow a small model down: only send them when the request is about that.
    persona = PERSONA if (not is_ollama or CHART_Q.search(message)) else PERSONA.split("## Visual Charts & Graphs")[0]  # the chart block is ~400 tokens
    persona += WORKSPACE_NOTE if WORKSPACE_Q.search(message) else ""
    system = system_prompt(knowledge=relevant_knowledge(message, k=k_val, max_chars=max_k_chars), companion=companion, who=who, access=access_note, persona=persona)
    deep = needs_reasoning(message)
    user_name = await get_user_display_name(db, user_id, who)
    if is_ollama and not needs_tools and not deep and len(message) <= 160:
        # Small talk on a local model: the full prompt is ~1,500 tokens and takes over a minute to read on a CPU. A short one answers in seconds.
        system = (f"You are {c.name or 'Kimmy'}, a warm, friendly AI companion inside HOME PROOFOLIO, a portfolio platform. "
                  f"You are speaking with {user_name}. "
                  f"{who} Reply warmly, conversationally, and naturally in the user's language (English or Kiswahili). "
                  "Never repeat rigid or robotic canned phrases. "
                  "If they ask about their own work, projects or memories, tell them to ask and you will look it up.")
    # Check if the user is authorized and within token allowance
    allowed, quota_err, _ = await check_user_quota(db, user_id)
    if not allowed:
        await record_ai_usage(
            db,
            user_id=user_id,
            feature="companion_chat",
            endpoint="/ai/chat",
            model=active_model,
            status="quota_exceeded",
            error_message=quota_err,
        )
        return AgentResult(quota_err or "AI access paused.")

    try:
        agent_res = await run_agent(engine.think_llm if deep else engine.llm, system, history_messages(history), message, tools,
                                   on_state=on_state, think_state="reasoning" if deep else "thinking")
        agent_res.text = clean_ai_response_text(agent_res.text)
        await record_ai_usage(
            db,
            user_id=user_id,
            feature="companion_chat",
            endpoint="/ai/chat",
            model=active_model,
            prompt_tokens=agent_res.prompt_tokens,
            completion_tokens=agent_res.completion_tokens,
            total_tokens=agent_res.total_tokens,
            latency_ms=int(agent_res.seconds * 1000),
            status="success",
        )
        return agent_res
    except Exception as exc:
        status_flag = "rate_limited" if "429" in str(exc) or "quota" in str(exc).lower() else "error"
        await record_ai_usage(
            db,
            user_id=user_id,
            feature="companion_chat",
            endpoint="/ai/chat",
            model=active_model,
            status=status_flag,
            error_message=str(exc)[:400],
        )
        log.warning("LLM agent call failed (%s); providing grounded workspace context", explain_error(exc))
        name = c.name or "Kimmy"
        low = message.lower()
        if GREETING_Q.search(message):
            if SWAHILI_GREETING_Q.search(message):
                return AgentResult(clean_ai_response_text(f"Habari {user_name}! Ninawezaje kukusaidia leo?"))
            return AgentResult(clean_ai_response_text(f"Hello {user_name}! Great to see you. How are things going today?"))
        if MESSAGE_Q.search(message) and GATE in permissions:
            try:
                from app.ai.db_context import user_messages_context
                msgs = await user_messages_context(db, user_id)
                return AgentResult(clean_ai_response_text(f"Habari! Here is your messages overview from the HOME PROOFOLIO database:\n\n{msgs}"))
            except Exception as me:
                log.warning("Could not fetch messages fallback: %s", me)
        if CHART_Q.search(message) and (DATA_Q.search(message) or "portfolio" in low or "work" in low or "detail" in low):
            try:
                from app.ai.tools import chart_portfolio_overview
                chart_block = await chart_portfolio_overview(db, user_id, breakdown="visibility", chart_type="bar", title="Portfolio Overview: Works Breakdown")
                return AgentResult(clean_ai_response_text(f"Here is your interactive portfolio overview chart based on your verified database records:\n\n{chart_block}\n\nYou can switch between bar chart, line chart, pie chart, or table view directly from the chart toolbar!"))
            except Exception as ce:
                log.warning("Fallback chart generation error: %s", ce)
        if PROFILE_Q.search(message) or any(w in low for w in ["profile", "who am i", "my details", "about me", "email", "phone", "wasifu"]):
            ctx = await user_profile_context(db, user_id)
            return AgentResult(clean_ai_response_text(f"Habari! Here is your verified profile information from your HOME PROOFOLIO database:\n\n{ctx}"))
        if DATA_Q.search(message) or any(w in low for w in ["work", "project", "proof", "item", "overview", "portfolio", "database", "db"]):
            ctx = await user_full_database_summary(db, user_id)
            return AgentResult(clean_ai_response_text(f"Habari! Here are your database records from HOME PROOFOLIO:\n\n{ctx}\n\nLet me know which item you would like to explore or expand!"))
        if "story" in low or "journey" in low or "hadithi" in low:
            try:
                story_res = await _story_reply(engine, db, user_id, message, companion)
                return AgentResult(clean_ai_response_text(story_res), ["write_story_from_memories"])
            except Exception:
                pass
        know = relevant_knowledge(message)
        if know:
            summary = "\n".join(line for line in know.split("\n") if line.strip() and not line.startswith("#"))[:450]
            return AgentResult(clean_ai_response_text(f"Hi! Regarding {message}:\n\n{summary}\n\nFeel free to ask me about your profile, work items, or stories anytime!"))
        return AgentResult(clean_ai_response_text(f"Hello {user_name}! I am {name}, your companion on HOME PROOFOLIO. I am connected to your private workspace. Ask me about your profile, work items, projects, or stories anytime! 😊"))



async def reply(engine: ConnectedEngine, db: AsyncSession, user_id, who: str, message: str, history: list[str], dev: bool = False) -> str:
    """One chat turn, as text. See answer()."""
    return (await answer(engine, db, user_id, who, message, history, dev)).text
