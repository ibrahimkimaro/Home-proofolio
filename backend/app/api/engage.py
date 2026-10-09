"""Engagement on MyPortfolio: stars, comments, CV requests and messages from visitors, and the owner's view of all of it.

A visitor needs an account to star or comment (the page sends them to sign in and brings them back). Asking for a CV and
leaving a message also work without an account (a name and an email are asked for). The owner is told about everything
in the bell (and by push when the site is closed), sees who did what per work in /me/engagement, and decides on each CV
request: send it (a share link goes to the person) or decline."""
import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.cv import _cv_row
from app.api.deps import get_current_user, get_optional_user
from app.core.config import settings
from app.core.database import get_db
from app.core.files import sign
from app.core.visibility import link_visible_work, profile_visible
from app.models.activity import Notification
from app.models.business import Follow, Watch
from app.models.cv import Cv
from app.models.engage import Comment, CvRequest, Like, VisitorMessage
from app.models.profile import Profile
from app.models.user import User
from app.models.work import WorkItem
from app.services import mailer, realtime, webpush
from app.services.activity import client_ip, notify

router = APIRouter(tags=["engage"])

Kind = Literal["profile", "work"]
COMMENT_MAX = 1000
RECENT = timedelta(hours=6)  # the same person starring the same thing again within this time doesn't alert again


def _clean(text: str | None, limit: int) -> str:
    return " ".join("".join(c for c in (text or "") if c.isprintable() or c in "\n").split())[:limit].strip()


async def _target(db: AsyncSession, kind: str, key: str) -> tuple[uuid.UUID, uuid.UUID, str, str]:
    """(owner id, target id, a name for notices, where it lives) for a profile or work a visitor may see; else 404."""
    if kind == "profile":
        p = await db.scalar(select(Profile).where(func.lower(Profile.username) == key.lower()))
        if not profile_visible(p):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
        return p.user_id, p.user_id, p.display_name, f"/u/{p.username}"
    try:
        w = await db.scalar(link_visible_work(uuid.UUID(key)))
    except ValueError:
        w = None
    owner = w and await db.scalar(select(Profile).where(Profile.user_id == w.user_id))
    if w is None or not profile_visible(owner):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return w.user_id, w.id, w.title, f"/w/{w.id}"


async def _people(db: AsyncSession, ids: set[uuid.UUID]) -> dict[uuid.UUID, dict]:
    if not ids:
        return {}
    rows = await db.execute(select(User, Profile).outerjoin(Profile, Profile.user_id == User.id).where(User.id.in_(ids)))
    out = {}
    for u, p in rows.all():
        out[u.id] = {
            "name": (p.display_name if p and p.display_name else u.fullname) or u.username,
            "username": None if u.is_guest else u.username,
            "avatar": sign(p.avatar_url) if p and p.avatar_url else None,
        }
    return out


def _who(people: dict, uid: uuid.UUID) -> dict:
    return people.get(uid) or {"name": "Former member", "username": None, "avatar": None}


async def _alert(user_id: uuid.UUID, title: str, body: str | None, url: str, tag: str) -> None:
    """After the commit: refresh the owner's bell live, and push to their phone or browser if the site is closed."""
    await realtime.push([realtime.to_user(user_id, "notifications_changed")])
    try:
        await webpush.push_to_users([user_id], {"title": title, "body": body or "", "url": url, "tag": tag}, tag)
    except Exception:  # an alert must never fail the action
        pass


async def _fresh(db: AsyncSession, owner: uuid.UUID, kind: str, title: str) -> bool:
    seen = await db.scalar(
        select(func.count()).select_from(Notification).where(
            Notification.user_id == owner, Notification.kind == kind, Notification.title == title, Notification.created_at > datetime.now(timezone.utc) - RECENT
        )
    )
    return not seen


