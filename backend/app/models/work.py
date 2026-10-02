import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.profile import Visibility


class WorkItem(Base):
    __tablename__ = "work_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    context_role: Mapped[str | None] = mapped_column(String(200), nullable=True)
    occurred_on: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Kind: capture | work | learning | achievement | problem. Each kind has its own
    # state list (app/services/lifecycle.py), validated on every write.
    work_type: Mapped[str] = mapped_column(String(50), nullable=False, default="capture")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="captured", server_default="captured")
    # Context template key (developer, sports, ...) from work_templates; attributes are validated against it.
    template: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # An idea/learning item this grew from (UC-11), so Journey shows how it grew.
    source_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("work_items.id", ondelete="SET NULL"), nullable=True
    )
    visibility: Mapped[Visibility] = mapped_column(
        Enum(Visibility, name="visibility", values_callable=lambda e: [m.value for m in e]),
        default=Visibility.PUBLIC,
        server_default=Visibility.PUBLIC.value,
        nullable=False,
    )

    skills: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    custom_attributes: Mapped[dict] = mapped_column(JSON, default=dict, server_default="{}")
    evidence_links: Mapped[list[dict]] = mapped_column(JSONB, default=list, server_default="[]")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="work_items")


class WorkEvent(Base):
    """Append-only history of a work item (PRD FR-TL-03): feeds the timeline and "days active"."""

    __tablename__ = "work_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    field: Mapped[str] = mapped_column(String(30), nullable=False)  # created | status | visibility | work_type
    old_value: Mapped[str | None] = mapped_column(String(50), nullable=True)
    new_value: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)



class WorkTemplate(Base):
    """Field definitions as data (PRD FR-WORK-05, NFR-04): a new profession is a row, not a migration."""

    __tablename__ = "work_templates"

    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # [{key, label, type: text|textarea|url|number|list|select, options?, placeholder?}]
    fields: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")


class Upload(Base):
    """Every stored file has an owner; only public files are served without a check (PRD NFR-09)."""

    __tablename__ = "uploads"

    name: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
