"""Tools the AI companion may use. Every tool takes the user id from the SERVER (the authenticated session),
never from the model's arguments, and only returns that user's own rows. Read tools are read-only;
create_* write only story drafts.

TOOLS is the registry: name -> (function, description for the model, argument schema, permission gate).
user_tools() turns the ones the user has allowed into LangChain tools for the agent (app/ai/agent.py).
General tools that need no user (knowledge, date, maths, charts) are served over MCP: app/ai/mcp_server.py."""
import re
import uuid
from datetime import date

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field
from sqlalchemy import Text, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.db_context import user_profile_context, user_profile_data, user_full_database_summary, user_work_context
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
    """The user's own complete account & profile details: full name, username, email, phone number, headline, bio, roles, and CV. Never includes passwords."""
    return await user_profile_data(db, user_id)


async def get_my_database_summary(db, user_id) -> str:
    """Complete summary of user's database records: profile, roles, and work/portfolio items."""
    return await user_full_database_summary(db, user_id)


async def get_daily_memories(db, user_id, limit: int = 20, since: str | None = None) -> list[dict]:
    q = select(Memory).where(Memory.user_id == user_id)
    if since:
        q = q.where(Memory.occurred_on >= date.fromisoformat(since))
    rows = await db.scalars(q.order_by(Memory.occurred_on.desc(), Memory.created_at.desc()).limit(min(limit, 50)))
    return [memory_dict(m, full=False) for m in rows]


async def tool_search_memories(db, user_id, query: str, limit: int = 10) -> list[dict]:
    return [memory_dict(m) for m in await search_memories(db, user_id, query, min(limit, 20))]


async def get_memory(db, user_id, memory_id: str) -> dict | None:
    try:
        m = await db.scalar(select(Memory).where(Memory.id == uuid.UUID(memory_id), Memory.user_id == user_id))
    except ValueError:
        return {"error": "memory_id must be an id returned by another tool"}
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


async def get_work_summary(db, user_id) -> str:
    return await user_work_context(db, user_id)


async def search_my_work(db, user_id, query: str = "", work_type: str = "", status: str = "", limit: int = 10) -> list[dict]:
    """The user's own work items of any type, filtered by keywords / type / status, best keyword matches first."""
    q = select(WorkItem).where(WorkItem.user_id == user_id)
    if work_type:
        q = q.where(func.lower(WorkItem.work_type) == work_type.strip().lower())
    if status:
        q = q.where(func.lower(WorkItem.status) == status.strip().lower())
    words = keywords(query)
    cols = (WorkItem.title, WorkItem.description, WorkItem.context_role, WorkItem.skills)
    if words:
        q = q.where(or_(*[func.lower(cast(c, Text)).contains(w) for w in words for c in cols]))
    rows = (await db.scalars(q.order_by(WorkItem.created_at.desc()).limit(SEARCH_POOL))).all()
    def score(w: WorkItem) -> int:
        text = " ".join(str(x) for x in (w.title, w.description, w.context_role, w.skills)).lower()
        return sum(word in text for word in words)
    best = sorted(rows, key=score, reverse=True)[:max(1, min(limit, 30))]  # stable: newest first among equals
    return [{"id": str(w.id), "title": w.title, "type": w.work_type, "status": w.status,
             "description": (w.description or "")[:300], "skills": w.skills,
             "date": w.occurred_on.isoformat() if w.occurred_on else None} for w in best]


async def get_work_item(db, user_id, work_id: str) -> dict:
    try:
        w = await db.scalar(select(WorkItem).where(WorkItem.id == uuid.UUID(work_id), WorkItem.user_id == user_id))
    except ValueError:
        return {"error": "work_id must be an id returned by another tool"}
    if not w:
        return {"error": "work item not found"}
    return {"id": str(w.id), "title": w.title, "type": w.work_type, "status": w.status, "role": w.context_role,
            "description": (w.description or "")[:2000], "skills": w.skills, "visibility": w.visibility.value,
            "date": w.occurred_on.isoformat() if w.occurred_on else None, "details": w.custom_attributes,
            "evidence": (w.evidence_links or [])[:10], "created_at": w.created_at.isoformat() if w.created_at else None}


