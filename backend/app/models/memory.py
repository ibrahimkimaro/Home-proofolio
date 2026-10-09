import uuid
from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Index, Integer, String, Text, Time, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.profile import Visibility


def _visibility() -> Enum:
    # Reuses the existing Postgres "visibility" enum; private by default because memories are personal.
    return Enum(Visibility, name="visibility", values_callable=lambda e: [m.value for m in e], create_type=False)


class Memory(Base):
    """A Daily Memory: the user's own words are the source of truth and are never rewritten by the AI.
    One universal shape; per-person extras (match, course, technology...) live in `attributes`."""

    __tablename__ = "memories"
    __table_args__ = (Index("ix_memories_user_date", "user_id", "occurred_on"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    occurred_on: Mapped[date] = mapped_column(Date, nullable=False)
    occurred_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="daily", server_default="daily")
    mood: Mapped[str] = mapped_column(String(50), nullable=False)  # mandatory: the AI reads it as tone
    people: Mapped[list[str]] = mapped_column(JSONB, nullable=False)  # mandatory: who was there ("Just me" is fine)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("work_items.id", ondelete="SET NULL"), nullable=True)
    achievement_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("work_items.id", ondelete="SET NULL"), nullable=True)
    skills: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    media: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")  # uploads.name values
    tags: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    attributes: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")  # dynamic extras
    visibility: Mapped[Visibility] = mapped_column(_visibility(), nullable=False, default=Visibility.PRIVATE, server_default="private")
    importance: Mapped[int] = mapped_column(Integer, nullable=False, default=3, server_default="3")  # 1..5, 4+ = important
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Story(Base):
    __tablename__ = "stories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_media: Mapped[str | None] = mapped_column(String(64), nullable=True)  # uploads.name
    visibility: Mapped[Visibility] = mapped_column(_visibility(), nullable=False, default=Visibility.PRIVATE, server_default="private")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft", server_default="draft")  # draft | published
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class StoryChapter(Base):
    __tablename__ = "story_chapters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    story_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    # ponytail: related ids as JSONB lists (ownership is checked on write), not join tables. Add tables if cross-queries are needed.
    memory_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    project_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    achievement_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    media: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    visibility: Mapped[Visibility] = mapped_column(_visibility(), nullable=False, default=Visibility.PRIVATE, server_default="private")
    ai_generated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