def _comment_out(c: Comment, people: dict, viewer: User | None, owner_id: uuid.UUID) -> dict:
    mine = bool(viewer) and c.user_id == viewer.id
    return {
        "id": str(c.id),
        "body": c.body,
        "created_at": c.created_at.isoformat(),
        "author": _who(people, c.user_id),
        "mine": mine,
        "can_delete": mine or (bool(viewer) and (viewer.id == owner_id or viewer.is_admin)),
    }


# ---- public: stars and comments ----

@router.get("/engage/{kind}/{key}")
async def engage_status(kind: Kind, key: str, viewer: User | None = Depends(get_optional_user), db: AsyncSession = Depends(get_db)):
    owner, target, _, _ = await _target(db, kind, key)
    likes = await db.scalar(select(func.count()).select_from(Like).where(Like.target_kind == kind, Like.target_id == target)) or 0
    liked = bool(viewer) and bool(await db.scalar(select(func.count()).select_from(Like).where(Like.user_id == viewer.id, Like.target_kind == kind, Like.target_id == target)))
    rows = (await db.execute(select(Comment).where(Comment.target_kind == kind, Comment.target_id == target).order_by(Comment.created_at.desc()).limit(100))).scalars().all()
    total = await db.scalar(select(func.count()).select_from(Comment).where(Comment.target_kind == kind, Comment.target_id == target)) or 0
    starred = (await db.execute(select(Like.user_id).where(Like.target_kind == kind, Like.target_id == target).order_by(Like.created_at.desc()).limit(24))).scalars().all()
    people = await _people(db, {c.user_id for c in rows} | set(starred))
    return {
        "likes": likes,
        "stars": [_who(people, uid) for uid in starred],  # who starred it (latest 24), shown on the page
        "liked": liked,
        "signed_in": viewer is not None,
        "self": bool(viewer) and viewer.id == owner,
        "comment_count": total,
        "comments": [_comment_out(c, people, viewer, owner) for c in rows],
    }


@router.put("/engage/{kind}/{key}/like", status_code=status.HTTP_204_NO_CONTENT)
async def like(kind: Kind, key: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    owner, target, name, url = await _target(db, kind, key)
    if owner == user.id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "You can't star your own work")
    made = await db.execute(insert(Like).values(user_id=user.id, target_kind=kind, target_id=target).on_conflict_do_nothing().returning(Like.id))
    if made.first() is None:
        return
    who = (user.profile.display_name if user.profile else None) or user.fullname or user.username
    title = f"{who} starred your profile" if kind == "profile" else f"{who} starred \"{name}\""
    alert = await _fresh(db, owner, "like", title)
    if alert:
        notify(db, owner, "like", title, None, url)
    await db.commit()
    if alert:
        await _alert(owner, title, None, url, f"like-{target}")


@router.delete("/engage/{kind}/{key}/like", status_code=status.HTTP_204_NO_CONTENT)
async def unlike(kind: Kind, key: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    _, target, _, _ = await _target(db, kind, key)
    await db.execute(delete(Like).where(Like.user_id == user.id, Like.target_kind == kind, Like.target_id == target))
    await db.commit()


class CommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=COMMENT_MAX * 2)


