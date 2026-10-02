"""Admin console: onboarding content, work templates, businesses, platform switches, audit log, analytics."""
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import Date, and_, cast, delete, distinct, func, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.business import Business, BusinessMember, Follow
from app.models.platform import AdminAction, OnboardingAnswer, OnboardingCategory, OnboardingQuestion, OnboardingRole
from app.models.profile import Profile, Visibility
from app.models.user import User
from app.models.work import WorkEvent, WorkItem, WorkTemplate
from app.services.platform import audit, get_setting, put_setting

router = APIRouter(prefix="/admin", tags=["admin"])
KEY_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{1,38}[a-z0-9]$")


def _key(v: str) -> str:
    v = v.strip().lower()
    if not KEY_RE.match(v):
        raise ValueError("Use 3-40 lowercase letters, numbers, - or _")
    return v


async def _next_sort(db: AsyncSession, col) -> int:
    return ((await db.scalar(select(func.max(col)))) or 0) + 10


# ======================= Onboarding =======================

class StepCopy(BaseModel):
    title: str = Field(max_length=120)
    subtitle: str = Field(default="", max_length=300)
    enabled: bool = True


class AccountStep(StepCopy):
    phone_enabled: bool = True


class OnboardingSteps(BaseModel):
    """Discipline and account are always on: one decides the first item's fields, the other creates the account."""

    discipline: StepCopy
    work: StepCopy
    evidence: StepCopy
    questions: StepCopy
    appearance: StepCopy
    account: AccountStep


class CategoryIn(BaseModel):
    key: str
    label: str = Field(min_length=1, max_length=80)
    active: bool = True

    @field_validator("key")
    @classmethod
    def valid_key(cls, v: str) -> str:
        return _key(v)


class CategoryPatch(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=80)
    active: bool | None = None
    sort: int | None = None


class RoleIn(BaseModel):
    key: str
    label: str = Field(min_length=1, max_length=100)
    category_key: str
    template: str = "other"
    example_title: str = Field(default="", max_length=200)
    example_skills: str = Field(default="", max_length=200)
    evidence_hint: str = Field(default="", max_length=200)
    active: bool = True

    @field_validator("key")
    @classmethod
    def valid_key(cls, v: str) -> str:
        return _key(v)


class RolePatch(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=100)
    category_key: str | None = None
    template: str | None = None
    example_title: str | None = Field(default=None, max_length=200)
    example_skills: str | None = Field(default=None, max_length=200)
    evidence_hint: str | None = Field(default=None, max_length=200)
    active: bool | None = None
    sort: int | None = None


class QuestionIn(BaseModel):
    prompt: str = Field(min_length=3, max_length=200)
    help: str | None = Field(default=None, max_length=300)
    kind: Literal["single", "multi", "text"] = "single"
    options: list[str] = Field(default_factory=list, max_length=12)
    required: bool = False
    active: bool = True

    @field_validator("options")
    @classmethod
    def clean_options(cls, v: list[str]) -> list[str]:
        out = list(dict.fromkeys(o.strip() for o in v if o.strip()))
        if any(len(o) > 80 for o in out):
            raise ValueError("Options can be at most 80 characters")
        return out


class QuestionPatch(BaseModel):
    prompt: str | None = Field(default=None, min_length=3, max_length=200)
    help: str | None = Field(default=None, max_length=300)
    kind: Literal["single", "multi", "text"] | None = None
    options: list[str] | None = Field(default=None, max_length=12)
    required: bool | None = None
    active: bool | None = None
    sort: int | None = None

    @field_validator("options")
    @classmethod
    def clean_options(cls, v: list[str] | None) -> list[str] | None:
        return QuestionIn.clean_options(v) if v is not None else v


def _check_question(kind: str, options: list[str]) -> None:
    if kind != "text" and len(options) < 2:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Choice questions need at least 2 options")


async def _check_role_refs(db: AsyncSession, category_key: str | None, template: str | None) -> None:
    if category_key is not None and await db.get(OnboardingCategory, category_key) is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown category '{category_key}'")
    if template is not None:
        tpl = await db.get(WorkTemplate, template)
        if tpl is None or tpl.kind != "work":
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown work template '{template}'")


def _row(obj) -> dict:
    return {c.key: getattr(obj, c.key) for c in obj.__table__.columns}


