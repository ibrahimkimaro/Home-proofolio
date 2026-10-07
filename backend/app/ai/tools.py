"""Tools the AI companion may use. Every tool takes the user id from the SERVER (the authenticated session),
never from the model's arguments, and only returns that user's own rows. Read tools are read-only;
create_* write only story drafts. Later tools (generate_pdf, generate_chart, ...) can be added to TOOLS.
Today the app calls these directly (retrieval -> prompt); TOOLS also gives the JSON schemas a tool-calling model needs."""
import re
import uuid
from datetime import date

from sqlalchemy import Text, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.memory import Memory, Story, StoryChapter
from app.models.profile import Profile, Visibility
from app.models.work import WorkItem

STOP = set("the and for are you your what who how why can does with this that from have not but about into any all our out when was were did my me i a an of to in on is it story create write make tell happened".split())
SEARCH_POOL = 60  # rows pulled by SQL before keyword ranking


def memory_dict(m: Memory, full: bool = True) -> dict:
    d = {
        "id": str(m.id), "title": m.title, "occurred_on": m.occurred_on.isoformat(),
        "occurred_time": m.occurred_time.isoformat() if m.occurred_time else None,
        "category": m.category, "mood": m.mood, "people": m.people, "location": m.location,
        "project_id": str(m.project_id) if m.project_id else None,
        "achievement_id": str(m.achievement_id) if m.achievement_id else None,
        "skills": m.skills, "media": m.media, "tags": m.tags, "attributes": m.attributes,
        "visibility": m.visibility.value, "importance": m.importance,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }
    d["content"] = m.content if full else m.content[:200]
    return d


def keywords(text: str) -> list[str]:
    return sorted({w for w in re.findall(r"[a-z0-9]{3,}", text.lower()) if w not in STOP})


async def search_memories(db: AsyncSession, user_id, query: str, limit: int = 10) -> list[Memory]:
    """The user's own memories matching the query's keywords, best matches first picked, returned oldest to newest."""
    words = keywords(query)
    if not words:
        return []
    haystack = lambda c: func.lower(cast(c, Text))
    cols = (Memory.title, Memory.content, Memory.mood, Memory.location, Memory.people, Memory.tags, Memory.skills)
    rows = (await db.scalars(
        select(Memory).where(Memory.user_id == user_id, or_(*[haystack(c).contains(w) for w in words for c in cols]))
        .order_by(Memory.importance.desc(), Memory.occurred_on.desc()).limit(SEARCH_POOL)
    )).all()
    def score(m: Memory) -> int:
        text = " ".join(str(x) for x in (m.title, m.content, m.mood, m.location, m.people, m.tags, m.skills)).lower()
        return sum(w in text for w in words)
    best = sorted(rows, key=score, reverse=True)[:limit]
    return sorted(best, key=lambda m: (m.occurred_on, m.created_at))


# ---- the tools -------------------------------------------------------------------------------

async def get_my_profile(db, user_id) -> dict:
    p = await db.scalar(select(Profile).where(Profile.user_id == user_id))
    return {} if not p else {"username": p.username, "display_name": p.display_name, "headline": p.headline, "bio": p.bio}


async def get_daily_memories(db, user_id, limit: int = 20, since: str | None = None) -> list[dict]:
    q = select(Memory).where(Memory.user_id == user_id)
    if since:
        q = q.where(Memory.occurred_on >= date.fromisoformat(since))
    rows = await db.scalars(q.order_by(Memory.occurred_on.desc(), Memory.created_at.desc()).limit(min(limit, 50)))
    return [memory_dict(m, full=False) for m in rows]


async def tool_search_memories(db, user_id, query: str, limit: int = 10) -> list[dict]:
    return [memory_dict(m) for m in await search_memories(db, user_id, query, min(limit, 20))]


async def get_memory(db, user_id, memory_id: str) -> dict | None:
    m = await db.scalar(select(Memory).where(Memory.id == uuid.UUID(memory_id), Memory.user_id == user_id))
    return memory_dict(m) if m else None


async def _work(db, user_id, work_type: str, limit: int) -> list[dict]:
    rows = await db.scalars(
        select(WorkItem).where(WorkItem.user_id == user_id, WorkItem.work_type == work_type)
        .order_by(WorkItem.created_at.desc()).limit(min(limit, 30))
    )
    return [{"id": str(w.id), "title": w.title, "status": w.status, "description": (w.description or "")[:300],
             "skills": w.skills, "date": w.occurred_on.isoformat() if w.occurred_on else None} for w in rows]


async def get_my_projects(db, user_id, limit: int = 15) -> list[dict]:
    return await _work(db, user_id, "work", limit)


async def get_my_achievements(db, user_id, limit: int = 15) -> list[dict]:
    return await _work(db, user_id, "achievement", limit)


async def create_story(db, user_id, title: str, description: str | None = None) -> dict:
    s = Story(user_id=user_id, title=title[:200], description=description, visibility=Visibility.PRIVATE, status="draft")
    db.add(s)
    await db.commit()
    return {"id": str(s.id), "title": s.title}


async def create_story_chapter(db, user_id, story_id: str, title: str, content: str = "", memory_ids: list[str] | None = None) -> dict:
    story = await db.scalar(select(Story).where(Story.id == uuid.UUID(story_id), Story.user_id == user_id))
    if not story:
        return {"error": "story not found"}
    own = {str(i) for i in await db.scalars(select(Memory.id).where(Memory.user_id == user_id, Memory.id.in_([uuid.UUID(i) for i in memory_ids or []])))}
    last = await db.scalar(select(func.max(StoryChapter.position)).where(StoryChapter.story_id == story.id))
    ch = StoryChapter(story_id=story.id, position=(last if last is not None else -1) + 1, title=title[:200], content=content,
                      memory_ids=sorted(own), visibility=Visibility.PRIVATE, ai_generated=True)
    db.add(ch)
    await db.commit()
    return {"id": str(ch.id), "position": ch.position}


TOOLS = {
    "get_my_profile": (get_my_profile, "The user's profile: username, display name, headline, bio."),
    "get_daily_memories": (get_daily_memories, "The user's recent memories (short). Args: limit, since (YYYY-MM-DD)."),
    "search_memories": (tool_search_memories, "Search the user's own memories by keywords. Args: query, limit."),
    "get_memory": (get_memory, "One of the user's memories in full. Args: memory_id."),
    "get_my_projects": (get_my_projects, "The user's projects (work items of type work). Args: limit."),
    "get_my_achievements": (get_my_achievements, "The user's achievements. Args: limit."),
    "create_story": (create_story, "Create a private draft story. Args: title, description."),
    "create_story_chapter": (create_story_chapter, "Add a chapter to one of the user's stories. Args: story_id, title, content, memory_ids."),
}


async def call_tool(name: str, args: dict, db: AsyncSession, user_id) -> object:
    """Dispatcher for a tool-calling model. user_id always comes from the caller, whatever the model put in args."""
    if name not in TOOLS:
        return {"error": f"unknown tool {name}"}
    args = {k: v for k, v in (args or {}).items() if k not in ("user_id", "db")}
    return await TOOLS[name][0](db, user_id, **args)
