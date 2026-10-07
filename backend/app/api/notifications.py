"""The member's notification bell."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.activity import Notification
from app.models.user import User

router = APIRouter(prefix="/me/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    id: uuid.UUID
    kind: str
    title: str
    body: str | None
    link: str | None
    read: bool
    created_at: datetime


class NotificationsOut(BaseModel):
    unread: int
    items: list[NotificationOut]


class MarkRead(BaseModel):
    ids: list[uuid.UUID] | None = None  # None = all


@router.get("", response_model=NotificationsOut)
async def my_notifications(
    limit: int = Query(30, ge=1, le=100), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    unread = await db.scalar(
        select(func.count()).select_from(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None))
    )
    # Only what hasn't been read: once a notification is read it leaves the panel.
    rows = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id, Notification.read_at.is_(None))
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    items = list(rows.scalars())
    # Build the answer first: committing below expires these rows.
    out = [
        NotificationOut(id=n.id, kind=n.kind, title=n.title, body=n.body, link=n.link, read=False, created_at=n.created_at)
        for n in items
    ]
    # Showing it here is what "delivered" means: it reached the member's device. (Admins see this per person.)
    fresh = [n.id for n in items if n.delivered_at is None]
    if fresh:
        await db.execute(update(Notification).where(Notification.id.in_(fresh)).values(delivered_at=datetime.now(timezone.utc)))
        await db.commit()
    return NotificationsOut(unread=unread or 0, items=out)


@router.post("/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(payload: MarkRead, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    where = [Notification.user_id == user.id, Notification.read_at.is_(None)]
    if payload.ids is not None:
        where.append(Notification.id.in_(payload.ids))
    now = datetime.now(timezone.utc)
    await db.execute(update(Notification).where(*where).values(read_at=now, delivered_at=func.coalesce(Notification.delivered_at, now)))
    await db.commit()