@router.post("/engage/{kind}/{key}/comments", status_code=status.HTTP_201_CREATED)
async def add_comment(kind: Kind, key: str, payload: CommentIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    owner, target, name, url = await _target(db, kind, key)
    body = _clean(payload.body, COMMENT_MAX)
    if not body:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Write something first")
    recent = await db.scalar(select(func.count()).select_from(Comment).where(Comment.user_id == user.id, Comment.created_at > datetime.now(timezone.utc) - timedelta(minutes=1)))
    if (recent or 0) >= 6:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Slow down a little, then try again.")
    c = Comment(user_id=user.id, target_kind=kind, target_id=target, body=body)
    db.add(c)
    await db.flush()
    who = (user.profile.display_name if user.profile else None) or user.fullname or user.username
    title = f"{who} commented on your profile" if kind == "profile" else f"{who} commented on \"{name}\""
    if owner != user.id:
        notify(db, owner, "comment", title, body[:140], url)
    await db.commit()
    await db.refresh(c)
    if owner != user.id:
        await _alert(owner, title, body[:140], url, f"comment-{target}")
    people = await _people(db, {user.id})
    return _comment_out(c, people, user, owner)


@router.delete("/engage/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(comment_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    c = await db.get(Comment, comment_id)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found")
    owner = c.target_id if c.target_kind == "profile" else await db.scalar(select(WorkItem.user_id).where(WorkItem.id == c.target_id))
    if not (c.user_id == user.id or owner == user.id or user.is_admin):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can't remove this comment")
    await db.delete(c)
    await db.commit()


# ---- public: ask for the CV, leave a message ----

class AskIn(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    message: str | None = Field(default=None, max_length=1000)
    website: str | None = None  # honeypot: people leave it empty, bots fill it


async def _visible_owner(db: AsyncSession, username: str) -> Profile:
    p = await db.scalar(select(Profile).where(func.lower(Profile.username) == username.lower()))
    if not profile_visible(p):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return p


def _asker(payload: AskIn, viewer: User | None) -> tuple[str, str | None]:
    if viewer:
        return ((viewer.profile.display_name if viewer.profile else None) or viewer.fullname or viewer.username)[:100], viewer.email
    name = _clean(payload.name, 100)
    if len(name) < 2:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Please tell them your name")
    return name, str(payload.email).lower() if payload.email else None


@router.post("/u/{username}/cv-request", status_code=status.HTTP_201_CREATED)
async def ask_for_cv(username: str, payload: AskIn, request: Request, viewer: User | None = Depends(get_optional_user), db: AsyncSession = Depends(get_db)):
    p = await _visible_owner(db, username)
    if payload.website:
        return {"ok": True}  # a bot: look like success, store nothing
    if viewer and viewer.id == p.user_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "That is your own portfolio")
    name, email = _asker(payload, viewer)
    if not viewer and not email:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Add your email so they can send you the CV")
    ip = client_ip(request)
    if ip and (await db.scalar(select(func.count()).select_from(CvRequest).where(CvRequest.ip == ip, CvRequest.created_at > datetime.now(timezone.utc) - timedelta(hours=1))) or 0) >= 5:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests from here. Try again later.")
    same = CvRequest.requester_id == viewer.id if viewer else func.lower(CvRequest.email) == email
    if await db.scalar(select(func.count()).select_from(CvRequest).where(CvRequest.owner_id == p.user_id, CvRequest.status == "pending", same)):
        raise HTTPException(status.HTTP_409_CONFLICT, "You already asked. They will reply when they see it.")
    db.add(CvRequest(owner_id=p.user_id, requester_id=viewer.id if viewer else None, name=name, email=email, message=_clean(payload.message, 500) or None, ip=ip))
    title = f"{name} asked for your CV"
    notify(db, p.user_id, "cv_request", title, _clean(payload.message, 140) or "Open your portfolio to send it or decline.", "/portfolio#people")
    await db.commit()
    await _alert(p.user_id, title, "Send it or decline from your portfolio.", "/portfolio#people", "cv-request")
    return {"ok": True}


@router.post("/u/{username}/message", status_code=status.HTTP_201_CREATED)
async def leave_message(username: str, payload: AskIn, request: Request, viewer: User | None = Depends(get_optional_user), db: AsyncSession = Depends(get_db)):
    """For visitors without an account. Members chat instead (the page opens a chat with the owner)."""
    p = await _visible_owner(db, username)
    if payload.website:
        return {"ok": True}
    if viewer:
        raise HTTPException(status.HTTP_409_CONFLICT, "You are signed in: use Messages to chat with them directly")
    body = _clean(payload.message, 1000)
    if len(body) < 2:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Write your message first")
    name, email = _asker(payload, None)
    ip = client_ip(request)
    if ip and (await db.scalar(select(func.count()).select_from(VisitorMessage).where(VisitorMessage.ip == ip, VisitorMessage.created_at > datetime.now(timezone.utc) - timedelta(hours=1))) or 0) >= 5:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many messages from here. Try again later.")
    db.add(VisitorMessage(owner_id=p.user_id, name=name, email=email, body=body, ip=ip))
    title = f"{name} sent you a message"
    notify(db, p.user_id, "visitor_message", title, body[:140], "/portfolio#people")
    await db.commit()
    await _alert(p.user_id, title, body[:140], "/portfolio#people", "visitor-message")
    return {"ok": True}


# ---- the owner: CV requests, visitor messages, who engaged ----

def _request_out(r: CvRequest, usernames: dict, cv_ready: bool) -> dict:
    return {
        "id": str(r.id), "name": r.name, "email": r.email, "message": r.message, "status": r.status,
        "created_at": r.created_at.isoformat(), "member_username": usernames.get(r.requester_id), "cv_ready": cv_ready,
    }


@router.get("/me/cv-requests")
async def my_cv_requests(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(CvRequest).where(CvRequest.owner_id == user.id).order_by(CvRequest.created_at.desc()).limit(50))).scalars().all()
    ids = {r.requester_id for r in rows if r.requester_id}
    usernames = dict((await db.execute(select(User.id, User.username).where(User.id.in_(ids)))).all()) if ids else {}
    cv = await db.get(Cv, user.id)
    ready = bool(cv and cv.signature)
    return [_request_out(r, usernames, ready) for r in rows]


