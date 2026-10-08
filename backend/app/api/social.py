"""S6: follow, watch (FR-SOC-01/02) and public search (FR-DISC-01, NFR-10)."""
import base64
import hashlib
import hmac
import json
import time
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import String, and_, cast, delete, func, or_, select, text, true
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
    type: Literal["all", "people", "work", "businesses", "skills", "discussions"] = "all",
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

    if type in ("all", "discussions"):
        from app.models.discussion import Discussion, DiscussionReply, DiscussionVote
        d_rows = (await db.execute(
            select(Discussion, User, Profile)
            .join(User, User.id == Discussion.user_id)
            .outerjoin(Profile, Profile.user_id == User.id)
            .where(Discussion.access_type == "open", or_(Discussion.title.ilike(term), Discussion.content.ilike(term), cast(Discussion.tags, String).ilike(term)))
            .order_by(Discussion.created_at.desc()).limit(20)
        )).all()
        disc_list = []
        for disc, usr, prof in d_rows:
            author_name = (prof.display_name if prof and prof.display_name else usr.fullname) or usr.username
            reply_c = await db.scalar(select(func.count(DiscussionReply.id)).where(DiscussionReply.discussion_id == disc.id)) or 0
            vote_c = await db.scalar(select(func.count(DiscussionVote.id)).where(DiscussionVote.discussion_id == disc.id)) or 0
            disc_list.append({
                "id": str(disc.id),
                "title": disc.title,
                "content": disc.content[:200] + ("..." if len(disc.content) > 200 else ""),
                "category": disc.category,
                "tags": disc.tags,
                "created_at": disc.created_at.isoformat(),
                "replies": reply_c,
                "upvotes": vote_c,
                "author": {
                    "name": author_name,
                    "username": usr.username,
                    "avatar": sign(prof.avatar_url) if prof and prof.avatar_url else None,
                }
            })
        out["discussions"] = disc_list

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
    mode: str = Query("conversations", description="'conversations' for active threads, 'all' or 'search' to find members"),
    search: str | None = Query(None, description="Optional search filter"),
    viewer: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Real chat contacts endpoint.
    - Default ('conversations'): Returns ONLY active direct message threads for the current user with
      last message, timestamp, and unread counts. Strictly filters out guest accounts.
    - 'all' or 'search': Searches registered platform members (excluding guests and self).
    """
    viewer_id_str = str(viewer.id)

    # 1. Search / Discover mode
    if mode in ("all", "search") or (search and search.strip()):
        term = f"%{search.strip()}%" if search and search.strip() else None
        stmt = (
            select(User, Profile)
            .outerjoin(Profile, Profile.user_id == User.id)
            .where(
                User.is_active.is_(True),
                User.is_guest.is_(False),
                User.id != viewer.id,
            )
        )
        if term:
            stmt = stmt.where(
                or_(
                    User.fullname.ilike(term),
                    User.username.ilike(term),
                    Profile.display_name.ilike(term),
                )
            )
        stmt = stmt.order_by(User.fullname.asc()).limit(30)
        rows = await db.execute(stmt)
        contacts = []
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

    # 2. Conversations mode (active threads only)
    query = text("""
        WITH latest_msgs AS (
          SELECT DISTINCT ON (CASE WHEN author_id = :viewer_id THEN recipient_id ELSE author_id END)
            CASE WHEN author_id = :viewer_id THEN recipient_id ELSE author_id END AS peer_id,
            CASE WHEN deleted_at IS NOT NULL THEN 'This message was deleted' ELSE body END AS body,
            inserted_at,
            topic
          FROM chat_messages
          WHERE (author_id = :viewer_id OR recipient_id = :viewer_id)
            AND topic LIKE 'direct:%'
            -- what this member cleared with "Delete chat" is gone for them (the chat returns with the next message)
            AND id > COALESCE((SELECT up_to FROM chat_clears cc WHERE cc.user_id = :viewer_id AND cc.topic = chat_messages.topic), 0)
          ORDER BY CASE WHEN author_id = :viewer_id THEN recipient_id ELSE author_id END, id DESC
        ),
        unread_counts AS (
          SELECT author_id AS peer_id, COUNT(*) AS unread_count
          FROM chat_messages
          WHERE recipient_id = :viewer_id AND read_at IS NULL AND deleted_at IS NULL
            AND id > COALESCE((SELECT up_to FROM chat_clears cc WHERE cc.user_id = :viewer_id AND cc.topic = chat_messages.topic), 0)
          GROUP BY author_id
        )
        SELECT 
          u.id,
          u.fullname,
          u.username,
          p.display_name,
          p.headline,
          p.avatar_url,
          lm.body AS last_message,
          lm.inserted_at AS last_message_time,
          COALESCE(uc.unread_count, 0) AS unread_count
        FROM latest_msgs lm
        JOIN users u ON u.id = lm.peer_id
        LEFT JOIN profiles p ON p.user_id = u.id
        LEFT JOIN unread_counts uc ON uc.peer_id = lm.peer_id
        WHERE u.is_active = TRUE AND u.is_guest = FALSE
        ORDER BY lm.inserted_at DESC
        LIMIT 50;
    """)
    result = await db.execute(query, {"viewer_id": viewer.id})
    contacts = []
    for row in result.mappings():
        target_id_str = str(row["id"])
        pair_id = "_".join(sorted([viewer_id_str, target_id_str]))
        name = row["display_name"] or row["fullname"] or row["username"]
        role = row["headline"] or "Proofolio Member"
        avatar = sign(row["avatar_url"]) if row["avatar_url"] else None

        last_time_raw = row["last_message_time"]
        last_time_str = last_time_raw.isoformat() if hasattr(last_time_raw, "isoformat") else str(last_time_raw)

        contacts.append({
            "id": target_id_str,
            "name": name,
            "username": row["username"],
            "role": role,
            "avatar": avatar,
            "type": "direct",
            "pairId": pair_id,
            "isOnline": False,
            "lastMessage": row["last_message"],
            "lastMessageTime": last_time_str,
            "unreadCount": int(row["unread_count"]),
        })
    return contacts


@router.get("/chat/search-members")
async def search_chat_members(
    q: str = Query("", description="Query string to search members"),
    limit: int = Query(20, ge=1, le=50),
    viewer: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search registered non-guest members to start a new chat."""
    viewer_id_str = str(viewer.id)
    stmt = (
        select(User, Profile)
        .outerjoin(Profile, Profile.user_id == User.id)
        .where(
            User.is_active.is_(True),
            User.is_guest.is_(False),
            User.id != viewer.id,
        )
    )
    clean_q = q.strip()
    if clean_q:
        term = f"%{clean_q}%"
        stmt = stmt.where(
            or_(
                User.fullname.ilike(term),
                User.username.ilike(term),
                Profile.display_name.ilike(term),
            )
        )
    stmt = stmt.order_by(User.fullname.asc()).limit(limit)
    rows = await db.execute(stmt)
    results = []
    for u, p in rows.all():
        target_id_str = str(u.id)
        pair_id = "_".join(sorted([viewer_id_str, target_id_str]))
        name = (p.display_name if p and p.display_name else u.fullname) or u.username
        role = (p.headline if p and p.headline else "Proofolio Member")
        avatar = sign(p.avatar_url) if (p and p.avatar_url) else None
        results.append({
            "id": target_id_str,
            "name": name,
            "username": u.username,
            "role": role,
            "avatar": avatar,
            "type": "direct",
            "pairId": pair_id,
            "isOnline": False,
        })
    return results

