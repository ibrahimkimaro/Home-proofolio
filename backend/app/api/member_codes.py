"""Codes an admin sent a signed-in member (2FA sign-in, password change, phone verification...): list and verify.

Account activation has its own flow (auth.py: /auth/verify-account). These are for everything else, so a member
who is already active still gets a banner with an "Enter code" button, like at sign-up."""
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin import _PURPOSES
from app.api.deps import get_current_user
from app.core import throttle
from app.core.database import get_db
from app.models.otp import OtpLog
from app.models.user import User
from app.services.activity import record

router = APIRouter(prefix="/me/codes", tags=["codes"])


class CodeOut(BaseModel):
    id: uuid.UUID
    purpose: str
    label: str
    channel: str
    destination: str  # masked
    expires_in_seconds: int


class VerifyIn(BaseModel):
    code: str = Field(min_length=4, max_length=10)


def _mask(destination: str, channel: str) -> str:
    if channel == "email":
        name, _, domain = destination.partition("@")
        return f"{name[:1]}•••@{domain}"
    digits = "".join(c for c in destination if c.isdigit())
    return f"•••• {digits[-3:]}"


async def _live(db: AsyncSession, user: User) -> list[OtpLog]:
    """Codes that were sent to this member, aren't used and haven't expired. (A suspended account's own
    activation code is handled by the activation dialog, so it isn't listed twice.)"""
    now = datetime.now(timezone.utc)
    rows = (
        await db.execute(
            select(OtpLog)
            .where(OtpLog.user_id == user.id, OtpLog.is_verified.is_(False), OtpLog.expires_at > now, OtpLog.delivery_status == "sent")
            .order_by(OtpLog.created_at.desc())
        )
    ).scalars().all()
    return [o for o in rows if not (user.otp_pending and o.purpose in ("activation", "registration"))]


@router.get("", response_model=list[CodeOut])
async def my_codes(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    return [
        CodeOut(
            id=o.id, purpose=o.purpose, label=_PURPOSES.get(o.purpose, "Your code"), channel=o.channel,
            destination=_mask(o.destination, o.channel), expires_in_seconds=max(0, int((o.expires_at - now).total_seconds())),
        )
        for o in await _live(db, user)
    ]


@router.post("/verify")
async def verify_my_code(
    payload: VerifyIn, request: Request, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    """Check a code. Five wrong tries cancels the codes that are waiting; an admin sends a new one."""
    key = f"mcode:{user.id}"
    if wait := throttle.retry_after(key):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, f"Too many wrong tries. Try again in {max(1, wait // 60)} min.", headers={"Retry-After": str(wait)}
        )
    live = await _live(db, user)
    if not live:
        raise HTTPException(status.HTTP_410_GONE, "That code has expired. Ask for a new one.")
    entered = payload.code.strip()
    hit = next((o for o in live if secrets.compare_digest(o.code, entered)), None)
    if hit is None:
        throttle.fail(key)
        record(db, "otp_failed", request, user_id=user.id, email=user.email)
        if throttle.retry_after(key):
            throttle.clear(key)
            await db.execute(update(OtpLog).where(OtpLog.id.in_([o.id for o in live])).values(expires_at=datetime.now(timezone.utc)))
            record(db, "otp_cancelled", request, user_id=user.id, email=user.email)
            await db.commit()
            raise HTTPException(status.HTTP_410_GONE, "Too many wrong tries, so that code was cancelled. Ask for a new one.")
        await db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That code doesn't match. Check it and try again.")

    hit.is_verified = True
    hit.verified_at = datetime.now(timezone.utc)
    purpose = hit.purpose
    throttle.clear(key)
    await db.commit()
    return {"verified": True, "purpose": purpose, "label": _PURPOSES.get(purpose, "Your code")}
