"""A member's Curriculum Vitae: the parts that aren't already on Proofolio.

Name, title, photo, about, work experience and skills come live from the profile, roles and work
items (app/api/cv.py builds them on every read), so the CV follows what the member adds or deletes.
Stored here: what only a CV needs (education, referees, languages, hobbies, links, extra jobs and
duty bullets, overrides), the signature that makes it valid, and the optional share link.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Cv(Base):
    __tablename__ = "cvs"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")  # app/api/cv.py CvData
    signature: Mapped[str | None] = mapped_column(Text, nullable=True)  # PNG data URL drawn by the member
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Unguessable link for sharing (/cv/s/<token>, QR code); None = not shared. Revoking makes a new one.
    share_token: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
