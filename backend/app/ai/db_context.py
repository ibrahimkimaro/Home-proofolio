from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.work import WorkItem

RECENT_LIMIT = 10  # sliding window: keep the prompt small however much data the user has


async def work_breakdown(db: AsyncSession, user_id) -> tuple[dict[str, int], dict[str, int]]:
    """({status: count}, {work_type: count}) for the user's own work items."""
    out = []
    for col in (WorkItem.status, WorkItem.work_type):
        rows = await db.execute(select(col, func.count()).where(WorkItem.user_id == user_id).group_by(col).order_by(func.count().desc()))
        out.append({k: n for k, n in rows.all()})
    return out[0], out[1]


async def recent_work(db: AsyncSession, user_id, limit: int = RECENT_LIMIT):
    return (
        await db.execute(
            select(WorkItem.title, WorkItem.work_type, WorkItem.status, WorkItem.occurred_on)
            .where(WorkItem.user_id == user_id)
            .order_by(WorkItem.created_at.desc())
            .limit(limit)
        )
    ).all()


async def user_work_context(db: AsyncSession, user_id) -> str:
    """The user's own work items as plain text. Scoped to user_id, read-only."""
    by_status, by_type = await work_breakdown(db, user_id)
    rows = await recent_work(db, user_id)
    lines = [f"- {t} [{k}, {s}{', ' + str(d) if d else ''}]" for t, k, s, d in rows]
    return (
        f"The user has {sum(by_status.values())} work items. By status: {by_status}. By type: {by_type}.\n"
        f"Most recent {len(rows)}:\n" + "\n".join(lines)
    )
