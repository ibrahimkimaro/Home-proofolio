import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.companion import companion_prompt, load_companion
from app.ai.db_context import user_work_context
from app.ai.engine import ConnectedEngine
from app.ai.story import NoMemories, generate_story
from app.ai.tools import search_memories
from app.models.memory import StoryChapter

GATE = "projects"  # access_permissions entry for the user's work data
MEMORY_GATE = "memories"  # entry for the user's daily memories and stories
_ASK = "Do you allow me to keep this access?"
CONSENT_PROMPT = (
    "I can read your HOME PROOFOLIO data (your own work items, projects and memories) to answer that. "
    "It is **read-only**: I can't change your data, and I only see your own account. "
    f"{_ASK} Reply **yes** / **ndio** to allow, or **no** / **hapana** to decline. You can revoke it any time."
)
STORY_Q = re.compile(r"\b(create|write|make|generate|build|tell)\b.{0,40}\b(story|journey)\b|tengeneza hadithi|andika hadithi", re.I)
MEMORY_Q = re.compile(r"\b(what happened|remember|my memor(y|ies)|when i (started|began|first)|kumbukumbu|nini kilitokea)\b", re.I)
DATA_Q = re.compile(
    r"\b(my (work|projects?|data|items?|portfolio|achievements?|learning|progress|ideas)|database|db|"
    r"kazi zangu|data yangu|miradi yangu|latest work|recent work)\b", re.I)
YES = re.compile(r"^\s*(yes|y|yeah|yep|ok|okay|sure|allow|ndio|ndiyo|sawa|naruhusu)\b", re.I)
NO = re.compile(r"^\s*(no|n|nope|hapana|sitaki|don'?t)\b", re.I)


def _needed_gate(message: str) -> str | None:
    if STORY_Q.search(message) or MEMORY_Q.search(message):
        return MEMORY_GATE
    return GATE if DATA_Q.search(message) else None


def _memory_context(rows) -> str:
    if not rows:
        return "No memories match this question. Say you found none; do not guess or invent any."
    return "The user's own matching memories, oldest first (the ONLY source for what happened):\n" + "\n".join(
        f"- {m.occurred_on.isoformat()} · {m.title or ''} — {m.content} (feeling: {m.mood}; with: {', '.join(m.people)})" for m in rows)


async def reply(engine: ConnectedEngine, db: AsyncSession, user_id, who: str, message: str, history: list[str]) -> str:
    """One chat turn. The user's data is only read after they said yes to the consent question."""
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
            message = re.sub(r"^User:\s*", "", earlier) or "Give me an overview of my work."
            history = history[:-2]  # drop the consent exchange so the model can't echo it
            need = _needed_gate(message) or GATE
        elif asked and NO.match(message):
            return "No problem, I won't access your data. Ask me about your work or memories any time if you change your mind."
        else:
            return CONSENT_PROMPT

    companion = companion_prompt(c)
    if need == MEMORY_GATE and STORY_Q.search(message):
        try:
            story = await generate_story(engine, db, user_id, message, companion)
        except NoMemories:
            return "I couldn't find memories about that yet, and I won't invent any. Add a few memories about it and ask me again."
        chapters = list(await db.scalars(select(StoryChapter).where(StoryChapter.story_id == story.id).order_by(StoryChapter.position)))
        return (f"I wrote your story **{story.title}** from {sum(len(ch.memory_ids) for ch in chapters)} of your memories. "
                "It is saved as a private draft in Stories, where you can edit, reorder, regenerate or delete every chapter.\n\n"
                + "\n".join(f"{i}. {ch.title}" for i, ch in enumerate(chapters, 1)))
    if need == MEMORY_GATE:
        data = _memory_context(await search_memories(db, user_id, message, limit=8))
    elif need == GATE or GATE in c.access_permissions:
        data = await user_work_context(db, user_id)
    else:
        data = "(access not granted)"
    return await engine.execute_query(message, "\n".join(history[-6:]), who=who, companion=companion, db_context=data)
