from datetime import datetime, timedelta, timezone

from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import hash_session_token
from app.models.session import Session as SessionModel
from app.models.user import User
from app.services.activity import client_ip

SESSION_COOKIE_NAME = "session_token"

# New accounts are suspended (otp_pending) until a code is entered. An admin delivers each code
# by hand (Admin > Security); it waits up to UNSENT_TTL, then lives CODE_TTL from when it's marked sent.
# An account never activated within UNVERIFIED_TTL is deleted.
CODE_TTL = timedelta(minutes=15)
UNSENT_TTL = timedelta(hours=24)
UNVERIFIED_TTL = timedelta(days=7)


def otp_expired(user: User) -> bool:
    return user.otp_pending and user.created_at + UNVERIFIED_TTL < datetime.now(timezone.utc)


async def purge_unverified(db: AsyncSession) -> None:
    """Delete accounts never activated in time (FKs cascade). Frees their email/username."""
    await db.execute(
        delete(User).where(User.otp_pending, User.created_at < datetime.now(timezone.utc) - UNVERIFIED_TTL)
    )
    await db.commit()


def ensure_can_publish(user: User, visibility) -> None:
    """Suspended accounts can look around and keep private work, but nothing goes public."""
    if user.otp_pending and visibility in ("public", "unlisted"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Activate your account to publish. Go to Settings > Activate account.")


LAST_SEEN_EVERY = timedelta(minutes=5)


async def get_current_user(
    request: Request,
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not session_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    token_hash = hash_session_token(session_token)
    result = await db.execute(
        select(SessionModel).where(SessionModel.token_hash == token_hash)
    )
    session = result.scalar_one_or_none()
    if session is None or session.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired or invalid")

    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == session.user_id)
    )
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    if otp_expired(user):
        await db.execute(delete(User).where(User.id == user.id))
        await db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "This account was never activated and has been deleted.")

    # Devices list (Settings, Admin): when and from where each session was last used.
    now = datetime.now(timezone.utc)
    if session.last_seen_at is None or now - session.last_seen_at > LAST_SEEN_EVERY:
        session.last_seen_at = now
        session.ip = client_ip(request) or session.ip
        await db.commit()

    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return current_user


async def get_optional_user(
    request: Request,
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """The signed-in user, or None for visitors. Never raises for missing/expired sessions."""
    try:
        return await get_current_user(request, session_token, db)
    except HTTPException:
        return None
