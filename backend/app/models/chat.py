"""Chat history. Written and read by the realtime_chat (Elixir) service; modelled here so Alembic owns the table."""
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    # client_id lets a sender retry after a lost ack without storing the message twice.
    __table_args__ = (
        UniqueConstraint("author_id", "client_id", name="uq_chat_messages_author_client"),
        Index("ix_chat_messages_topic_id", "topic", "id"),
        Index("ix_chat_messages_unread", "recipient_id", postgresql_where=text("read_at IS NULL")),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)  # also the delivery order
    client_id: Mapped[str] = mapped_column(String(64), nullable=False)
    topic: Mapped[str] = mapped_column(String(200), nullable=False)  # "direct:<uuid>_<uuid>" or "room:<slug>"
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    author_name: Mapped[str] = mapped_column(String(255), nullable=False)
    author_username: Mapped[str] = mapped_column(String(50), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    reply_to: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # DMs only: the other member, and when they read it (drives blue ticks and unread badges).
    recipient_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # One file per message: {"name": <uploads.name>, "filename", "content_type", "size"} (served by /chat/attachments).
    attachment: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    inserted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Taken back by its author (or a group admin): the text and file are blanked, the row stays.
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ChatGroup(Base):
    """A group chat. Its messages live in chat_messages under topic "room:<slug>"."""

    __tablename__ = "chat_groups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    topic: Mapped[str] = mapped_column(String(200), nullable=False, default="", server_default="")
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(300), nullable=True)  # /files/<name> of an image an admin uploaded
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ChatGroupMember(Base):
    """Invited members see an accept/decline notification; only status="member" can read or write the room."""

    __tablename__ = "chat_group_members"
    __table_args__ = (Index("ix_chat_group_members_user", "user_id", "status"),)

    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chat_groups.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str] = mapped_column(String(10), nullable=False, default="member", server_default="member")  # admin | member
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="invited", server_default="invited")  # invited | member | declined
    invited_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ChatClear(Base):
    """"Delete chat": this member doesn't see this conversation's messages up to `up_to` (a chat_messages.id) any more."""

    __tablename__ = "chat_clears"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    topic: Mapped[str] = mapped_column(String(200), primary_key=True)
    up_to: Mapped[int] = mapped_column(BigInteger, nullable=False)
    cleared_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ChatPin(Base):
    """A message this member pinned in a conversation. Personal: the other people don't see it (like starring)."""

    __tablename__ = "chat_pins"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    topic: Mapped[str] = mapped_column(String(200), primary_key=True)
    message_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)  # chat_messages.id
    pinned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
