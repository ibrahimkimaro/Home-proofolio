import uuid
from datetime import date, time
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import Text, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.tools import memory_dict
from app.api.deps import ensure_can_publish, get_current_user
from app.core.database import get_db
from app.models.memory import Memory
from app.models.profile import Profile, Visibility
from app.models.user import User
from app.models.work import Upload, WorkItem

router = APIRouter(prefix="/memories", tags=["memories"])
Vis = Literal["public", "unlisted", "private", "draft"]


class MemoryIn(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    content: str = Field(min_length=1, max_length=20000)
    occurred_on: date | None = None  # today when omitted
    occurred_time: time | None = None
    category: str = Field(default="daily", max_length=50)
    mood: str = Field(min_length=1, max_length=50)  # required: the AI reads it as tone
    people: list[str] = Field(min_length=1, max_length=30)  # required: "Just me" is a valid answer
    location: str | None = Field(default=None, max_length=200)
    project_id: uuid.UUID | None = None
    achievement_id: uuid.UUID | None = None
    skills: list[str] = Field(default_factory=list, max_length=30)
    media: list[str] = Field(default_factory=list, max_length=20)
    tags: list[str] = Field(default_factory=list, max_length=30)
    attributes: dict = Field(default_factory=dict)  # dynamic per-person extras: {"match": "...", "technology": "..."}
    visibility: Vis = "private"
    importance: int = Field(default=3, ge=1, le=5)


class MemoryPatch(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    content: str | None = Field(default=None, min_length=1, max_length=20000)
    occurred_on: date | None = None
    occurred_time: time | None = None
    category: str | None = Field(default=None, max_length=50)
    mood: str | None = Field(default=None, min_length=1, max_length=50)
    people: list[str] | None = Field(default=None, min_length=1, max_length=30)
    location: str | None = Field(default=None, max_length=200)
    project_id: uuid.UUID | None = None
    achievement_id: uuid.UUID | None = None
    skills: list[str] | None = Field(default=None, max_length=30)
    media: list[str] | None = Field(default=None, max_length=20)
    tags: list[str] | None = Field(default=None, max_length=30)
    attributes: dict | None = None
    visibility: Vis | None = None
    importance: int | None = Field(default=None, ge=1, le=5)


async def check_refs(db: AsyncSession, user: User, data: dict) -> None:
    """Linked projects/achievements and media must belong to the caller."""
    for key in ("project_id", "achievement_id"):
        if data.get(key) and not await db.scalar(select(WorkItem.id).where(WorkItem.id == data[key], WorkItem.user_id == user.id)):
            raise HTTPException(422, f"{key} is not one of your work items")
    media = data.get("media") or []
    if media and len(set(await db.scalars(select(Upload.name).where(Upload.name.in_(media), Upload.owner_id == user.id)))) != len(set(media)):
        raise HTTPException(422, "media must be your own uploads")


async def own_memory(db: AsyncSession, user: User, memory_id: uuid.UUID) -> Memory:
    m = await db.scalar(select(Memory).where(Memory.id == memory_id, Memory.user_id == user.id))
    if not m:
        raise HTTPException(404, "Memory not found")
    return m


@router.post("", status_code=201)
async def create_memory(body: MemoryIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ensure_can_publish(user, body.visibility)
    data = body.model_dump()
    await check_refs(db, user, data)
    data["visibility"] = Visibility(data["visibility"])
    data["occurred_on"] = data["occurred_on"] or date.today()
    m = Memory(user_id=user.id, **data)
    db.add(m)
    await db.commit()
    return memory_dict(m)


@router.get("")
async def list_memories(
    q: str | None = None, category: str | None = None, tag: str | None = None, mood: str | None = None,
    date_from: date | None = None, date_to: date | None = None, important: bool = False,
    limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    """Your timeline, newest first."""
    stmt = select(Memory).where(Memory.user_id == user.id)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(*[func.lower(cast(c, Text)).like(like) for c in (Memory.title, Memory.content, Memory.location, Memory.people, Memory.tags, Memory.skills)]))
    if category:
        stmt = stmt.where(Memory.category == category)
    if mood:
        stmt = stmt.where(func.lower(Memory.mood) == mood.lower())
    if tag:
        stmt = stmt.where(Memory.tags.contains([tag]))
    if date_from:
        stmt = stmt.where(Memory.occurred_on >= date_from)
    if date_to:
        stmt = stmt.where(Memory.occurred_on <= date_to)
    if important:
        stmt = stmt.where(Memory.importance >= 4)
    rows = await db.scalars(stmt.order_by(Memory.occurred_on.desc(), Memory.occurred_time.desc().nulls_last(), Memory.created_at.desc()).limit(limit).offset(offset))
    return [memory_dict(m) for m in rows]


@router.get("/public/{username}")
async def public_memories(username: str, db: AsyncSession = Depends(get_db)):
    """Anyone's PUBLIC memories only (unlisted/private/draft never appear here)."""
    uid = await db.scalar(select(Profile.user_id).where(Profile.username == username))
    if not uid:
        raise HTTPException(404, "Profile not found")
    rows = await db.scalars(select(Memory).where(Memory.user_id == uid, Memory.visibility == Visibility.PUBLIC).order_by(Memory.occurred_on.desc()).limit(100))
    return [memory_dict(m) for m in rows]


@router.get("/{memory_id}")
async def get_memory(memory_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return memory_dict(await own_memory(db, user, memory_id))


@router.patch("/{memory_id}")
async def update_memory(memory_id: uuid.UUID, body: MemoryPatch, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    m = await own_memory(db, user, memory_id)
    changes = body.model_dump(exclude_unset=True)
    for required in ("content", "mood", "people", "occurred_on"):
        if required in changes and changes[required] is None:
            raise HTTPException(422, f"{required} cannot be empty")
    if "visibility" in changes:
        ensure_can_publish(user, changes["visibility"])
        changes["visibility"] = Visibility(changes["visibility"])
    await check_refs(db, user, changes)
    for k, v in changes.items():
        setattr(m, k, v)
    await db.commit()
    await db.refresh(m)  # updated_at is set by the database
    return memory_dict(m)


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(memory_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.delete(await own_memory(db, user, memory_id))
    await db.commit()
    return Response(status_code=204)
