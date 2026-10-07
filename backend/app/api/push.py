"""Web Push: a member's devices subscribe here, and the chat server asks (internally) for a push to be sent."""
import hashlib
import hmac
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.push import PushSubscription
from app.models.user import User
from app.services import webpush

router = APIRouter(tags=["push"])

MAX_DEVICES = 10


class Keys(BaseModel):
    p256dh: str = Field(min_length=20, max_length=200)
    auth: str = Field(min_length=8, max_length=100)


class SubscribeIn(BaseModel):
    endpoint: str = Field(min_length=20, max_length=2000)
    keys: Keys


class UnsubscribeIn(BaseModel):
    endpoint: str = Field(min_length=20, max_length=2000)


@router.get("/push/key")
async def push_key():
    """The public key a browser needs to subscribe. Public by design (it identifies this server, it isn't a secret)."""
    return {"enabled": webpush.configured(), "public_key": settings.vapid_public_key if webpush.configured() else None}


@router.post("/me/push/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def subscribe(payload: SubscribeIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if not webpush.configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Notifications aren't set up on this server")
    if not webpush.endpoint_ok(payload.endpoint):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "That isn't a browser push address")
    existing = await db.scalar(select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint))
    if existing:
        # Same device, maybe a different member signed in now: it belongs to whoever subscribed last.
        existing.user_id, existing.p256dh, existing.auth = user.id, payload.keys.p256dh, payload.keys.auth
    else:
        db.add(PushSubscription(user_id=user.id, endpoint=payload.endpoint, p256dh=payload.keys.p256dh, auth=payload.keys.auth))
        # A member can have a handful of devices; the oldest ones go if they somehow add many.
        count = await db.scalar(select(func.count()).select_from(PushSubscription).where(PushSubscription.user_id == user.id))
        if (count or 0) >= MAX_DEVICES:
            old = (
                await db.execute(
                    select(PushSubscription.id).where(PushSubscription.user_id == user.id).order_by(PushSubscription.created_at).limit(count - MAX_DEVICES + 1)
                )
            ).scalars().all()
            await db.execute(delete(PushSubscription).where(PushSubscription.id.in_(old)))
    await db.commit()


@router.post("/me/push/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(payload: UnsubscribeIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await db.execute(delete(PushSubscription).where(PushSubscription.endpoint == payload.endpoint, PushSubscription.user_id == user.id))
    await db.commit()


@router.post("/me/push/test")
async def push_test(user: User = Depends(get_current_user)):
    """Send a test notification to this member's own devices, so they can see it works."""
    n = await webpush.push_to_users(
        [user.id],
        {"title": "Notifications are on", "body": "You'll hear from Home Proofolio here, even when the site is closed.", "url": "/settings", "tag": "test"},
        topic="test",
    )
    return {"sent": n}


# ---- the chat server (realtime_chat) asks for a push after a message is stored ----

def push_token() -> str:
    return hmac.new(settings.secret_key.encode(), b"internal-push", hashlib.sha256).hexdigest()


class InternalPush(BaseModel):
    user_ids: list[uuid.UUID] = Field(max_length=500)
    title: str = Field(max_length=120)
    body: str = Field(default="", max_length=300)
    url: str = Field(default="/chat", max_length=300)
    tag: str = Field(default="", max_length=120)


@router.post("/internal/push", status_code=status.HTTP_202_ACCEPTED)
async def internal_push(payload: InternalPush, background: BackgroundTasks, authorization: str | None = Header(default=None)):
    """Authorized by a token derived from SECRET_KEY, which browsers never get. Answers at once; sends in the background."""
    given = (authorization or "").removeprefix("Bearer ").strip()
    if not hmac.compare_digest(given, push_token()):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "unauthorized")
    if not webpush.configured():
        return {"queued": False}
    message = {"title": payload.title, "body": payload.body, "url": payload.url if payload.url.startswith("/") else "/chat", "tag": payload.tag}
    background.add_task(webpush.push_to_users, payload.user_ids, message, payload.tag or None)
    return {"queued": True}
