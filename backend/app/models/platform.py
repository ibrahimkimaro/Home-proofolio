"""Admin-managed platform data: onboarding content, platform settings, and the admin audit log."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class OnboardingCategory(Base):
    __tablename__ = "onboarding_categories"

    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    label: Mapped[str] = mapped_column(String(80), nullable=False)
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")


class OnboardingRole(Base):
    """A discipline offered in step 1. Its template decides which fields the first work item gets."""

    __tablename__ = "onboarding_roles"

    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    category_key: Mapped[str] = mapped_column(String(40), ForeignKey("onboarding_categories.key", ondelete="CASCADE"), nullable=False, index=True)
    template: Mapped[str] = mapped_column(String(50), nullable=False, default="other")  # work_templates.key (kind=work)
    example_title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    example_skills: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    evidence_hint: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")


class OnboardingQuestion(Base):
    """Extra questions an admin adds to onboarding (e.g. "What brings you here?")."""

    __tablename__ = "onboarding_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prompt: Mapped[str] = mapped_column(String(200), nullable=False)
    help: Mapped[str | None] = mapped_column(String(300), nullable=True)
    kind: Mapped[str] = mapped_column(String(10), nullable=False, default="single")  # single | multi | text
    options: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OnboardingAnswer(Base):
    """One answer per member per question. question_key is a question id, or "discipline"."""

    __tablename__ = "onboarding_answers"
    __table_args__ = (UniqueConstraint("user_id", "question_key"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    question_key: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    answer: Mapped[dict] = mapped_column(JSONB, nullable=False)  # {"value": str | list[str]}
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PlatformSetting(Base):
    """Small key/value store for switches like registration and the announcement banner."""

    __tablename__ = "platform_settings"

    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AdminAction(Base):
    """Audit log: who changed what, when."""

    __tablename__ = "admin_actions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(60), nullable=False)  # e.g. "user.suspend", "onboarding.question.create"
    target: Mapped[str | None] = mapped_column(String(200), nullable=True)
    details: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
