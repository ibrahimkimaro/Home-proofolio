import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SiteVisit(Base):
    """One page view on the public site or the app. visitor_id is the browser's guest session id, so a person is counted once."""

    __tablename__ = "site_visits"
    __table_args__ = (Index("ix_site_visits_created", "created_at"), Index("ix_site_visits_visitor", "visitor_id", "created_at"))

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visitor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    path: Mapped[str] = mapped_column(String(200), nullable=False)
    referrer: Mapped[str | None] = mapped_column(String(200), nullable=True)
    device: Mapped[str | None] = mapped_column(String(60), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
