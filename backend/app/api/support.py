"""Live support: a member talks to an admin over the normal realtime DM; the admin works it from Admin > Support."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.models.chat import ChatMessage
from app.models.user import User

router = APIRouter(tags=["support"])


def _topic(a: User, b: User) -> str:
    return "direct:" + "_".join(sorted([str(a.id), str(b.id)]))


@router.get("/support/agent")
async def support_agent(viewer: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """The admin who answers support: the longest-standing active admin. ponytail: one agent, add routing when there are several."""
    admin = await db.scalar(select(User).where(User.is_admin, User.is_active).order_by(User.created_at).limit(1))
    if not admin or admin.id == viewer.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Support is not available right now")
    return {"id": str(admin.id), "name": "Home Proofolio Support", "topic": _topic(viewer, admin)}


@router.get("/admin/support")
async def support_threads(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Members who wrote to this admin: newest first, with unread counts. These are messages sent TO the admin."""
    rows = await db.execute(
        select(ChatMessage).where(ChatMessage.topic.like("direct:%"), (ChatMessage.author_id == admin.id) | (ChatMessage.recipient_id == admin.id))
        .order_by(ChatMessage.id.desc()).limit(500)
    )
    threads: dict[str, dict] = {}
    for m in rows.scalars():
        uid = str(m.author_id if m.author_id != admin.id else m.recipient_id)
        t = threads.setdefault(uid, {"topic": m.topic, "user_id": uid, "name": None, "username": None, "last": m.body[:140],
                                     "last_at": m.inserted_at, "unread": 0, "from_member": m.author_id != admin.id})
        if m.author_id != admin.id:
            t["name"], t["username"] = t["name"] or m.author_name, t["username"] or m.author_username
            if m.read_at is None:
                t["unread"] += 1
    missing = [u for u, t in threads.items() if not t["name"]]
    if missing:
        for u in (await db.execute(select(User).where(User.id.in_(missing)))).scalars():
            threads[str(u.id)].update(name=u.fullname, username=u.username)
    return list(threads.values())
