"""Activity around accounts: member notifications, the security event log, IP blocks and admin broadcasts."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Notification(Base):
    """Something a member should know about: a follow, a business decision, a new sign-in, an admin message."""

    __tablename__ = "notifications"
    # Chat: one unread "X sent you N messages" per member and chat (upserted by realtime_chat).
    __table_args__ = (
        Index("uq_notifications_unread_message", "user_id", "link", unique=True,
              postgresql_where=text("kind = 'message' AND read_at IS NULL")),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(30), nullable=False)  # follow | business | activated | signin | broadcast | message
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    link: Mapped[str | None] = mapped_column(String(300), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Set for admin messages: which one this came from, and when it first reached the member's device.
    broadcast_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("broadcasts.id", ondelete="SET NULL"), nullable=True, index=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class SecurityEvent(Base):
    """Every sign-in attempt, lockout, OTP failure and blocked request. Feeds Admin > Security monitoring."""

    __tablename__ = "security_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kind: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(300), nullable=True)
    details: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class BlockedIp(Base):
    __tablename__ = "blocked_ips"

    ip: Mapped[str] = mapped_column(String(64), primary_key=True)
    reason: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    blocked_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # None = until removed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Broadcast(Base):
    """A message an admin sent to a group of members, by in-app notification, SMS or email."""

    __tablename__ = "broadcasts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    channel: Mapped[str] = mapped_column(String(10), nullable=False)  # in_app | sms | email
    segment: Mapped[str] = mapped_column(String(20), nullable=False)
    subject: Mapped[str] = mapped_column(String(160), nullable=False, default="")
    body: Mapped[str] = mapped_column(Text, nullable=False)
    recipients: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    delivery: Mapped[str] = mapped_column(String(20), nullable=False)  # delivered (in-app) | manual (SMS/email until a provider is connected)
    # Emails that could not be delivered (email channel only).
    failed: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    # The members picked, when segment is "selected".
    user_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
