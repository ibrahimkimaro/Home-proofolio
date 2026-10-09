"""Admin > Messages: write to members by in-app notification, SMS or email, and see who it reached."""
import asyncio
import uuid
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import AsyncSessionLocal, get_db
from app.models.activity import Broadcast, Notification
from app.models.user import User
from app.services import mailer, realtime
from app.services.activity import notify
from app.services.platform import audit

router = APIRouter(prefix="/admin/broadcasts", tags=["admin"], dependencies=[Depends(require_admin)])

Channel = Literal["in_app", "sms", "email"]
# "selected" = exactly the members the admin picked (user_ids). The others are whole groups of members.
Segment = Literal["all", "active", "unactivated", "selected"]


class Audience(BaseModel):
    channel: Channel
    segment: Segment = "all"
    user_ids: list[uuid.UUID] = Field(default_factory=list, max_length=500)


class BroadcastIn(Audience):
    subject: str = Field(default="", max_length=160)
    body: str = Field(min_length=1, max_length=2000)


async def _recipients(db: AsyncSession, channel: str, segment: str, user_ids: list[uuid.UUID] | None = None) -> list[User]:
    """Who a message goes to. Guests (visitors who only used the support chat) are never members: never included."""
    q = select(User).where(User.is_active, User.is_guest.is_(False)).order_by(User.created_at)
    if segment == "selected":
        q = q.where(User.id.in_(user_ids or []))
    elif segment == "active":
        q = q.where(User.otp_pending == False)  # noqa: E712
    elif segment == "unactivated":
        q = q.where(User.otp_pending == True)  # noqa: E712
    if channel == "sms":
        q = q.where(User.phone_number.is_not(None), User.phone_number != "")
    return list((await db.execute(q)).scalars())


def _contact(u: User, channel: str) -> dict:
    return {"name": u.fullname, "username": u.username, "phone": u.phone_number, "email": u.email,
            "to": u.phone_number if channel == "sms" else u.email}


async def _deliver_email(broadcast_id: uuid.UUID, mails: list[mailer.Mail]) -> None:
    """Send an email message in the background (it can take a while), then record how it went."""
    results = await asyncio.to_thread(mailer.send_many, mails)
    failed = sum(1 for r in results if r)
    async with AsyncSessionLocal() as db:
        b = await db.get(Broadcast, broadcast_id)
        if b:
            b.failed = failed
            b.delivery = "failed" if failed == len(mails) else "partial" if failed else "sent"
            await db.commit()


@router.get("/capabilities")
async def capabilities():
    """What this server can send by itself. Email needs SMTP_* in .env; otherwise it stays a manual export."""
    return {"email": mailer.configured()}


@router.post("/preview")
async def preview(payload: Audience, db: AsyncSession = Depends(get_db)):
    people = await _recipients(db, payload.channel, payload.segment, payload.user_ids)
    return {"count": len(people), "sample": [_contact(u, payload.channel) for u in people[:5]]}


@router.get("/people")
async def find_people(q: str = Query("", max_length=80), db: AsyncSession = Depends(get_db)):
    """Members to pick from when a message goes to chosen people (never guests)."""
    stmt = select(User).where(User.is_active, User.is_guest.is_(False)).order_by(User.fullname).limit(25)
    if term := q.strip():
        like = f"%{term}%"
        stmt = stmt.where(or_(User.fullname.ilike(like), User.username.ilike(like), User.email.ilike(like)))
    return [{"id": u.id, "name": u.fullname, "username": u.username, "email": u.email} for u in (await db.execute(stmt)).scalars()]