@router.get("/onboarding")
async def admin_onboarding(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Everything, including inactive items, with how many members picked or answered each."""
    cats = (await db.execute(select(OnboardingCategory).order_by(OnboardingCategory.sort))).scalars().all()
    roles = (await db.execute(select(OnboardingRole).order_by(OnboardingRole.sort))).scalars().all()
    qs = (await db.execute(select(OnboardingQuestion).order_by(OnboardingQuestion.sort))).scalars().all()
    picked = OnboardingAnswer.answer["value"].astext
    picks = dict((await db.execute(
        select(picked, func.count()).where(OnboardingAnswer.question_key == "discipline").group_by(picked)
    )).all())
    answered = dict((await db.execute(
        select(OnboardingAnswer.question_key, func.count())
        .where(OnboardingAnswer.question_key != "discipline").group_by(OnboardingAnswer.question_key)
    )).all())
    return {
        "steps": await get_setting(db, "onboarding"),
        "categories": [_row(c) for c in cats],
        "roles": [{**_row(r), "picked": picks.get(r.key, 0)} for r in roles],
        "questions": [{**_row(q), "answered": answered.get(str(q.id), 0)} for q in qs],
        "templates": [{"key": t.key, "label": t.label} for t in (await db.execute(select(WorkTemplate).where(WorkTemplate.kind == "work").order_by(WorkTemplate.sort))).scalars()],
    }


@router.put("/onboarding/steps")
async def save_steps(payload: OnboardingSteps, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    value = payload.model_dump()
    value["discipline"]["enabled"] = value["account"]["enabled"] = True  # never removable
    await put_setting(db, "onboarding", value)
    audit(db, admin, "onboarding.steps.update", None, enabled={k: v["enabled"] for k, v in value.items()})
    await db.commit()
    return value


@router.post("/onboarding/categories", status_code=status.HTTP_201_CREATED)
async def add_category(payload: CategoryIn, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if await db.get(OnboardingCategory, payload.key):
        raise HTTPException(status.HTTP_409_CONFLICT, "A category with that key exists")
    c = OnboardingCategory(**payload.model_dump(), sort=await _next_sort(db, OnboardingCategory.sort))
    db.add(c)
    audit(db, admin, "onboarding.category.create", c.key, label=c.label)
    await db.commit()
    return _row(c)


@router.patch("/onboarding/categories/{key}")
async def edit_category(key: str, payload: CategoryPatch, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    c = await db.get(OnboardingCategory, key)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    changes = payload.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(c, k, v)
    audit(db, admin, "onboarding.category.update", key, **changes)
    await db.commit()
    return _row(c)


@router.delete("/onboarding/categories/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_category(key: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    c = await db.get(OnboardingCategory, key)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    n = await db.scalar(select(func.count()).select_from(OnboardingRole).where(OnboardingRole.category_key == key))
    if n:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Move or delete its {n} discipline(s) first, or hide the category instead")
    await db.delete(c)
    audit(db, admin, "onboarding.category.delete", key)
    await db.commit()


@router.post("/onboarding/roles", status_code=status.HTTP_201_CREATED)
async def add_role(payload: RoleIn, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if await db.get(OnboardingRole, payload.key):
        raise HTTPException(status.HTTP_409_CONFLICT, "A discipline with that key exists")
    await _check_role_refs(db, payload.category_key, payload.template)
    r = OnboardingRole(**payload.model_dump(), sort=await _next_sort(db, OnboardingRole.sort))
    db.add(r)
    audit(db, admin, "onboarding.role.create", r.key, label=r.label)
    await db.commit()
    return _row(r)


@router.patch("/onboarding/roles/{key}")
async def edit_role(key: str, payload: RolePatch, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    r = await db.get(OnboardingRole, key)
    if r is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Discipline not found")
    changes = payload.model_dump(exclude_unset=True)
    await _check_role_refs(db, changes.get("category_key"), changes.get("template"))
    for k, v in changes.items():
        setattr(r, k, v)
    audit(db, admin, "onboarding.role.update", key, **changes)
    await db.commit()
    return _row(r)


@router.delete("/onboarding/roles/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_role(key: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    r = await db.get(OnboardingRole, key)
    if r is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Discipline not found")
    await db.delete(r)  # past answers keep the key as plain text
    audit(db, admin, "onboarding.role.delete", key, label=r.label)
    await db.commit()


@router.post("/onboarding/questions", status_code=status.HTTP_201_CREATED)
async def add_question(payload: QuestionIn, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    _check_question(payload.kind, payload.options)
    q = OnboardingQuestion(**{**payload.model_dump(), "options": [] if payload.kind == "text" else payload.options},
                           sort=await _next_sort(db, OnboardingQuestion.sort))
    db.add(q)
    await db.flush()
    audit(db, admin, "onboarding.question.create", str(q.id), prompt=q.prompt)
    await db.commit()
    return _row(q)


@router.patch("/onboarding/questions/{qid}")
async def edit_question(qid: uuid.UUID, payload: QuestionPatch, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    q = await db.get(OnboardingQuestion, qid)
    if q is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    changes = payload.model_dump(exclude_unset=True)
    kind, options = changes.get("kind", q.kind), changes.get("options", q.options)
    _check_question(kind, options)
    if kind == "text":
        changes["options"] = []
    for k, v in changes.items():
        setattr(q, k, v)
    audit(db, admin, "onboarding.question.update", str(qid), **{k: v for k, v in changes.items() if k != "options"})
    await db.commit()
    return _row(q)


@router.delete("/onboarding/questions/{qid}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_question(qid: uuid.UUID, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    q = await db.get(OnboardingQuestion, qid)
    if q is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    await db.execute(delete(OnboardingAnswer).where(OnboardingAnswer.question_key == str(qid)))
    await db.delete(q)
    audit(db, admin, "onboarding.question.delete", str(qid), prompt=q.prompt)
    await db.commit()


# ======================= Work templates =======================

class TemplateField(BaseModel):
    key: str
    label: str = Field(min_length=1, max_length=60)
    type: Literal["text", "textarea", "url", "number", "list", "select"]
    options: list[str] | None = None
    placeholder: str | None = Field(default=None, max_length=80)


    @field_validator("key")
    @classmethod
    def valid_key(cls, v: str) -> str:
        return _key(v).replace("-", "_")


class TemplateIn(BaseModel):
    key: str
    kind: Literal["work", "learning", "achievement", "problem"] = "work"
    label: str = Field(min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=200)
    fields: list[TemplateField] = Field(default_factory=list, max_length=20)
    active: bool = True

    @field_validator("key")
    @classmethod
    def valid_key(cls, v: str) -> str:
        return _key(v).replace("-", "_")


class TemplatePatch(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=200)
    fields: list[TemplateField] | None = Field(default=None, max_length=20)
    active: bool | None = None
    sort: int | None = None


def _check_fields(fields: list[TemplateField]) -> list[dict]:
    keys = [f.key for f in fields]
    if len(keys) != len(set(keys)):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Field keys must be unique")
    for f in fields:
        if f.type == "select" and len([o for o in (f.options or []) if o.strip()]) < 2:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"“{f.label}” needs at least 2 options")
    return [f.model_dump(exclude_none=True) for f in fields]


@router.get("/templates")
async def admin_templates(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    used_key = func.coalesce(WorkItem.template, WorkItem.work_type)
    usage = dict((await db.execute(select(used_key, func.count()).group_by(used_key))).all())
    rows = (await db.execute(select(WorkTemplate).order_by(WorkTemplate.kind, WorkTemplate.sort))).scalars().all()
    return [{**_row(t), "used": usage.get(t.key, 0)} for t in rows]


@router.post("/templates", status_code=status.HTTP_201_CREATED)
async def add_template(payload: TemplateIn, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if await db.get(WorkTemplate, payload.key):
        raise HTTPException(status.HTTP_409_CONFLICT, "A template with that key exists")
    t = WorkTemplate(key=payload.key, kind=payload.kind, label=payload.label, description=payload.description,
                     fields=_check_fields(payload.fields), active=payload.active, sort=await _next_sort(db, WorkTemplate.sort))
    db.add(t)
    audit(db, admin, "template.create", t.key, label=t.label)
    await db.commit()
    return _row(t)


@router.patch("/templates/{key}")
async def edit_template(key: str, payload: TemplatePatch, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    t = await db.get(WorkTemplate, key)
    if t is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    changes = payload.model_dump(exclude_unset=True)
    if payload.fields is not None:
        changes["fields"] = _check_fields(payload.fields)
    for k, v in changes.items():
        setattr(t, k, v)
    audit(db, admin, "template.update", key, **{k: v for k, v in changes.items() if k != "fields"}, fields=len(changes.get("fields", t.fields)))
    await db.commit()
    return _row(t)


@router.delete("/templates/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_template(key: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    t = await db.get(WorkTemplate, key)
    if t is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    used = await db.scalar(select(func.count()).select_from(WorkItem).where((WorkItem.template == key) | (WorkItem.work_type == key)))
    if used or key in ("learning", "achievement", "problem", "other"):
        raise HTTPException(status.HTTP_409_CONFLICT, f"In use by {used} item(s) or required — hide it instead")
    await db.delete(t)
    audit(db, admin, "template.delete", key)
    await db.commit()


# ======================= Businesses =======================

@router.get("/businesses")
async def admin_businesses(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    owners = (await db.execute(
        select(BusinessMember.business_id, Profile.username)
        .join(Profile, Profile.user_id == BusinessMember.user_id)
        .where(BusinessMember.permission == "owner")
    )).all()
    by_biz: dict = {}
    for bid, u in owners:
        by_biz.setdefault(bid, []).append(u)
    followers = dict((await db.execute(
        select(Follow.business_id, func.count()).where(Follow.business_id.is_not(None)).group_by(Follow.business_id)
    )).all())
    rows = (await db.execute(select(Business).order_by(Business.created_at.desc()))).scalars().all()
    return [
        {"id": b.id, "slug": b.slug, "name": b.name, "type": b.type, "visibility": b.visibility.value,
         "owners": by_biz.get(b.id, []), "followers": followers.get(b.id, 0), "created_at": b.created_at}
        for b in rows
    ]


class BusinessModeration(BaseModel):
    visibility: Visibility


@router.patch("/businesses/{slug}")
async def moderate_business(slug: str, payload: BusinessModeration, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    b = await db.scalar(select(Business).where(Business.slug == slug))
    if b is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Business not found")
    b.visibility = payload.visibility
    audit(db, admin, "business.visibility", slug, visibility=payload.visibility.value)
    await db.commit()
    return {"slug": slug, "visibility": b.visibility.value}


@router.delete("/businesses/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_business(slug: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    from app.models.business import Role
    from sqlalchemy import update

    b = await db.scalar(select(Business).where(Business.slug == slug))
    if b is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Business not found")
    await db.execute(update(Role).where(Role.business_id == b.id).values(organization_name=b.name))  # BR-10
    await db.delete(b)
    audit(db, admin, "business.delete", slug, name=b.name)
    await db.commit()


# ======================= Platform switches =======================

class RegistrationSetting(BaseModel):
    open: bool
    closed_message: str = Field(default="", max_length=200)


class AnnouncementSetting(BaseModel):
    active: bool
    text: str = Field(default="", max_length=240)
    tone: Literal["info", "success", "warning"] = "info"
    link: str | None = Field(default=None, max_length=300)

    @field_validator("link")
    @classmethod
    def safe_link(cls, v: str | None) -> str | None:
        if v and not (v.startswith("/") or v.startswith("https://")):
            raise ValueError("Link must start with / or https://")
        return v or None


@router.get("/platform")
async def admin_platform(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    return {"registration": await get_setting(db, "registration"), "announcement": await get_setting(db, "announcement")}


@router.put("/platform/registration")
async def save_registration(payload: RegistrationSetting, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    await put_setting(db, "registration", payload.model_dump())
    audit(db, admin, "platform.registration", None, open=payload.open)
    await db.commit()
    return payload


@router.put("/platform/announcement")
async def save_announcement(payload: AnnouncementSetting, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    await put_setting(db, "announcement", payload.model_dump())
    audit(db, admin, "platform.announcement", None, active=payload.active, text=payload.text[:80])
    await db.commit()
    return payload


# ======================= Audit log =======================

@router.get("/audit")
async def admin_audit(limit: int = Query(100, le=500), admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(AdminAction, Profile.username)
        .outerjoin(Profile, Profile.user_id == AdminAction.admin_id)
        .order_by(AdminAction.created_at.desc()).limit(limit)
    )
    return [{"id": a.id, "admin": u, "action": a.action, "target": a.target, "details": a.details, "at": a.created_at} for a, u in rows.all()]


# ======================= Analytics =======================

def _days(start: date, n: int) -> list[date]:
    return [start + timedelta(days=i) for i in range(n)]


async def _daily(db: AsyncSession, col, where, start: date, n: int, count=None) -> list[dict]:
    day = cast(func.date_trunc("day", col), Date)
    rows = dict((await db.execute(select(day, count if count is not None else func.count()).where(where, col >= start).group_by(day))).all())
    return [{"date": d.isoformat(), "value": rows.get(d, 0)} for d in _days(start, n)]


@router.get("/analytics")
async def admin_analytics(days: int = Query(30, ge=7, le=365), admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)
    prev_start = start - timedelta(days=days)

    async def count(model, *where):
        return await db.scalar(select(func.count()).select_from(model).where(*where)) or 0

    async def active_between(a: date, b: date) -> int:
        return await db.scalar(select(func.count(distinct(WorkEvent.user_id))).where(WorkEvent.created_at >= a, WorkEvent.created_at < b)) or 0

    shaped = WorkItem.work_type != "capture"
    public_work = and_(WorkItem.visibility == Visibility.PUBLIC, shaped)
    totals = {
        "users": await count(User),
        "new_users": await count(User, User.created_at >= start),
        "new_users_prev": await count(User, User.created_at >= prev_start, User.created_at < start),
        "active_members": await active_between(start, today + timedelta(days=1)),
        "active_members_prev": await active_between(prev_start, start),
        "works": await count(WorkItem),
        "public_works": await count(WorkItem, public_work),
        "proofs": await db.scalar(select(func.coalesce(func.sum(func.jsonb_array_length(WorkItem.evidence_links)), 0))) or 0,
        "businesses": await count(Business),
        "follows": await count(Follow),
        "public_profiles": await count(Profile, Profile.visibility == Visibility.PUBLIC),
    }

    series = {
        "signups": await _daily(db, User.created_at, true(), start, days),
        "active_members": await _daily(db, WorkEvent.created_at, true(), start, days, func.count(distinct(WorkEvent.user_id))),
        "captures": await _daily(db, WorkEvent.created_at, (WorkEvent.field == "created"), start, days),
        "shaped": await _daily(db, WorkEvent.created_at, (WorkEvent.field == "work_type") & (WorkEvent.old_value == "capture"), start, days),
        "published": await _daily(db, WorkEvent.created_at, (WorkEvent.field == "visibility") & (WorkEvent.new_value == "public"), start, days),
    }

    has = lambda *where: select(func.count(distinct(WorkItem.user_id))).where(*where)  # noqa: E731
    funnel = [
        {"step": "Signed up", "value": totals["users"]},
        {"step": "Captured something", "value": await db.scalar(has(true())) or 0},
        {"step": "Shaped an item", "value": await db.scalar(has(shaped)) or 0},
        {"step": "Added proof", "value": await db.scalar(has(shaped, func.jsonb_array_length(WorkItem.evidence_links) > 0)) or 0},
        {"step": "Published", "value": await db.scalar(has(public_work)) or 0},
    ]

    by_kind = [{"label": k, "value": v} for k, v in (await db.execute(
        select(WorkItem.work_type, func.count()).group_by(WorkItem.work_type).order_by(func.count().desc())
    )).all()]
    by_visibility = [{"label": k.value, "value": v} for k, v in (await db.execute(
        select(WorkItem.visibility, func.count()).group_by(WorkItem.visibility).order_by(func.count().desc())
    )).all()]

    skill = func.jsonb_array_elements_text(WorkItem.skills).table_valued("value").alias("skill")
    top_skills = [{"label": s, "value": c} for s, c in (await db.execute(
        select(skill.c.value, func.count()).select_from(WorkItem).join(skill, true()).group_by(skill.c.value).order_by(func.count().desc()).limit(10)
    )).all()]

    role_label = dict((await db.execute(select(OnboardingRole.key, OnboardingRole.label))).all())
    picked = OnboardingAnswer.answer["value"].astext
    disciplines = [{"label": role_label.get(k, k), "value": v} for k, v in (await db.execute(
        select(picked, func.count()).where(OnboardingAnswer.question_key == "discipline")
        .group_by(picked).order_by(func.count().desc()).limit(12)
    )).all()]

    questions = []
    for q in (await db.execute(select(OnboardingQuestion).where(OnboardingQuestion.kind != "text").order_by(OnboardingQuestion.sort))).scalars():
        answers = (await db.execute(select(OnboardingAnswer.answer).where(OnboardingAnswer.question_key == str(q.id)))).scalars().all()
        counts = {o: 0 for o in q.options}
        for a in answers:
            for v in (a["value"] if isinstance(a["value"], list) else [a["value"]]):
                if v in counts:
                    counts[v] += 1
        questions.append({"id": q.id, "prompt": q.prompt, "active": q.active, "responses": len(answers),
                          "options": [{"label": k, "value": v} for k, v in counts.items()]})

    return {"days": days, "totals": totals, "series": series, "funnel": funnel, "by_kind": by_kind,
            "by_visibility": by_visibility, "top_skills": top_skills, "disciplines": disciplines, "questions": questions}
