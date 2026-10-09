"""Turn the user's own memories into a story, chapter by chapter. Never touches the original memories."""
import math
import re
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_core.prompts import ChatPromptTemplate

from app.ai.engine import ConnectedEngine
from app.ai.tools import search_memories
from app.models.memory import Memory, Story, StoryChapter
from app.models.profile import Visibility
from app.models.work import WorkItem

MAX_CHAPTERS = 5  # each chapter is one model call; keep a request under a few minutes on a local model
MEMORIES_PER_CHAPTER = 3
MAX_MEMORIES = 25

STORY_PERSONA = """You are the user's personal story companion.

Your responsibility is to help the user understand, organize,
and present their real experiences and journey.

Use the user's stored memories, projects, achievements,
learning records, and other authorized information as your
source of truth.

Never invent events, people, dates, achievements, experiences,
feelings, or facts that are not supported by the available data.

When information is missing or ambiguous, ask the user instead
of guessing.

Preserve the user's original meaning.

You may improve structure, grammar, storytelling, and readability,
but do not change the factual meaning of the user's memories.

When creating stories, organize relevant memories chronologically
and connect meaningful events naturally.

The user owns their story and must always be able to edit,
remove, reorder, or regenerate generated content."""

CHAPTER_TASK = """Write chapter {n} of {total} of the story: "{topic}".

Use ONLY the memories below. Each shows its date, the feeling the user recorded and the people who were there.
Let the recorded feeling set the tone; do not add feelings, people, places, dates or events that are not listed.
Write in the first person, in the user's voice, in the language the memories are written in.
Stay close to the memories' own wording. Do NOT describe weather, rooms, time of day, objects, thoughts, scenes
or anything else that is not written in the memories. Use at most {max_words} words.
If something important is unclear, end with one short question for the user instead of guessing.

Reply in exactly this format:
TITLE: <a short chapter title>
<one to three paragraphs>

Memories:
{memories}"""

STORY_HEAD_TASK = """The story "{topic}" has these chapters: {titles}.
Reply in exactly this format and nothing else:
TITLE: <a short story title>
DESCRIPTION: <one sentence that only uses the chapter titles>"""


class NoMemories(Exception):
    pass


def _line(i: int, m: Memory, project: str | None, achievement: str | None) -> str:
    extra = [f"feeling: {m.mood}", f"with: {', '.join(m.people)}"]
    if m.location:
        extra.append(f"at: {m.location}")
    if project:
        extra.append(f"project: {project}")
    if achievement:
        extra.append(f"achievement: {achievement}")
    if m.attributes:
        extra += [f"{k}: {v}" for k, v in list(m.attributes.items())[:6]]
    return f"[{i}] {m.occurred_on.isoformat()} · {m.title or ''} — {m.content}  ({'; '.join(extra)})"


def _split(items: list, n: int) -> list[list]:
    size = math.ceil(len(items) / n)
    return [items[i:i + size] for i in range(0, len(items), size)]


def _parse(text: str, fallback_title: str) -> tuple[str, str]:
    m = re.search(r"^[\s*#>\-]*TITLE\s*:\s*(.+?)\**\s*$", text, re.M | re.I)  # tolerate "**TITLE: x**"
    body = (text[:m.start()] + text[m.end():]).strip() if m else text.strip()
    return (m.group(1).strip().strip('"*# ')[:200] if m else fallback_title), body


async def _titles(db: AsyncSession, user_id, ids: set) -> dict:
    if not ids:
        return {}
    rows = await db.execute(select(WorkItem.id, WorkItem.title).where(WorkItem.user_id == user_id, WorkItem.id.in_(ids)))
    return {i: t for i, t in rows.all()}


async def _write(engine: ConnectedEngine, companion: str, task: str) -> str:
    chain = ChatPromptTemplate.from_messages([("system", STORY_PERSONA), ("system", "{companion}"), ("user", "{task}")]) | engine.story_llm
    return await chain.ainvoke({"companion": companion, "task": task})


async def write_chapter(engine, db, user_id, companion: str, topic: str, n: int, total: int, memories: list[Memory]) -> tuple[str, str]:
    titles = await _titles(db, user_id, {x for m in memories for x in (m.project_id, m.achievement_id) if x})
    lines = "\n".join(_line(i + 1, m, titles.get(m.project_id), titles.get(m.achievement_id)) for i, m in enumerate(memories))
    max_words = max(60, 2 * sum(len(m.content.split()) for m in memories))
    raw = await _write(engine, companion, CHAPTER_TASK.format(n=n, total=total, topic=topic, memories=lines, max_words=max_words))
    return _parse(raw, f"Chapter {n}")


async def generate_story(engine: ConnectedEngine, db: AsyncSession, user_id, topic: str, companion: str = "") -> Story:
    """Search the user's memories for the topic, split them chronologically into chapters, write each one."""
    memories = await search_memories(db, user_id, topic, limit=MAX_MEMORIES)
    if not memories:
        raise NoMemories(topic)
    groups = _split(memories, min(MAX_CHAPTERS, math.ceil(len(memories) / MEMORIES_PER_CHAPTER)))
    story = Story(user_id=user_id, title=topic[:200], visibility=Visibility.PRIVATE, status="draft")
    db.add(story)
    await db.flush()
    chapters = []
    for n, group in enumerate(groups, 1):
        title, body = await write_chapter(engine, db, user_id, companion, topic, n, len(groups), group)
        chapters.append(StoryChapter(
            story_id=story.id, position=n - 1, title=title, content=body, ai_generated=True, visibility=Visibility.PRIVATE,
            memory_ids=[str(m.id) for m in group],
            project_ids=sorted({str(m.project_id) for m in group if m.project_id}),
            achievement_ids=sorted({str(m.achievement_id) for m in group if m.achievement_id}),
            media=sorted({x for m in group for x in m.media})[:6],
        ))
    db.add_all(chapters)
    head = await _write(engine, companion, STORY_HEAD_TASK.format(topic=topic, titles="; ".join(c.title for c in chapters)))
    story.title, story.description = _parse(head, topic)[0], (re.search(r"DESCRIPTION:\s*(.+)", head, re.I) or [None, None])[1]
    await db.commit()
    await db.refresh(story)  # updated_at is set by the database
    return story


async def regenerate_chapter(engine, db, user_id, story: Story, chapter: StoryChapter, companion: str = "") -> StoryChapter:
    """Rewrites one chapter from the memories it is linked to (only ones the user owns). Keeps its position."""
    ids = [uuid.UUID(i) for i in chapter.memory_ids]
    memories = sorted(await db.scalars(select(Memory).where(Memory.user_id == user_id, Memory.id.in_(ids))), key=lambda m: (m.occurred_on, m.created_at))
    if not memories:
        raise NoMemories(chapter.title)
    count = len((await db.scalars(select(StoryChapter.id).where(StoryChapter.story_id == story.id))).all())
    chapter.title, chapter.content = await write_chapter(engine, db, user_id, companion, story.title, chapter.position + 1, count, memories)
    chapter.ai_generated = True
    await db.commit()
    return chapter