async def _mine(db: AsyncSession, user: User, request_id: uuid.UUID) -> CvRequest:
    r = await db.get(CvRequest, request_id)
    if r is None or r.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    return r


def _origin(request: Request) -> str:
    origin = request.headers.get("origin") or ""
    return origin.rstrip("/") if origin.startswith(("http://", "https://")) else settings.site_url.rstrip("/")


@router.post("/me/cv-requests/{request_id}/send")
async def send_cv(request_id: uuid.UUID, request: Request, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Say yes: the CV's share link goes to the person (the bell if they have an account, and email if we have one)."""
    r = await _mine(db, user, request_id)
    cv = await _cv_row(db, user)
    if not cv.signature:
        raise HTTPException(status.HTTP_409_CONFLICT, "Sign your CV first (Curriculum Vitae) so it can be shared")
    if not cv.share_token:
        import secrets

        cv.share_token = secrets.token_urlsafe(24)
    path = f"/cv/s/{cv.share_token}"
    link = f"{_origin(request)}{path}"
    r.status, r.decided_at = "sent", datetime.now(timezone.utc)
    me = (user.profile.display_name if user.profile else None) or user.fullname or user.username
    if r.requester_id:
        notify(db, r.requester_id, "cv_sent", f"{me} sent you their CV", "Tap to open it.", path)
    await db.commit()
    if r.requester_id:
        await _alert(r.requester_id, f"{me} sent you their CV", "Tap to open it.", path, f"cv-{r.id}")
    emailed = None
    if r.email and mailer.configured():
        text = f"Hello {r.name},\n\n{me} is happy to share their CV with you:\n{link}\n\n-- \nHome Proofolio"
        result = (await asyncio.to_thread(mailer.send_many, [mailer.Mail(to=r.email, name=r.name, subject=f"{me} sent you their CV", body="", text=text)]))[0]
        emailed = result is None
    return {"status": "sent", "link": link, "emailed": emailed}


@router.post("/me/cv-requests/{request_id}/decline")
async def decline_cv(request_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    r = await _mine(db, user, request_id)
    r.status, r.decided_at = "declined", datetime.now(timezone.utc)
    await db.commit()
    return {"status": "declined"}


@router.delete("/me/cv-requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cv_request(request_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    r = await _mine(db, user, request_id)
    await db.delete(r)
    await db.commit()


@router.get("/me/visitor-messages")
async def my_visitor_messages(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(VisitorMessage).where(VisitorMessage.owner_id == user.id).order_by(VisitorMessage.created_at.desc()).limit(50))).scalars().all()
    return [{"id": str(m.id), "name": m.name, "email": m.email, "body": m.body, "created_at": m.created_at.isoformat(), "read": m.read_at is not None} for m in rows]


@router.post("/me/visitor-messages/{message_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def read_visitor_message(message_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    m = await db.get(VisitorMessage, message_id)
    if m is None or m.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message not found")
    m.read_at = m.read_at or datetime.now(timezone.utc)
    await db.commit()


@router.delete("/me/visitor-messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_visitor_message(message_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    m = await db.get(VisitorMessage, message_id)
    if m is None or m.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message not found")
    await db.delete(m)
    await db.commit()


@router.get("/me/engagement")
async def my_engagement(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Who followed, starred and commented: on the profile and on each work, for easy tracking."""
    works = (await db.execute(select(WorkItem).where(WorkItem.user_id == user.id, WorkItem.work_type != "capture").order_by(WorkItem.created_at.desc()))).scalars().all()
    work_ids = [w.id for w in works]

    async def likes_of(kind: str, ids: list[uuid.UUID]):
        if not ids:
            return []
        return (await db.execute(select(Like).where(Like.target_kind == kind, Like.target_id.in_(ids)).order_by(Like.created_at.desc()))).scalars().all()

    async def comments_of(kind: str, ids: list[uuid.UUID]):
        if not ids:
            return []
        return (await db.execute(select(Comment).where(Comment.target_kind == kind, Comment.target_id.in_(ids)).order_by(Comment.created_at.desc()))).scalars().all()

    p_likes, w_likes = await likes_of("profile", [user.id]), await likes_of("work", work_ids)
    p_comments, w_comments = await comments_of("profile", [user.id]), await comments_of("work", work_ids)
    followers = (await db.execute(select(Follow).where(Follow.user_id == user.id).order_by(Follow.created_at.desc()))).scalars().all()
    watchers = (await db.execute(select(Watch).where(Watch.work_id.in_(work_ids)).order_by(Watch.created_at.desc()))).scalars().all() if work_ids else []

    ids = {x.user_id for x in (*p_likes, *w_likes, *p_comments, *w_comments, *watchers)} | {f.follower_id for f in followers}
    people = await _people(db, ids)

    def like_row(x: Like):
        return {**_who(people, x.user_id), "at": x.created_at.isoformat()}

    def comment_row(x: Comment):
        return {"id": str(x.id), **_who(people, x.user_id), "body": x.body, "at": x.created_at.isoformat()}

    per_work = []
    for w in works:
        wl, wc = [x for x in w_likes if x.target_id == w.id], [x for x in w_comments if x.target_id == w.id]
        ww = [x for x in watchers if x.work_id == w.id]
        per_work.append({
            "id": str(w.id), "title": w.title, "work_type": w.work_type, "visibility": getattr(w.visibility, "value", str(w.visibility)),
            "likes": [like_row(x) for x in wl][:50], "like_count": len(wl),
            "comments": [comment_row(x) for x in wc][:50], "comment_count": len(wc),
            "watchers": [{**_who(people, x.user_id), "at": x.created_at.isoformat()} for x in ww][:50], "watcher_count": len(ww),
        })
    pending = await db.scalar(select(func.count()).select_from(CvRequest).where(CvRequest.owner_id == user.id, CvRequest.status == "pending")) or 0
    unread = await db.scalar(select(func.count()).select_from(VisitorMessage).where(VisitorMessage.owner_id == user.id, VisitorMessage.read_at.is_(None))) or 0
    return {
        "totals": {
            "followers": len(followers), "profile_likes": len(p_likes), "profile_comments": len(p_comments),
            "work_likes": len(w_likes), "work_comments": len(w_comments), "watchers": len(watchers),
            "cv_pending": pending, "messages_unread": unread,
        },
        "profile": {"likes": [like_row(x) for x in p_likes][:50], "comments": [comment_row(x) for x in p_comments][:50]},
        "followers": [{**_who(people, f.follower_id), "at": f.created_at.isoformat()} for f in followers][:50],
        "works": per_work,
    }

