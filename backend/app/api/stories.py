import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.companion import companion_prompt, load_companion
from app.ai.engine import get_engine
from app.ai.story import NoMemories, generate_story, regenerate_chapter
from app.api.deps import ensure_can_publish, get_current_user
from app.api.memories import check_refs
from app.core.database import get_db
from app.models.memory import Memory, Story, StoryChapter
from app.models.profile import Profile, Visibility
from app.models.user import User
from app.models.work import WorkItem

router = APIRouter(prefix="/stories", tags=["stories"])
Vis = Literal["public", "unlisted", "private", "draft"]


class StoryIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    cover_media: str | None = Field(default=None, max_length=64)
    visibility: Vis = "private"
    status: Literal["draft", "published"] = "draft"


class StoryPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    cover_media: str | None = Field(default=None, max_length=64)
    visibility: Vis | None = None
    status: Literal["draft", "published"] | None = None


class ChapterIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = ""
    memory_ids: list[uuid.UUID] = Field(default_factory=list, max_length=50)
    project_ids: list[uuid.UUID] = Field(default_factory=list, max_length=50)
    achievement_ids: list[uuid.UUID] = Field(default_factory=list, max_length=50)
    media: list[str] = Field(default_factory=list, max_length=20)
    visibility: Vis = "private"


class ChapterPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = None
    memory_ids: list[uuid.UUID] | None = Field(default=None, max_length=50)
    project_ids: list[uuid.UUID] | None = Field(default=None, max_length=50)
    achievement_ids: list[uuid.UUID] | None = Field(default=None, max_length=50)
    media: list[str] | None = Field(default=None, max_length=20)
    visibility: Vis | None = None


class GenerateIn(BaseModel):
    topic: str = Field(min_length=3, max_length=300)  # e.g. "how I started HOME PROOFOLIO"


class OrderIn(BaseModel):
    ids: list[uuid.UUID]


def story_out(s: Story, chapters: list[StoryChapter] | None = None) -> dict:
    out = {"id": str(s.id), "title": s.title, "description": s.description, "cover_media": s.cover_media,
           "visibility": s.visibility.value, "status": s.status,
           "created_at": s.created_at.isoformat(), "updated_at": s.updated_at.isoformat()}
    if chapters is not None:
        out["chapters"] = [chapter_out(c) for c in chapters]
    return out


def chapter_out(c: StoryChapter) -> dict:
    return {"id": str(c.id), "story_id": str(c.story_id), "position": c.position, "title": c.title, "content": c.content,
            "memory_ids": c.memory_ids, "project_ids": c.project_ids, "achievement_ids": c.achievement_ids,
            "media": c.media, "visibility": c.visibility.value, "ai_generated": c.ai_generated}


async def own_story(db: AsyncSession, user: User, story_id: uuid.UUID) -> Story:
    s = await db.scalar(select(Story).where(Story.id == story_id, Story.user_id == user.id))
    if not s:
        raise HTTPException(404, "Story not found")
    return s


async def chapters_of(db: AsyncSession, story_id: uuid.UUID) -> list[StoryChapter]:
    return list(await db.scalars(select(StoryChapter).where(StoryChapter.story_id == story_id).order_by(StoryChapter.position)))


async def own_chapter(db: AsyncSession, story: Story, chapter_id: uuid.UUID) -> StoryChapter:
    c = await db.scalar(select(StoryChapter).where(StoryChapter.id == chapter_id, StoryChapter.story_id == story.id))
    if not c:
        raise HTTPException(404, "Chapter not found")
    return c


async def check_chapter_refs(db: AsyncSession, user: User, data: dict) -> None:
    """Memories, projects, achievements and media linked to a chapter must be the caller's own."""
    await check_refs(db, user, {"media": data.get("media")})
    for key, model in (("memory_ids", Memory), ("project_ids", WorkItem), ("achievement_ids", WorkItem)):
        ids = set(data.get(key) or [])
        if ids:
            owner = model.user_id
            found = set(await db.scalars(select(model.id).where(model.id.in_(ids), owner == user.id)))
            if found != ids:
                raise HTTPException(422, f"{key} must be your own")


def _store(data: dict) -> dict:
    """uuid lists -> JSON strings, visibility -> enum."""
    for k in ("memory_ids", "project_ids", "achievement_ids"):
        if data.get(k) is not None:
            data[k] = [str(i) for i in data[k]]
    if data.get("visibility") is not None:
        data["visibility"] = Visibility(data["visibility"])
    return data


