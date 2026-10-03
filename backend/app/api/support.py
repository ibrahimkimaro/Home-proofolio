"""Live support: a member or guest visitor talks to an admin over realtime DM; the admin works it from Admin > Support."""
import base64
import hashlib
import hmac
import json
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.core.config import settings
from app.core.database import get_db
from app.models.chat import ChatMessage
from app.models.guest import Guest
from app.models.profile import Profile, Visibility
from app.models.user import User
from app.services.activity import client_ip

router = APIRouter(tags=["support"])

CHAT_TOKEN_TTL = 3600  # 1 hour


def _topic(a_id: str | uuid.UUID, b_id: str | uuid.UUID) -> str:
    return "direct:" + "_".join(sorted([str(a_id), str(b_id)]))


def sign_chat_token(user_id: str, name: str, username: str, is_admin: bool = False) -> str:
    """Signs an HMAC-SHA256 chat token for Phoenix UserSocket verification."""
    claims = {
        "sub": str(user_id),
        "name": name,
        "username": username,
        "admin": is_admin,
        "exp": int(time.time()) + CHAT_TOKEN_TTL,
    }
    part = base64.urlsafe_b64encode(json.dumps(claims).encode()).rstrip(b"=").decode()
    sig = hmac.new(settings.secret_key.encode(), f"chat.{part}".encode(), hashlib.sha256).digest()
    return f"{part}.{base64.urlsafe_b64encode(sig).rstrip(b'=').decode()}"


class GuestInitRequest(BaseModel):
    session_id: str = Field(min_length=10, max_length=64)
    display_name: str | None = Field(default=None, max_length=100)


@router.post("/support/guest/init")
async def guest_support_init(payload: GuestInitRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Initializes or resumes a guest support session using a persistent session_id from localStorage."""
    admin = await db.scalar(
        select(User).where(User.is_admin, User.is_active).order_by(User.created_at).limit(1)
    )
    if not admin:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Support is not available right now")

    clean_session_id = "".join(c for c in payload.session_id if c.isalnum() or c in "-_")[:64]
    if len(clean_session_id) < 10:
        clean_session_id = uuid.uuid4().hex

    guest = await db.scalar(select(Guest).where(Guest.session_id == clean_session_id))

    if guest:
        guest_user = await db.scalar(select(User).where(User.id == guest.user_id))
        if not guest_user:
            # Handle orphaned guest record
            guest_user = User(
                id=guest.user_id,
                fullname=payload.display_name or f"Guest #{clean_session_id[:6].upper()}",
                username=f"guest_{clean_session_id[:8].lower()}",
                email=f"{guest.user_id}@guest.proofolio.local",
                password_hash="GUEST_SHADOW_ACCOUNT",
                is_active=True,
                is_admin=False,
                is_guest=True,
            )
            db.add(guest_user)
        guest.last_seen_at = func.now()
        guest.ip_address = client_ip(request)
        await db.commit()
    else:
        guest_user_id = uuid.uuid4()
        short_id = clean_session_id[:6].upper()
        resolved_name = (payload.display_name or "").strip() or f"Guest #{short_id}"
        resolved_username = f"guest_{clean_session_id[:8].lower()}"

        existing_username = await db.scalar(select(User).where(User.username == resolved_username))
        if existing_username:
            resolved_username = f"guest_{uuid.uuid4().hex[:8]}"

        guest_user = User(
            id=guest_user_id,
            fullname=resolved_name,
            username=resolved_username,
            email=f"{guest_user_id}@guest.proofolio.local",
            password_hash="GUEST_SHADOW_ACCOUNT",
            is_active=True,
            is_admin=False,
            is_guest=True,
        )
        db.add(guest_user)

        guest_profile = Profile(
            user_id=guest_user_id,
            username=resolved_username,
            display_name=resolved_name,
            visibility=Visibility.PRIVATE,
        )
        db.add(guest_profile)

        guest = Guest(
            session_id=clean_session_id,
            user_id=guest_user_id,
            ip_address=client_ip(request),
            user_agent=request.headers.get("user-agent"),
        )
        db.add(guest)
        await db.commit()

    topic = _topic(guest_user.id, admin.id)
    token = sign_chat_token(str(guest_user.id), guest_user.fullname, guest_user.username, is_admin=False)

    return {
        "guest_id": str(guest_user.id),
        "session_id": clean_session_id,
        "name": guest_user.fullname,
        "username": guest_user.username,
        "token": token,
        "agent": {
            "id": str(admin.id),
            "name": "Home Proofolio Support",
            "topic": topic,
        },
    }


@router.get("/support/agent")
async def support_agent(viewer: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """The admin who answers support: the longest-standing active admin."""
    admin = await db.scalar(
        select(User).where(User.is_admin, User.is_active, User.id != viewer.id).order_by(User.created_at).limit(1)
    )
    if not admin:
        admin = await db.scalar(select(User).where(User.is_admin, User.is_active).order_by(User.created_at).limit(1))
        if admin and admin.id == viewer.id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "You are an administrator. To view and answer member support chats, open Admin Console > Support.",
            )
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Support is not available right now")
    return {"id": str(admin.id), "name": "Home Proofolio Support", "topic": _topic(viewer.id, admin.id)}


@router.get("/admin/support")
async def support_threads(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Members and guests who wrote to this admin: newest first, with unread counts. These are messages sent TO the admin."""
    rows = await db.execute(
        select(ChatMessage).where(ChatMessage.topic.like("direct:%"), (ChatMessage.author_id == admin.id) | (ChatMessage.recipient_id == admin.id))
        .order_by(ChatMessage.id.desc()).limit(500)
    )
    threads: dict[str, dict] = {}
    for m in rows.scalars():
        uid = str(m.author_id if m.author_id != admin.id else m.recipient_id)
        t = threads.setdefault(uid, {
            "topic": m.topic,
            "user_id": uid,
            "name": None,
            "username": None,
            "last": m.body[:140],
            "last_at": m.inserted_at,
            "unread": 0,
            "from_member": m.author_id != admin.id,
            "is_guest": False,
        })
        if m.author_id != admin.id:
            t["name"], t["username"] = t["name"] or m.author_name, t["username"] or m.author_username
            if m.read_at is None:
                t["unread"] += 1

    user_ids = [uuid.UUID(u) for u in threads]
    if user_ids:
        for u in (await db.execute(select(User).where(User.id.in_(user_ids)))).scalars():
            threads[str(u.id)].update(
                name=threads[str(u.id)]["name"] or u.fullname,
                username=threads[str(u.id)]["username"] or u.username,
                is_guest=bool(getattr(u, "is_guest", False)),
            )
    return list(threads.values())
