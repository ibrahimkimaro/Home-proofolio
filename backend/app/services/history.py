from sqlalchemy.ext.asyncio import AsyncSession

from app.models.work import WorkEvent, WorkItem

TRACKED = ("status", "visibility", "work_type")


def snapshot(work: WorkItem) -> dict[str, str]:
    return {f: _val(getattr(work, f)) for f in TRACKED}


def record(db: AsyncSession, work: WorkItem, before: dict[str, str] | None) -> None:
    """Append one event per changed field. before=None means the item was just created."""
    if before is None:
        db.add(WorkEvent(work_id=work.id, user_id=work.user_id, field="created", new_value=_val(work.work_type)))
        return
    for field, old in before.items():
        new = _val(getattr(work, field))
        if new != old:
            db.add(WorkEvent(work_id=work.id, user_id=work.user_id, field=field, old_value=old, new_value=new))


def _val(v) -> str:
    return getattr(v, "value", v)