@router.post("", status_code=status.HTTP_201_CREATED)
async def send_broadcast(
    payload: BroadcastIn, background: BackgroundTasks, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    if payload.channel != "sms" and not payload.subject.strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Add a title")
    if payload.segment == "selected" and not payload.user_ids:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Choose who to send it to")
    people = await _recipients(db, payload.channel, payload.segment, payload.user_ids)
    if not people:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Nobody matches this group")

    # Email goes out by itself when SMTP is set up; SMS has no service yet, so the admin sends it from the list.
    email_live = payload.channel == "email" and mailer.configured()
    delivery = "delivered" if payload.channel == "in_app" else "sending" if email_live else "manual"
    b = Broadcast(admin_id=admin.id, channel=payload.channel, segment=payload.segment, subject=payload.subject.strip(),
                  body=payload.body.strip(), recipients=len(people), delivery=delivery,
                  user_ids=[str(u.id) for u in people] if payload.segment == "selected" else None)
    db.add(b)
    await db.flush()  # the id, so each member's notification can point back at this message

    if payload.channel == "in_app":
        for u in people:
            notify(db, u.id, "broadcast", payload.subject.strip(), payload.body.strip(), broadcast_id=b.id)
    audit(db, admin, "broadcast.send", payload.channel, segment=payload.segment, recipients=len(people))
    broadcast_id = b.id
    await db.commit()

    if email_live:  # after the reply: sending hundreds of emails takes a while
        background.add_task(_deliver_email, broadcast_id,
                            [mailer.Mail(u.email, u.fullname, payload.subject, payload.body) for u in people])

    if payload.channel == "in_app":  # light up their bells now instead of at the next refresh (best effort)
        await realtime.push([realtime.to_user(u.id, "notifications_changed") for u in people])
    return {
        "id": broadcast_id,
        "delivery": delivery,
        "recipients": len(people),
        "contacts": [] if payload.channel == "in_app" or email_live else [_contact(u, payload.channel) for u in people],
    }


@router.get("")
async def history(db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Broadcast, User.fullname).outerjoin(User, User.id == Broadcast.admin_id).order_by(Broadcast.created_at.desc()).limit(100)
        )
    ).all()
    # How far each in-app message got: how many reached a device, how many were read.
    ids = [b.id for b, _ in rows]
    stats = {}
    if ids:
        agg = await db.execute(
            select(Notification.broadcast_id, func.count(), func.count(Notification.delivered_at), func.count(Notification.read_at))
            .where(Notification.broadcast_id.in_(ids))
            .group_by(Notification.broadcast_id)
        )
        stats = {bid: (total, delivered, read) for bid, total, delivered, read in agg.all()}
    out = []
    for b, name in rows:
        total, delivered, read = stats.get(b.id, (0, 0, 0))
        out.append({
            "id": b.id, "channel": b.channel, "segment": b.segment, "subject": b.subject, "body": b.body,
            "recipients": b.recipients, "delivery": b.delivery, "sent_by": name, "created_at": b.created_at,
            "tracked": b.channel == "in_app", "delivered_count": delivered, "read_count": read, "failed": b.failed,
        })
    return out


@router.get("/{broadcast_id}/report")
async def report(broadcast_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Per person: sent, delivered (reached their device) or read, for an in-app message."""
    b = await db.get(Broadcast, broadcast_id)
    if not b:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message not found")
    if b.channel != "in_app":
        return {"tracked": False, "channel": b.channel, "recipients": []}
    rows = await db.execute(
        select(Notification, User)
        .join(User, User.id == Notification.user_id)
        .where(Notification.broadcast_id == broadcast_id)
        .order_by(User.fullname)
    )
    people = []
    for n, u in rows.all():
        state = "read" if n.read_at else "delivered" if n.delivered_at else "sent"
        people.append({"id": u.id, "name": u.fullname, "username": u.username, "status": state,
                       "delivered_at": n.delivered_at, "read_at": n.read_at})
    return {
        "tracked": True,
        "channel": b.channel,
        "total": len(people),
        "delivered": sum(1 for p in people if p["status"] in ("delivered", "read")),
        "read": sum(1 for p in people if p["status"] == "read"),
        "recipients": people,
    }


@router.get("/{broadcast_id}/contacts")
async def contacts(broadcast_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """The recipient list of a sent message, to export again for manual sending (SMS / email)."""
    b = await db.get(Broadcast, broadcast_id)
    if not b:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message not found")
    ids = [uuid.UUID(i) for i in (b.user_ids or [])]
    return [_contact(u, b.channel) for u in await _recipients(db, b.channel, b.segment, ids)]
