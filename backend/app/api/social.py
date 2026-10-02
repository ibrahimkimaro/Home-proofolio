"""S6: follow, watch (FR-SOC-01/02) and public search (FR-DISC-01, NFR-10)."""
import base64
import hashlib
import hmac
import json
import time
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import String, and_, cast, delete, func, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_optional_user
from app.core.config import settings
from app.core.database import get_db
from app.core.files import sign
from app.core.visibility import business_visible, link_visible_work, profile_visible
from app.models.business import Business, Follow, Watch
from app.models.profile import Profile, Visibility
from app.models.user import User
from app.models.work import WorkItem
from app.services.activity import notify

router = APIRouter(tags=["social"])

Target = Literal["user", "business", "work"]


async def _resolve(db: AsyncSession, kind: Target, key: str):
    """Find a follow/watch target a visitor is allowed to see; 404 otherwise."""
    if kind == "user":
        p = await db.scalar(select(Profile).where(func.lower(Profile.username) == key.lower()))
        if not profile_visible(p):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
        return p.user_id
    if kind == "business":
        b = await db.scalar(select(Business).where(Business.slug == key.lower()))
        if not business_visible(b):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
        return b.id
    try:
        w = await db.scalar(link_visible_work(uuid.UUID(key)))
    except ValueError:
        w = None
    if w is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return w.id


def _where(kind: Target, target_id: uuid.UUID, user_id: uuid.UUID):
    if kind == "work":
        return (Watch.user_id == user_id) & (Watch.work_id == target_id)
    col = Follow.user_id if kind == "user" else Follow.business_id
    return (Follow.follower_id == user_id) & (col == target_id)


@router.get("/social/{kind}/{key}")
async def social_status(kind: Target, key: str, viewer: User | None = Depends(get_optional_user), db: AsyncSession = Depends(get_db)):
    target = await _resolve(db, kind, key)
    model = Watch if kind == "work" else Follow
    active = bool(viewer) and bool(await db.scalar(select(func.count()).select_from(model).where(_where(kind, target, viewer.id))))
    is_self = bool(viewer) and kind == "user" and target == viewer.id
    return {"active": active, "signed_in": viewer is not None, "self": is_self}


@router.put("/social/{kind}/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def follow_or_watch(kind: Target, key: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Creates only the follow/watch — never a professional association (BR-05)."""
    target = await _resolve(db, kind, key)
    if kind == "user" and target == user.id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "You can't follow yourself")
    model = Watch if kind == "work" else Follow
    if await db.scalar(select(func.count()).select_from(model).where(_where(kind, target, user.id))):
        return
    if kind == "work":
        db.add(Watch(user_id=user.id, work_id=target))
    else:
        db.add(Follow(follower_id=user.id, **({"user_id": target} if kind == "user" else {"business_id": target})))
    if kind == "user":
        name = (user.profile.display_name if user.profile else None) or user.username
        notify(db, target, "follow", f"{name} started following you", None, f"/u/{user.username}")
    await db.commit()


