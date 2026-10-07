"""Live support: a member or guest visitor talks to an admin over realtime DM; the admin works it from Admin > Support."""
import base64
import hashlib
import hmac
import json
import time
import unicodedata
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.core.config import settings
from app.core.database import get_db
from app.models.chat import ChatClear, ChatMessage
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
    # Optional: only so we can follow up. It is never used to recognise or sign in a visitor.
    email: EmailStr | None = None


# A returning visit is one that starts more than this long after the last one (not every page load).
VISIT_GAP = timedelta(minutes=30)


def _clean_name(raw: str | None) -> str | None:
    """A name a person typed: tidy spaces, no control characters, at most 40 characters, needs a letter."""
    name = " ".join("".join(c for c in (raw or "") if c.isprintable()).split())[:40].strip()
    return name if any(c.isalpha() for c in name) else None


def _slug(name: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return "".join(c for c in ascii_name.lower() if c.isalnum())[:14] or "guest"


async def _unique_handle(db: AsyncSession, name: str | None, session_id: str) -> tuple[str, str]:
    """('amina-4f2k', '4F2K'): the guest's unique username and its short code, from their name and the session."""
    base = _slug(name) if name else "guest"
    code = hashlib.sha256(session_id.encode()).hexdigest()[:4]
    for attempt in range(8):
        suffix = code if attempt == 0 else uuid.uuid4().hex[:4]
        username = f"guest_{base}-{suffix}"
        if not await db.scalar(select(User.id).where(User.username == username)):
            return username, suffix.upper()
    return f"guest_{uuid.uuid4().hex[:12]}", uuid.uuid4().hex[:4].upper()


@router.post("/support/guest/init")
async def guest_support_init(payload: GuestInitRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Start or resume a guest's support chat. A guest is recognised by the id kept in their browser: with a name
    (and optionally an email) they get a unique handle, and when they come back they are greeted as a returning visitor."""
    admin = await db.scalar(
        select(User).where(User.is_admin, User.is_active).order_by(User.created_at).limit(1)
    )
    if not admin:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Support is not available right now")

    clean_session_id = "".join(c for c in payload.session_id if c.isalnum() or c in "-_")[:64]
    if len(clean_session_id) < 10:
        clean_session_id = uuid.uuid4().hex

    name = _clean_name(payload.display_name)
    if payload.display_name and not name:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Please enter your name")
    email = str(payload.email).lower() if payload.email else None
    now = datetime.now(timezone.utc)

    guest = await db.scalar(select(Guest).where(Guest.session_id == clean_session_id))
    returning = False
    previous_visit: datetime | None = None

    if guest:
        returning = True
        previous_visit = guest.last_seen_at
        guest_user = await db.scalar(select(User).where(User.id == guest.user_id))
        if not guest_user:
            # Handle orphaned guest record
            username, code = await _unique_handle(db, name or guest.name, clean_session_id)
            guest_user = User(
                id=guest.user_id,
                fullname=f"{name or guest.name} · G-{code}" if (name or guest.name) else f"Guest #{clean_session_id[:6].upper()}",
                username=username,
                email=f"{guest.user_id}@guest.proofolio.local",
                password_hash="GUEST_SHADOW_ACCOUNT",
                is_active=True,
                is_admin=False,
                is_guest=True,
            )
            db.add(guest_user)
        if name and name != guest.name:
            # They gave (or changed) their name: the admin sees it from now on. The unique code stays the same.
            code = hashlib.sha256(clean_session_id.encode()).hexdigest()[:4].upper()  # same code a new guest would get
            guest.name = name
            guest_user.fullname = f"{name} · G-{code}"
            profile = await db.scalar(select(Profile).where(Profile.user_id == guest_user.id))
            if profile:
                profile.display_name = name
        if email:
            guest.email = email
        if previous_visit is None or now - previous_visit > VISIT_GAP:
            guest.visits += 1
        guest.last_seen_at = func.now()
        guest.ip_address = client_ip(request)
        await db.commit()
    else:
        guest_user_id = uuid.uuid4()
        if name:
            resolved_username, code = await _unique_handle(db, name, clean_session_id)
            resolved_name = f"{name} · G-{code}"
        else:
            resolved_name = f"Guest #{clean_session_id[:6].upper()}"
            resolved_username = f"guest_{clean_session_id[:8].lower()}"
            if await db.scalar(select(User.id).where(User.username == resolved_username)):
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
            display_name=name or resolved_name,
            visibility=Visibility.PRIVATE,
        )
        db.add(guest_profile)

        guest = Guest(
            session_id=clean_session_id,
            user_id=guest_user_id,
            name=name,
            email=email,
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
        # What to call them: the name they gave, without the admin-facing code.
        "display_name": guest.name,
        "handle": guest_user.username,
        "returning": returning,
        "visits": guest.visits,
        "last_visit": previous_visit.isoformat() if previous_visit else None,
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
    # Threads the admin deleted for themselves ("Delete chat") stay gone until someone writes again.
    cleared = {t: up for t, up in (await db.execute(select(ChatClear.topic, ChatClear.up_to).where(ChatClear.user_id == admin.id))).all()}
    threads: dict[str, dict] = {}
    for m in rows.scalars():
        if m.id <= cleared.get(m.topic, 0):
            continue
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