@router.post("/generate", status_code=201)
async def generate(body: GenerateIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """AI writes a private draft story from your own memories about the topic. Your memories are never changed."""
    companion = companion_prompt(await load_companion(db, user.id))
    try:
        story = await generate_story(get_engine(), db, user.id, body.topic, companion)
    except NoMemories:
        raise HTTPException(422, "No memories match that topic yet. Add a few memories about it first.")
    except Exception:
        raise HTTPException(503, "AI model is unavailable")
    return story_out(story, await chapters_of(db, story.id))


@router.post("", status_code=201)
async def create_story(body: StoryIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ensure_can_publish(user, body.visibility)
    await check_refs(db, user, {"media": [body.cover_media] if body.cover_media else []})
    s = Story(user_id=user.id, **{**body.model_dump(), "visibility": Visibility(body.visibility)})
    db.add(s)
    await db.commit()
    return story_out(s, [])


@router.get("")
async def list_stories(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(select(Story).where(Story.user_id == user.id).order_by(Story.updated_at.desc()))
    return [story_out(s) for s in rows]


@router.get("/public/{username}")
async def public_stories(username: str, db: AsyncSession = Depends(get_db)):
    """Public stories of a profile, with only their public chapters."""
    uid = await db.scalar(select(Profile.user_id).where(Profile.username == username))
    if not uid:
        raise HTTPException(404, "Profile not found")
    out = []
    for s in await db.scalars(select(Story).where(Story.user_id == uid, Story.visibility == Visibility.PUBLIC, Story.status == "published")):
        out.append(story_out(s, [c for c in await chapters_of(db, s.id) if c.visibility == Visibility.PUBLIC]))
    return out


@router.get("/{story_id}")
async def get_story(story_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    s = await own_story(db, user, story_id)
    return story_out(s, await chapters_of(db, s.id))


@router.patch("/{story_id}")
async def update_story(story_id: uuid.UUID, body: StoryPatch, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    s = await own_story(db, user, story_id)
    changes = body.model_dump(exclude_unset=True)
    if changes.get("visibility"):
        ensure_can_publish(user, changes["visibility"])
    if changes.get("cover_media"):
        await check_refs(db, user, {"media": [changes["cover_media"]]})
    for k, v in _store(changes).items():
        setattr(s, k, v)
    await db.commit()
    await db.refresh(s)  # updated_at is set by the database
    return story_out(s, await chapters_of(db, s.id))


@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_story(story_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.delete(await own_story(db, user, story_id))
    await db.commit()
    return Response(status_code=204)


@router.post("/{story_id}/chapters", status_code=201)
async def add_chapter(story_id: uuid.UUID, body: ChapterIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    s = await own_story(db, user, story_id)
    ensure_can_publish(user, body.visibility)
    data = body.model_dump()
    await check_chapter_refs(db, user, data)
    last = max([c.position for c in await chapters_of(db, s.id)], default=-1)
    c = StoryChapter(story_id=s.id, position=last + 1, **_store(data))
    db.add(c)
    await db.commit()
    return chapter_out(c)


@router.put("/{story_id}/chapters/order")
async def reorder_chapters(story_id: uuid.UUID, body: OrderIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    s = await own_story(db, user, story_id)
    chapters = {c.id: c for c in await chapters_of(db, s.id)}
    if set(body.ids) != set(chapters) or len(body.ids) != len(chapters):
        raise HTTPException(422, "ids must list every chapter of this story exactly once")
    for pos, cid in enumerate(body.ids):
        chapters[cid].position = pos
    await db.commit()
    return [chapter_out(chapters[i]) for i in body.ids]


@router.patch("/{story_id}/chapters/{chapter_id}")
async def update_chapter(story_id: uuid.UUID, chapter_id: uuid.UUID, body: ChapterPatch, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    c = await own_chapter(db, await own_story(db, user, story_id), chapter_id)
    changes = body.model_dump(exclude_unset=True)
    if changes.get("visibility"):
        ensure_can_publish(user, changes["visibility"])
    await check_chapter_refs(db, user, changes)
    for k, v in _store(changes).items():
        setattr(c, k, v)
    if "content" in changes:
        c.ai_generated = False  # the user's own words now
    await db.commit()
    return chapter_out(c)


@router.delete("/{story_id}/chapters/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chapter(story_id: uuid.UUID, chapter_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.delete(await own_chapter(db, await own_story(db, user, story_id), chapter_id))
    await db.commit()
    return Response(status_code=204)


@router.post("/{story_id}/chapters/{chapter_id}/regenerate")
async def regenerate(story_id: uuid.UUID, chapter_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Rewrites the chapter from the memories linked to it. Replaces the chapter text, never the memories."""
    s = await own_story(db, user, story_id)
    c = await own_chapter(db, s, chapter_id)
    companion = companion_prompt(await load_companion(db, user.id))
    try:
        return chapter_out(await regenerate_chapter(get_engine(), db, user.id, s, c, companion))
    except NoMemories:
        raise HTTPException(422, "This chapter has no linked memories to write from. Add memories to it first.")
    except Exception:
        raise HTTPException(503, "AI model is unavailable")
