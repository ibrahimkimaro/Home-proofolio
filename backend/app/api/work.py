import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ensure_can_publish, get_current_user
from app.core.database import get_db
from app.models.profile import Visibility
from app.models.user import User
from app.models.work import WorkEvent, WorkItem, WorkTemplate
from app.schemas.work import WorkCreate, WorkOut, WorkUpdate
from app.services import history
from app.services.templates import validate_attributes

router = APIRouter(prefix="/works", tags=["work"])


class TemplateOut(BaseModel):
    key: str
    kind: str
    label: str
    description: str | None
    fields: list[dict]


templates_router = APIRouter(tags=["work"])


@templates_router.get("/templates", response_model=list[TemplateOut])
async def list_templates(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(WorkTemplate).where(WorkTemplate.active == True).order_by(WorkTemplate.kind, WorkTemplate.sort)  # noqa: E712
    )
    return rows.scalars().all()


async def _get_owned_work(work_id: uuid.UUID, user: User, db: AsyncSession) -> WorkItem:
    work = await db.get(WorkItem, work_id)
    if work is None or work.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Work item not found")
    return work


async def _clean(payload: WorkCreate, db: AsyncSession) -> dict:
    """Validate template + dynamic attributes against the stored definition (BR-12)."""
    data = payload.model_dump(exclude={"evidence_links"})
    fields: list[dict] = []
    if payload.work_type in ("work", "project") and payload.template:
        tpl = await db.get(WorkTemplate, payload.template)
        if tpl:
            fields = tpl.fields
    elif payload.work_type in ("learning", "achievement", "problem", "idea"):
        tpl = await db.get(WorkTemplate, payload.work_type)
        fields = tpl.fields if tpl else []
    elif payload.template:
        tpl = await db.get(WorkTemplate, payload.template)
        if tpl:
            fields = tpl.fields
    try:
        data["custom_attributes"] = validate_attributes(fields, payload.custom_attributes)
    except ValueError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e))
    data["skills"] = list(dict.fromkeys(s.strip() for s in payload.skills if s.strip()))[:30]
    data["evidence_links"] = [link.model_dump() for link in payload.evidence_links]
    return data


@router.get("", response_model=list[WorkOut])
async def list_my_work(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WorkItem).where(WorkItem.user_id == current_user.id).order_by(WorkItem.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=WorkOut, status_code=status.HTTP_201_CREATED)
async def create_work(payload: WorkCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ensure_can_publish(current_user, payload.visibility)
    work = WorkItem(user_id=current_user.id, **(await _clean(payload, db)))
    db.add(work)
    await db.flush()
    history.record(db, work, None)
    await db.commit()
    await db.refresh(work)
    return work


@router.get("/{work_id}", response_model=WorkOut)
async def get_work(work_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await _get_owned_work(work_id, current_user, db)


@router.patch("/{work_id}", response_model=WorkOut)
async def update_work(
    work_id: uuid.UUID,
    payload: WorkUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ensure_can_publish(current_user, payload.visibility)
    work = await _get_owned_work(work_id, current_user, db)
    before = history.snapshot(work)
    for key, value in (await _clean(payload, db)).items():
        setattr(work, key, value)
    history.record(db, work, before)
    await db.commit()
    await db.refresh(work)
    return work


@router.post("/{work_id}/turn-into-work", response_model=WorkOut, status_code=status.HTTP_201_CREATED)
async def turn_into_work(work_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """UC-11: an idea or learning item becomes a work item and stays linked to it."""
    source = await _get_owned_work(work_id, current_user, db)
    if source.work_type != "learning":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Only ideas and learning can be turned into work")
    before = history.snapshot(source)
    source.status = "turned_into_project"
    history.record(db, source, before)
    work = WorkItem(
        user_id=current_user.id,
        title=source.title,
        description=source.description,
        work_type="work",
        status="idea",
        visibility=Visibility.PRIVATE,
        skills=source.skills or [],
        source_id=source.id,
    )
    db.add(work)
    await db.flush()
    history.record(db, work, None)
    await db.commit()
    await db.refresh(work)
    return work


@router.delete("/{work_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_work(work_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    work = await _get_owned_work(work_id, current_user, db)
    await db.delete(work)
    await db.commit()


class TimelineEvent(BaseModel):
    work_id: uuid.UUID
    title: str
    kind: str
    field: str
    old_value: str | None
    new_value: str | None
    at: str


@router.get("/timeline/me", response_model=list[TimelineEvent])
async def my_timeline(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """FR-CAP-06: Journey as a timeline of dates, milestones and changes."""
    rows = await db.execute(
        select(WorkEvent, WorkItem.title, WorkItem.work_type)
        .join(WorkItem, WorkItem.id == WorkEvent.work_id)
        .where(WorkEvent.user_id == current_user.id)
        .order_by(WorkEvent.created_at.desc())
        .limit(300)
    )
    return [
        TimelineEvent(
            work_id=e.work_id, title=title, kind=kind, field=e.field,
            old_value=e.old_value, new_value=e.new_value, at=e.created_at.isoformat(),
        )
        for e, title, kind in rows.all()
    ]
