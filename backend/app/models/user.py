import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fullname: Mapped[str] = mapped_column(String(255), nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(default=False, nullable=False)
    # Signed up with a phone and hasn't entered the OTP yet; deleted if not verified in time.
    otp_pending: Mapped[bool] = mapped_column(default=False, server_default="false", nullable=False)
    # When the first activation code went out, +15 minutes. Past it, a still-unactivated account is suspended.
    activation_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Temporary unauthenticated visitor using guest support chat.
    is_guest: Mapped[bool] = mapped_column(default=False, server_default="false", nullable=False)
    # Per-member preferences (Settings), e.g. {"appearance": {...}} — synced across devices.
    preferences: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    @property
    def suspended(self) -> bool:
        """Not activated in time: only support (and entering a code) works until the account is activated."""
        return bool(self.otp_pending and self.activation_deadline and self.activation_deadline < datetime.now(timezone.utc))

    profile: Mapped["Profile"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    sessions: Mapped[list["Session"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    work_items: Mapped[list["WorkItem"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    otp_logs: Mapped[list["OtpLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")