@router.delete("/social/{kind}/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow(kind: Target, key: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    target = await _resolve(db, kind, key)
    await db.execute(delete(Watch if kind == "work" else Follow).where(_where(kind, target, user.id)))
    await db.commit()


@router.get("/search")
async def search(
    q: str = Query("", max_length=100),
    type: Literal["all", "people", "work", "businesses", "skills"] = "all",
    db: AsyncSession = Depends(get_db),
):
    """Public items only. Unlisted and private are never searched (NFR-10, rule 3)."""
    term = f"%{q.strip()}%"
    listed_profile = Profile.visibility == Visibility.PUBLIC
    out: dict = {}

    if type in ("all", "people"):
        rows = await db.execute(
            select(Profile).where(listed_profile, or_(Profile.display_name.ilike(term), Profile.username.ilike(term), Profile.headline.ilike(term)))
            .order_by(Profile.updated_at.desc()).limit(20)
        )
        out["people"] = [
            {"username": p.username, "display_name": p.display_name, "headline": p.headline, "avatar_url": sign(p.avatar_url) if p.avatar_url else None}
            for p in rows.scalars()
        ]

    public_work = and_(WorkItem.visibility == Visibility.PUBLIC, WorkItem.work_type != "capture", listed_profile)
    if type in ("all", "work"):
        rows = await db.execute(
            select(WorkItem, Profile).join(Profile, Profile.user_id == WorkItem.user_id)
            .where(public_work, or_(WorkItem.title.ilike(term), WorkItem.description.ilike(term), cast(WorkItem.skills, String).ilike(term)))
            .order_by(WorkItem.updated_at.desc()).limit(20)
        )
        out["work"] = [
            {"id": str(w.id), "title": w.title, "kind": w.work_type, "status": w.status, "skills": w.skills,
             "proofs": sum(1 for e in (w.evidence_links or []) if e.get("visibility", "public") == "public"),
             "owner": {"username": p.username, "display_name": p.display_name}}
            for w, p in rows.all()
        ]

    if type in ("all", "businesses"):
        rows = await db.execute(
            select(Business).where(Business.visibility == Visibility.PUBLIC, or_(Business.name.ilike(term), Business.description.ilike(term)))
            .order_by(Business.updated_at.desc()).limit(20)
        )
        out["businesses"] = [{"slug": b.slug, "name": b.name, "type": b.type, "description": b.description} for b in rows.scalars()]

    if type in ("all", "skills"):
        skill = func.jsonb_array_elements_text(WorkItem.skills).table_valued("value").alias("skill")
        rows = await db.execute(
            select(skill.c.value, func.count())
            .select_from(WorkItem).join(Profile, Profile.user_id == WorkItem.user_id).join(skill, true())
            .where(public_work, skill.c.value.ilike(term))
            .group_by(skill.c.value).order_by(func.count().desc()).limit(20)
        )
        out["skills"] = [{"name": n, "works": c} for n, c in rows.all()]
    return out


CHAT_TOKEN_TTL = 3600  # the chat page refreshes it every 30 minutes


@router.get("/chat/token")
async def get_chat_token(viewer: User = Depends(get_current_user)):
    """Short-lived identity for the realtime chat socket (verified in realtime_chat UserSocket.verify/1)."""
    name = (viewer.profile.display_name if viewer.profile and viewer.profile.display_name else viewer.fullname) or viewer.username
    claims = {"sub": str(viewer.id), "name": name, "username": viewer.username, "admin": viewer.is_admin, "exp": int(time.time()) + CHAT_TOKEN_TTL}
    part = base64.urlsafe_b64encode(json.dumps(claims).encode()).rstrip(b"=").decode()
    sig = hmac.new(settings.secret_key.encode(), f"chat.{part}".encode(), hashlib.sha256).digest()
    return {"token": f"{part}.{base64.urlsafe_b64encode(sig).rstrip(b'=').decode()}"}


@router.get("/chat/contacts")
async def get_chat_contacts(
    viewer: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns real registered members from the database as chat contacts."""
    rows = await db.execute(
        select(User, Profile)
        .outerjoin(Profile, Profile.user_id == User.id)
        .where(User.is_active.is_(True), User.id != viewer.id)
        .order_by(User.created_at.desc())
        .limit(100)
    )
    contacts = []
    viewer_id_str = str(viewer.id)
    for u, p in rows.all():
        target_id_str = str(u.id)
        pair_id = "_".join(sorted([viewer_id_str, target_id_str]))
        name = (p.display_name if p and p.display_name else u.fullname) or u.username
        role = (p.headline if p and p.headline else "Proofolio Member")
        avatar = sign(p.avatar_url) if (p and p.avatar_url) else None
        contacts.append({
            "id": target_id_str,
            "name": name,
            "username": u.username,
            "role": role,
            "avatar": avatar,
            "type": "direct",
            "pairId": pair_id,
            "isOnline": False,
        })
    return contacts
