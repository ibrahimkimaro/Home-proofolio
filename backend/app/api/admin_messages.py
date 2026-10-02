"""Admin > Messages: write to a group of members by in-app notification, SMS or email."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.activity import Broadcast
from app.models.user import User
from app.services.activity import notify
from app.services.platform import audit

router = APIRouter(prefix="/admin/broadcasts", tags=["admin"], dependencies=[Depends(require_admin)])

Channel = Literal["in_app", "sms", "email"]
Segment = Literal["all", "active", "unactivated"]


class Audience(BaseModel):
    channel: Channel
    segment: Segment = "all"


class BroadcastIn(Audience):
    subject: str = Field(default="", max_length=160)
    body: str = Field(min_length=1, max_length=2000)


async def _recipients(db: AsyncSession, channel: str, segment: str) -> list[User]:
    q = select(User).where(User.is_active).order_by(User.created_at)
    if segment == "active":
        q = q.where(User.otp_pending == False)  # noqa: E712
    elif segment == "unactivated":
        q = q.where(User.otp_pending == True)  # noqa: E712
    if channel == "sms":
        q = q.where(User.phone_number.is_not(None), User.phone_number != "")
    return list((await db.execute(q)).scalars())


def _contact(u: User, channel: str) -> dict:
    return {"name": u.fullname, "username": u.username, "phone": u.phone_number, "email": u.email,
            "to": u.phone_number if channel == "sms" else u.email}


@router.post("/preview")
async def preview(payload: Audience, db: AsyncSession = Depends(get_db)):
    people = await _recipients(db, payload.channel, payload.segment)
    return {"count": len(people), "sample": [_contact(u, payload.channel) for u in people[:5]]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def send_broadcast(payload: BroadcastIn, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if payload.channel != "sms" and not payload.subject.strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Add a title")
    people = await _recipients(db, payload.channel, payload.segment)
    if not people:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Nobody matches this group")

    if payload.channel == "in_app":
        for u in people:
            notify(db, u.id, "broadcast", payload.subject.strip(), payload.body.strip())
        delivery = "delivered"
    else:
        # No SMS/email service is connected yet: the admin sends these from the recipient list.
        # When one is connected, send here and set delivery = "sent".
        delivery = "manual"

    b = Broadcast(admin_id=admin.id, channel=payload.channel, segment=payload.segment, subject=payload.subject.strip(),
                  body=payload.body.strip(), recipients=len(people), delivery=delivery)
    db.add(b)
    audit(db, admin, "broadcast.send", payload.channel, segment=payload.segment, recipients=len(people))
    await db.commit()
    return {
        "id": b.id,
        "delivery": delivery,
        "recipients": len(people),
        "contacts": [] if payload.channel == "in_app" else [_contact(u, payload.channel) for u in people],
    }


@router.get("")
async def history(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(Broadcast, User.fullname).outerjoin(User, User.id == Broadcast.admin_id).order_by(Broadcast.created_at.desc()).limit(100)
    )
    return [
        {"id": b.id, "channel": b.channel, "segment": b.segment, "subject": b.subject, "body": b.body,
         "recipients": b.recipients, "delivery": b.delivery, "sent_by": name, "created_at": b.created_at}
        for b, name in rows.all()
    ]


@router.get("/{segment}/{channel}/contacts")
async def contacts(segment: Segment, channel: Channel, db: AsyncSession = Depends(get_db)):
    """The current recipient list for a group, to export again for manual sending."""
    return [_contact(u, channel) for u in await _recipients(db, channel, segment)]