async def create_memory(db: AsyncSession, user_id, content: str, mood: str = "reflective", title: str | None = None, category: str = "daily", people: list[str] | None = None, location: str | None = None, tags: list[str] | None = None, occurred_on: str | None = None, importance: int = 3) -> dict:
    """Create and save a new personal daily memory into the database."""
    m = Memory(
        user_id=user_id,
        content=content,
        mood=mood or "reflective",
        title=title[:200] if title else None,
        category=category or "daily",
        people=people or ["Just me"],
        location=location[:200] if location else None,
        tags=tags or [],
        occurred_on=date.fromisoformat(occurred_on) if occurred_on else date.today(),
        importance=max(1, min(importance or 3, 5)),
        visibility=Visibility.PRIVATE,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return {"id": str(m.id), "title": m.title, "mood": m.mood, "occurred_on": m.occurred_on.isoformat(), "message": "Memory saved successfully to your database."}


async def update_memory(db: AsyncSession, user_id, memory_id: str, content: str | None = None, title: str | None = None, mood: str | None = None) -> dict:
    """Update an existing memory in the database."""
    try:
        m = await db.scalar(select(Memory).where(Memory.id == uuid.UUID(memory_id), Memory.user_id == user_id))
    except ValueError:
        return {"error": "Invalid memory_id format"}
    if not m:
        return {"error": "Memory not found"}
    if content is not None:
        m.content = content
    if title is not None:
        m.title = title[:200]
    if mood is not None:
        m.mood = mood
    await db.commit()
    return {"id": str(m.id), "title": m.title, "message": "Memory updated successfully."}


async def delete_memory(db: AsyncSession, user_id, memory_id: str) -> dict:
    """Delete a memory from the database."""
    try:
        m = await db.scalar(select(Memory).where(Memory.id == uuid.UUID(memory_id), Memory.user_id == user_id))
    except ValueError:
        return {"error": "Invalid memory_id format"}
    if not m:
        return {"error": "Memory not found"}
    await db.delete(m)
    await db.commit()
    return {"message": "Memory deleted successfully."}


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


async def update_story(db: AsyncSession, user_id, story_id: str, title: str | None = None, description: str | None = None) -> dict:
    """Update title or description of a story in the database."""
    try:
        s = await db.scalar(select(Story).where(Story.id == uuid.UUID(story_id), Story.user_id == user_id))
    except ValueError:
        return {"error": "Invalid story_id format"}
    if not s:
        return {"error": "Story not found"}
    if title is not None:
        s.title = title[:200]
    if description is not None:
        s.description = description
    await db.commit()
    return {"id": str(s.id), "title": s.title, "message": "Story updated successfully."}


async def delete_story(db: AsyncSession, user_id, story_id: str) -> dict:
    """Delete a story draft from the database."""
    try:
        s = await db.scalar(select(Story).where(Story.id == uuid.UUID(story_id), Story.user_id == user_id))
    except ValueError:
        return {"error": "Invalid story_id format"}
    if not s:
        return {"error": "Story not found"}
    await db.delete(s)
    await db.commit()
    return {"message": "Story deleted successfully."}


async def delete_story_chapter(db: AsyncSession, user_id, story_id: str, chapter_id: str) -> dict:
    """Delete a chapter from a story in the database."""
    try:
        story = await db.scalar(select(Story).where(Story.id == uuid.UUID(story_id), Story.user_id == user_id))
        if not story:
            return {"error": "Story not found"}
        ch = await db.scalar(select(StoryChapter).where(StoryChapter.id == uuid.UUID(chapter_id), StoryChapter.story_id == story.id))
        if not ch:
            return {"error": "Chapter not found"}
        await db.delete(ch)
        await db.commit()
        return {"message": "Chapter deleted successfully."}
    except ValueError:
        return {"error": "Invalid UUID format"}



async def chart_portfolio_overview(db: AsyncSession, user_id, breakdown: str = "visibility", chart_type: str = "bar", title: str = "") -> str:
    """Generate and sketch a real interactive visual chart of the user's portfolio items (public vs private, by work type, or by status) to display directly in the chat."""
    import json
    if breakdown == "visibility":
        q = select(WorkItem.visibility, func.count()).where(WorkItem.user_id == user_id).group_by(WorkItem.visibility)
        rows = (await db.execute(q)).all()
        counts = {r[0].value if hasattr(r[0], "value") else str(r[0]): r[1] for r in rows}
        pub = counts.get("public", 0)
        priv = counts.get("private", 0)
        data = [
            {"name": "Public Works", "value": pub},
            {"name": "Private Works", "value": priv},
            {"name": "Total Works", "value": pub + priv},
        ]
        spec = {
            "type": chart_type or "bar",
            "title": title or "Portfolio Overview: Works Breakdown",
            "description": f"Verified records: {pub} Public, {priv} Private, {pub + priv} Total",
            "data": data,
            "xKey": "name",
        }
    elif breakdown == "type":
        q = select(WorkItem.work_type, func.count()).where(WorkItem.user_id == user_id).group_by(WorkItem.work_type)
        rows = (await db.execute(q)).all()
        data = [{"name": str(r[0]).capitalize(), "value": r[1]} for r in rows]
        spec = {
            "type": chart_type or "bar",
            "title": title or "Portfolio Items by Kind",
            "data": data or [{"name": "No Items", "value": 0}],
            "xKey": "name",
        }
    else:
        q = select(WorkItem.status, func.count()).where(WorkItem.user_id == user_id).group_by(WorkItem.status)
        rows = (await db.execute(q)).all()
        data = [{"name": str(r[0]).capitalize(), "value": r[1]} for r in rows]
        spec = {
            "type": chart_type or "bar",
            "title": title or "Portfolio Items by Status",
            "data": data or [{"name": "No Items", "value": 0}],
            "xKey": "name",
        }
    return f"```chart\n{json.dumps(spec, ensure_ascii=False, indent=2)}\n```"


async def get_my_messages(db: AsyncSession, user_id, limit: int = 15) -> list[dict]:
    """The user's recent direct and group chat messages (from the database), newest first."""
    from app.models.chat import ChatMessage
    rows = (await db.scalars(
        select(ChatMessage)
        .where(
            or_(ChatMessage.author_id == user_id, ChatMessage.recipient_id == user_id),
            ChatMessage.deleted_at.is_(None)
        )
        .order_by(ChatMessage.inserted_at.desc())
        .limit(min(limit, 30))
    )).all()
    return [
        {
            "id": m.id,
            "sender": "Me" if m.author_id == user_id else m.author_name,
            "is_outgoing": (m.author_id == user_id),
            "text": (m.body or "")[:300],
            "time": m.inserted_at.strftime("%Y-%m-%d %H:%M") if m.inserted_at else None,
            "unread": (m.recipient_id == user_id and m.read_at is None),
        }
        for m in rows
    ]


async def sketch_chart(db: AsyncSession, user_id, title: str, data: list[dict], chart_type: str = "bar", description: str = "", x_key: str = "name", size: str = "full") -> str:
    """Sketch a custom visual interactive chart with bars, lines, or pie to display right in the chat conversation."""
    import json
    spec = {
        "type": chart_type,
        "title": title,
        "description": description,
        "data": data,
        "xKey": x_key or "name",
        "size": size or "full",
    }
    return f"```chart\n{json.dumps(spec, ensure_ascii=False, indent=2)}\n```"


async def sketch_multi_charts(db: AsyncSession, user_id, charts: list[dict], layout: str = "grid") -> str:
    """Sketch 2, 3, 4, or 5 visual interactive chart cards in a responsive multi-card dashboard."""
    import json
    payload = {
        "layout": layout or "grid",
        "charts": charts,
    }
    return f"```chart\n{json.dumps(payload, ensure_ascii=False, indent=2)}\n```"


# ---- argument schemas (what the model is told it may pass) ----------------------------------------

class NoArgs(BaseModel):
    pass


class LimitArgs(BaseModel):
    limit: int = Field(15, ge=1, le=30, description="How many items to return, newest first.")


class RecentMemoriesArgs(BaseModel):
    limit: int = Field(20, ge=1, le=50, description="How many memories to return, newest first.")
    since: str | None = Field(None, description="Only memories on or after this date, as YYYY-MM-DD.")


class SearchMemoriesArgs(BaseModel):
    query: str = Field(description="Keywords to look for: a topic, person, place, feeling or skill.")
    limit: int = Field(10, ge=1, le=20, description="How many memories to return.")


class MemoryArgs(BaseModel):
    memory_id: str = Field(description="The id of a memory, exactly as returned by another tool.")


class SearchWorkArgs(BaseModel):
    query: str = Field("", description="Keywords to look for in title, description, role and skills. Empty = no keyword filter.")
    work_type: str = Field("", description="Only this kind: work (projects, things built or done), learning (ideas and learning), "
                           "achievement, problem, or capture (quick notes not shaped yet). Empty = all kinds.")
    status: str = Field("", description="Only this state. work: idea, discovery, planned, building, blocked, testing, deployed, completed. "
                        "learning: new, exploring, learning, understanding, testing, turned_into_project. achievement: achieved. "
                        "problem: open, discussing, solving, solved, accepted, closed. capture: captured. Any kind: archived. Empty = all.")
    limit: int = Field(10, ge=1, le=30, description="How many items to return.")


class WorkItemArgs(BaseModel):
    work_id: str = Field(description="The id of a work item, exactly as returned by another tool.")


class ChartPortfolioArgs(BaseModel):
    breakdown: str = Field("visibility", description="What to break down: 'visibility' (public vs private works), 'type' (work types: projects, learning, achievements), or 'status' (lifecycle status).")
    chart_type: str = Field("bar", description="Visual chart type: 'bar', 'horizontal_bar', 'pie', 'line', 'area'.")
    title: str = Field("", description="Optional custom title for the chart.")


class SketchChartArgs(BaseModel):
    title: str = Field(description="Title of the chart.")
    data: list[dict] = Field(description="List of data points, each with 'name' (label) and 'value' (number) or multiple numeric keys.")
    chart_type: str = Field("bar", description="Type of visual chart: 'bar', 'horizontal_bar', 'line', 'area', 'pie', 'donut'.")
    description: str = Field("", description="Optional subtitle or summary.")
    x_key: str = Field("name", description="Key for the X-axis / category (default: 'name').")
    size: str = Field("full", description="Card size in dashboard: 'half' (sits side-by-side with another chart), 'full' (spans entire width), or 'third'.")


class SketchMultiChartsArgs(BaseModel):
    charts: list[dict] = Field(description="List of 2 to 5 chart objects. Each chart object has: 'title', 'data', 'chart_type' ('bar'|'pie'|'line'), 'description', and 'size' ('half'|'full'|'third').")
    layout: str = Field("grid", description="Dashboard card layout: 'grid' or 'stack'.")


class CreateMemoryArgs(BaseModel):
    content: str = Field(description="The memory content or reflection of what happened.")
    mood: str = Field("reflective", description="Mood or emotional tone (e.g., happy, proud, grateful, tired, stressed, energized, reflective).")
    title: str | None = Field(None, description="Optional short title for this memory.")
    category: str = Field("daily", description="Category: 'daily', 'milestone', 'work', 'personal', 'feeling', or 'learning'.")
    people: list[str] | None = Field(None, description="People involved or mentioned.")
    location: str | None = Field(None, description="Location where it happened.")
    tags: list[str] | None = Field(None, description="Keywords or tags.")
    occurred_on: str | None = Field(None, description="Date in YYYY-MM-DD format (defaults to today).")
    importance: int = Field(3, ge=1, le=5, description="Importance scale from 1 (minor) to 5 (life milestone).")


class UpdateMemoryArgs(BaseModel):
    memory_id: str = Field(description="The exact id of the memory to update, returned from get_memory or search_memories.")
    content: str | None = Field(None, description="Updated content or reflection.")
    title: str | None = Field(None, description="Updated title.")
    mood: str | None = Field(None, description="Updated mood or emotional tone.")


class DeleteMemoryArgs(BaseModel):
    memory_id: str = Field(description="The exact id of the memory to delete.")


class CreateStoryArgs(BaseModel):
    title: str = Field(description="Title of the story.")
    description: str | None = Field(None, description="Summary or description of the story.")


class CreateChapterArgs(BaseModel):
    story_id: str = Field(description="The exact id of the story to add this chapter to.")
    title: str = Field(description="Chapter title.")
    content: str = Field("", description="Chapter text narrative.")
    memory_ids: list[str] | None = Field(None, description="IDs of memories referenced in this chapter.")


class DeleteStoryArgs(BaseModel):
    story_id: str = Field(description="The exact id of the story to delete.")


class UpdateStoryArgs(BaseModel):
    story_id: str = Field(description="The exact id of the story to update.")
    title: str | None = Field(None, description="New title for the story.")
    description: str | None = Field(None, description="New description or narrative summary.")


class DeleteChapterArgs(BaseModel):
    story_id: str = Field(description="The exact id of the story.")
    chapter_id: str = Field(description="The exact id of the chapter to delete.")


WORK, MEMORIES = "projects", "memories"  # Companion.access_permissions entries (see app/ai/chat.py)
ALWAYS = "*"  # offered whatever the user allowed: the tool reads nothing from their account


class PdfArgs(BaseModel):
    title: str = Field(max_length=120, description="Title of the PDF.")
    content: str = Field(max_length=12000, description="The full text of the PDF in short markdown: # headings, paragraphs, - lists. Only facts you already have.")


async def create_pdf_report(db, user_id, title: str, content: str) -> str:
    from app.ai.pdf_export import user_pdf
    name = user_pdf(user_id, title, content).rsplit("/", 1)[-1]
    return f"The PDF is ready. Tell the user, and put exactly this link in your answer: [Download PDF](report:{name})"


async def create_work_report_pdf(db, user_id) -> str:
    from app.ai.work_report import build_work_report
    from app.models.user import User
    user = await db.get(User, user_id)
    name = (await build_work_report(db, user)).rsplit("/", 1)[-1]
    return f"The work report PDF (totals, charts and the latest items) is ready. Put exactly this link in your answer: [Download PDF](report:{name})"

# name -> (function, description, argument schema, permission the user must have granted; None = not offered to the agent)
TOOLS = {
    "create_pdf_report": (create_pdf_report, "Make a PDF file from text you wrote (a report, summary, letter, plan) for the user to download. Call it when the user asks for a PDF or a downloadable document. Write the whole text in 'content' first; never say you cannot make PDFs.", PdfArgs, ALWAYS),
    "create_work_report_pdf": (create_work_report_pdf, "Make the user's work report PDF (totals, status and type charts, latest items) to download. Call it when they ask for a PDF of their work or portfolio.", NoArgs, WORK),
    "get_my_profile": (get_my_profile, "The user's own complete account & profile details: full name, display name, username, email, phone number, headline, bio, member since, roles & organizations, and CV summary/skills. Passwords are never returned.", NoArgs, WORK),
    "get_my_database_summary": (get_my_database_summary, "Overview of all the user's database records: profile details (name, email, phone, bio), roles, CV, work/portfolio items, and chat messages summary. Call when user asks for all their database data or profile and work combined.", NoArgs, WORK),
    "get_my_messages": (get_my_messages, "The user's recent direct and group chat messages (from the database), newest first. Use whenever user asks about their messages, chats, DMs, or conversations.", LimitArgs, WORK),
    "chart_portfolio_overview": (chart_portfolio_overview, "Sketch and render a real interactive visual chart (bars, pie, etc.) of the user's portfolio overview (public vs private items, by type, or by status) directly in the chat. Call whenever user asks to chart, sketch, or visualize their portfolio or work numbers.", ChartPortfolioArgs, WORK),
    "sketch_chart": (sketch_chart, "Sketch and render an interactive visual chart card (bars, line, pie, area) directly in the chat from custom data numbers. Call whenever user asks for a chart, graph, or visual bars of any numbers.", SketchChartArgs, WORK),
    "sketch_multi_charts": (sketch_multi_charts, "Sketch 2, 3, 4, or 5 visual interactive chart cards in a responsive multi-card dashboard (cards side-by-side or stacked). Call whenever the user asks for multiple charts, comparison, or full visual metrics.", SketchMultiChartsArgs, WORK),
    "get_work_summary": (get_work_summary, "Overview of ALL the user's items: total, counts by state and by kind "
                         "(work, learning, achievement, problem, capture), and the 10 most recent. Call this first for broad questions about their work, progress or portfolio.", NoArgs, WORK),
    "search_my_work": (search_my_work, "Find the user's own items of any kind (work/projects, learning and ideas, achievements, "
                       "problems, quick captures) by keywords, kind or state. Returns ids, titles, state, skills and dates. "
                       "Use it for 'what am I learning', 'which problems are open', 'what is blocked', 'my work with Python'.", SearchWorkArgs, WORK),
    "get_work_item": (get_work_item, "Everything about one work item: full description, role, skills, extra details and evidence links.", WorkItemArgs, WORK),
    "get_my_projects": (get_my_projects, "The user's projects, newest first.", LimitArgs, WORK),
    "get_my_achievements": (get_my_achievements, "The user's achievements, newest first.", LimitArgs, WORK),
    "get_daily_memories": (get_daily_memories, "The user's most recent daily memories (shortened), newest first. "
                           "Use for 'what did I do lately / this week'.", RecentMemoriesArgs, MEMORIES),
    "search_memories": (tool_search_memories, "Search the user's own memories by keywords. Returns full memories, oldest first. "
                        "The ONLY source for what happened in the user's life.", SearchMemoriesArgs, MEMORIES),
    "get_memory": (get_memory, "One of the user's memories in full.", MemoryArgs, MEMORIES),
    "create_memory": (create_memory, "Save a new personal memory to the user's database. ALWAYS ask the user's permission first before calling, or call after user answers yes.", CreateMemoryArgs, MEMORIES),
    "update_memory": (update_memory, "Update an existing memory in the database. ALWAYS ask user permission first before calling, or call after user answers yes.", UpdateMemoryArgs, MEMORIES),
    "delete_memory": (delete_memory, "Delete a memory from the database. ALWAYS ask user permission first before calling, or call after user answers yes.", DeleteMemoryArgs, MEMORIES),
    "create_story": (create_story, "Create a private draft story compiled from user memories or reflections. ALWAYS ask user permission first before calling, or call after user answers yes.", CreateStoryArgs, MEMORIES),
    "update_story": (update_story, "Update an existing story in the database. ALWAYS ask user permission first before calling, or call after user answers yes.", UpdateStoryArgs, MEMORIES),
    "create_story_chapter": (create_story_chapter, "Add a chapter to one of the user's stories. Args: story_id, title, content, memory_ids.", CreateChapterArgs, MEMORIES),
    "delete_story_chapter": (delete_story_chapter, "Delete a chapter from a story. ALWAYS ask user permission first before calling, or call after user answers yes.", DeleteChapterArgs, MEMORIES),
    "delete_story": (delete_story, "Delete a draft story from the database. ALWAYS ask user permission first before calling, or call after user answers yes.", DeleteStoryArgs, MEMORIES),
}


async def call_tool(name: str, args: dict, db: AsyncSession, user_id) -> object:
    """Dispatcher for a tool-calling model. user_id always comes from the caller, whatever the model put in args."""
    if name not in TOOLS:
        return {"error": f"unknown tool {name}"}
    args = {k: v for k, v in (args or {}).items() if k not in ("user_id", "db")}
    return await TOOLS[name][0](db, user_id, **args)


def user_tools(db: AsyncSession, user_id, permissions) -> list[StructuredTool]:
    """LangChain tools over the user's own data, limited to what they allowed. db and user_id are bound here,
    on the server: the model only ever supplies the arguments in the schema."""
    def bind(name: str, description: str, schema) -> StructuredTool:
        async def run(**arguments):
            try:
                found = await call_tool(name, arguments, db, user_id)
            except Exception:
                await db.rollback()  # leave the session usable for the next tool
                raise
            return "Nothing found." if found in (None, [], {}, "") else found
        return StructuredTool.from_function(coroutine=run, name=name, description=description, args_schema=schema)
    return [bind(name, description, schema) for name, (_, description, schema, gate) in TOOLS.items() if gate and (gate == ALWAYS or gate in permissions)]
