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
    inserted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
