import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

DEFAULT_NAME = "Kimmy"


class Companion(Base):
    """One AI companion per user. No row means the defaults below (see app/ai/companion.py)."""

    __tablename__ = "companions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False, default=DEFAULT_NAME, server_default=DEFAULT_NAME)
    relationship_type: Mapped[str] = mapped_column(String(50), nullable=False, default="personal assistant", server_default="personal assistant")
    personality: Mapped[str | None] = mapped_column(String(100), nullable=True)
    communication_style: Mapped[str] = mapped_column(String(30), nullable=False, default="friendly", server_default="friendly")
    languages: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=lambda: ["English", "Kiswahili"], server_default='["English", "Kiswahili"]')
    purpose: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=lambda: ["everything"], server_default='["everything"]')
    proactivity: Mapped[str] = mapped_column(String(30), nullable=False, default="occasional", server_default="occasional")  # on_request | occasional | active
    memory_preferences: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")  # {"remember": [...], "forget": [...]}
    access_permissions: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    custom_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
