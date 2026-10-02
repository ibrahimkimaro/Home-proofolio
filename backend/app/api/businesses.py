"""Roles and businesses (PRD S5: FR-ROLE-01, FR-ORG-01..11, BR-08..11, UC-09, UC-10)."""
import re
import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ensure_can_publish, get_current_user
from app.core.database import get_db
from app.models.business import (
    BUSINESS_TYPES,
    PERMISSIONS,
    SECTIONS,
    Business,
    BusinessMember,
    BusinessOffering,
    BusinessWorkLink,
    Role,
)
from app.models.profile import Profile, Visibility
from app.models.user import User
from app.models.work import WorkItem
from app.services.activity import notify

router = APIRouter(tags=["businesses"])

SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$")
RANK = {"editor": 1, "admin": 2, "owner": 3}

BusinessType = Literal[BUSINESS_TYPES]  # type: ignore[valid-type]
Permission = Literal[PERMISSIONS]  # type: ignore[valid-type]


# ---------- schemas ----------

class BusinessIn(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    type: BusinessType = "business"
    description: str | None = Field(default=None, max_length=3000)
    slug: str | None = None

    @field_validator("slug")
    @classmethod
    def slug_ok(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip().lower()
        if not SLUG_RE.match(v):
            raise ValueError("Use 3-60 lowercase letters, numbers or hyphens")
        return v


class BusinessUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    type: BusinessType | None = None
    description: str | None = Field(default=None, max_length=3000)
    visibility: Visibility | None = None
    section_visibility: dict[str, Literal["public", "private"]] | None = None
    phone: str | None = Field(default=None, max_length=50)
    whatsapp: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    show_phone: bool | None = None
    show_whatsapp: bool | None = None
    show_email: bool | None = None
    show_location: bool | None = None

    @field_validator("section_visibility")
    @classmethod
    def known_sections(cls, v):
        if v and set(v) - set(SECTIONS):
            raise ValueError(f"Sections are: {', '.join(SECTIONS)}")
        return v


class OfferingIn(BaseModel):
    kind: Literal["service", "product"] = "service"
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=1000)
    price: str | None = Field(default=None, max_length=60)


class OfferingOut(OfferingIn):
    id: uuid.UUID


class PersonOut(BaseModel):
    username: str
    display_name: str
    avatar_url: str | None


class RoleIn(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    business_slug: str | None = None
    organization_name: str | None = Field(default=None, max_length=150)
    start_date: date | None = None
    end_date: date | None = None
    visibility: Literal["public", "private"] = "public"


class RoleOut(BaseModel):
    id: uuid.UUID
    title: str
    organization_name: str | None
    business: dict | None  # {slug, name, type}
    start_date: date | None
    end_date: date | None
    current: bool
    visibility: str
    trust: str
    hidden_by_business: bool


class MemberIn(BaseModel):
    username: str
    permission: Permission


class BusinessOut(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    type: str
    description: str | None
    visibility: Visibility
    section_visibility: dict
    phone: str | None
    whatsapp: str | None
    email: str | None
    location: str | None
    show_phone: bool
    show_whatsapp: bool
    show_email: bool
    show_location: bool
    my_permission: str | None = None


# ---------- helpers ----------

def _slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:50] or "page"
    return s if len(s) >= 3 else f"{s}-page"


async def _unique_slug(db: AsyncSession, base: str) -> str:
    slug, n = base, 1
    while await db.scalar(select(func.count()).select_from(Business).where(Business.slug == slug)):
        n += 1
        slug = f"{base}-{n}"
    return slug


async def _business(db: AsyncSession, slug: str) -> Business:
    b = await db.scalar(select(Business).where(Business.slug == slug.lower()))
    if b is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Business not found")
    return b


async def _permission(db: AsyncSession, business: Business, user: User) -> str | None:
    return await db.scalar(
        select(BusinessMember.permission).where(BusinessMember.business_id == business.id, BusinessMember.user_id == user.id)
    )


async def _require(db: AsyncSession, slug: str, user: User, at_least: str) -> Business:
    """Page permissions only — a role title never grants access (BR-08)."""
    b = await _business(db, slug)
    perm = await _permission(db, b, user)
    if perm is None or RANK[perm] < RANK[at_least]:
        # Private pages stay invisible to outsiders; others get a plain "not allowed".
        if perm is None and b.visibility in (Visibility.PRIVATE, Visibility.DRAFT):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Business not found")
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Needs {at_least} permission on this page")
    return b


def _business_out(b: Business, perm: str | None) -> BusinessOut:
    return BusinessOut.model_validate({**{c.name: getattr(b, c.name) for c in Business.__table__.columns}, "my_permission": perm})


async def _role_out(db: AsyncSession, r: Role) -> RoleOut:
    b = await db.get(Business, r.business_id) if r.business_id else None
    return RoleOut(
        id=r.id,
        title=r.title,
        organization_name=r.organization_name,
        business={"slug": b.slug, "name": b.name, "type": b.type} if b else None,
        start_date=r.start_date,
        end_date=r.end_date,
        current=r.end_date is None or r.end_date >= date.today(),
        visibility=r.visibility.value,
        trust=r.trust,
        hidden_by_business=r.hidden_by_business,
    )


# ---------- businesses ----------

@router.post("/businesses", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
async def create_business(payload: BusinessIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """UC-09: creator becomes Owner; the page is private until published."""
    if payload.slug:
        if await db.scalar(select(func.count()).select_from(Business).where(Business.slug == payload.slug)):
            raise HTTPException(status.HTTP_409_CONFLICT, f"/{payload.slug} is already taken")
        slug = payload.slug
    else:
        slug = await _unique_slug(db, _slugify(payload.name))
    b = Business(slug=slug, name=payload.name.strip(), type=payload.type, description=payload.description)
    db.add(b)
    await db.flush()
    db.add(BusinessMember(business_id=b.id, user_id=user.id, permission="owner"))
    await db.commit()
    await db.refresh(b)
    return _business_out(b, "owner")


@router.get("/businesses/mine", response_model=list[BusinessOut])
async def my_businesses(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(Business, BusinessMember.permission)
        .join(BusinessMember, BusinessMember.business_id == Business.id)
        .where(BusinessMember.user_id == user.id)
        .order_by(Business.name)
    )
    return [_business_out(b, p) for b, p in rows.all()]


@router.get("/businesses/{slug}/manage", response_model=BusinessOut)
async def get_business_for_editing(slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    b = await _require(db, slug, user, "editor")
    return _business_out(b, await _permission(db, b, user))


@router.patch("/businesses/{slug}", response_model=BusinessOut)
async def update_business(slug: str, payload: BusinessUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    data = payload.model_dump(exclude_unset=True)
    ensure_can_publish(user, data.get("visibility"))
    # Publishing and contact exposure are admin decisions; editors change content.
    needs_admin = {"visibility", "section_visibility"} | {k for k in data if k.startswith("show_")}
    b = await _require(db, slug, user, "admin" if needs_admin & set(data) else "editor")
    if "section_visibility" in data:
        data["section_visibility"] = {**b.section_visibility, **data["section_visibility"]}
    for k, v in data.items():
        setattr(b, k, v.strip() if isinstance(v, str) else v)
    await db.commit()
    await db.refresh(b)
    return _business_out(b, await _permission(db, b, user))


@router.delete("/businesses/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_business(slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    b = await _require(db, slug, user, "owner")  # hard delete: Owner permission only
    # BR-10: people keep their role history; the name survives as plain text.
    await db.execute(update(Role).where(Role.business_id == b.id).values(organization_name=b.name))
    await db.delete(b)
    await db.commit()


# offerings (Services and Products, one typed list)

@router.get("/businesses/{slug}/offerings", response_model=list[OfferingOut])
async def list_offerings_for_editing(slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    b = await _require(db, slug, user, "editor")
    rows = await db.execute(select(BusinessOffering).where(BusinessOffering.business_id == b.id).order_by(BusinessOffering.sort, BusinessOffering.name))
    return [OfferingOut(id=o.id, kind=o.kind, name=o.name, description=o.description, price=o.price) for o in rows.scalars()]


@router.post("/businesses/{slug}/offerings", response_model=OfferingOut, status_code=status.HTTP_201_CREATED)
async def add_offering(slug: str, payload: OfferingIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    b = await _require(db, slug, user, "editor")
    o = BusinessOffering(business_id=b.id, **payload.model_dump())
    db.add(o)
    await db.commit()
    return OfferingOut(id=o.id, **payload.model_dump())


@router.delete("/businesses/{slug}/offerings/{offering_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_offering(slug: str, offering_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    b = await _require(db, slug, user, "editor")
    await db.execute(delete(BusinessOffering).where(BusinessOffering.id == offering_id, BusinessOffering.business_id == b.id))
    await db.commit()


# permissions (Owner, Admin, Editor)

@router.get("/businesses/{slug}/members")
async def list_members(slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    b = await _require(db, slug, user, "editor")
    rows = await db.execute(
        select(BusinessMember.permission, Profile.username, Profile.display_name, Profile.avatar_url)
        .join(Profile, Profile.user_id == BusinessMember.user_id)
        .where(BusinessMember.business_id == b.id)
    )
    return [{"permission": p, "username": u, "display_name": n, "avatar_url": a} for p, u, n, a in rows.all()]


@router.put("/businesses/{slug}/members", status_code=status.HTTP_204_NO_CONTENT)
async def set_member(slug: str, payload: MemberIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    b = await _require(db, slug, user, "owner")
    target = await db.scalar(select(Profile).where(Profile.username == payload.username.lower()))
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No member @{payload.username}")
    m = await db.get(BusinessMember, (b.id, target.user_id))
    if m and m.permission == "owner" and payload.permission != "owner":
        await _keep_an_owner(db, b, target.user_id)
    if m:
        m.permission = payload.permission
    else:
        db.add(BusinessMember(business_id=b.id, user_id=target.user_id, permission=payload.permission))
    await db.commit()


@router.delete("/businesses/{slug}/members/{username}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(slug: str, username: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    b = await _business(db, slug)
    target = await db.scalar(select(Profile).where(Profile.username == username.lower()))
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not a member")
    if target.user_id != user.id:  # anyone may leave; removing others needs Owner
        await _require(db, slug, user, "owner")
    m = await db.get(BusinessMember, (b.id, target.user_id))
    if m is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not a member")
    if m.permission == "owner":
        await _keep_an_owner(db, b, target.user_id)
    await db.delete(m)
    await db.commit()


async def _keep_an_owner(db: AsyncSession, b: Business, leaving_user_id: uuid.UUID) -> None:
    """BR-11: a business always has at least one Owner."""
    others = await db.scalar(
        select(func.count()).select_from(BusinessMember).where(
            BusinessMember.business_id == b.id, BusinessMember.permission == "owner", BusinessMember.user_id != leaving_user_id
        )
    )
    if not others:
        raise HTTPException(status.HTTP_409_CONFLICT, "Add another Owner first — a business always needs one")


# requests: roles to confirm and work to accept (UC-10)

@router.get("/businesses/{slug}/requests")
async def business_requests(slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    b = await _require(db, slug, user, "admin")
    roles = await db.execute(
        select(Role, Profile.username, Profile.display_name)
        .join(Profile, Profile.user_id == Role.user_id)
        .where(Role.business_id == b.id, Role.trust == "self_declared", Role.hidden_by_business == False)  # noqa: E712
    )
    works = await db.execute(
        select(BusinessWorkLink, WorkItem.title, Profile.username, Profile.display_name)
        .join(WorkItem, WorkItem.id == BusinessWorkLink.work_id)
        .join(Profile, Profile.user_id == WorkItem.user_id)
        .where(BusinessWorkLink.business_id == b.id, BusinessWorkLink.status == "pending")
    )
    return {
        "roles": [{"id": r.id, "title": r.title, "username": u, "display_name": n} for r, u, n in roles.all()],
        "works": [{"id": l.id, "work_id": l.work_id, "title": t, "username": u, "display_name": n} for l, t, u, n in works.all()],
    }


@router.post("/businesses/{slug}/roles/{role_id}/{decision}", status_code=status.HTTP_204_NO_CONTENT)
async def decide_role(
    slug: str, role_id: uuid.UUID, decision: Literal["confirm", "reject", "hide", "show"],
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    b = await _require(db, slug, user, "admin")
    r = await db.get(Role, role_id)
    if r is None or r.business_id != b.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Role not found")
    if decision == "confirm":
        r.trust, r.hidden_by_business = "confirmed", False
        notify(db, r.user_id, "business", f"{b.name} confirmed your role", r.title, "/profile")
    elif decision == "reject":
        # UC-10 alt: stays on the member's own profile, only as self-declared; gone from the Team section.
        r.trust, r.hidden_by_business = "self_declared", True
        notify(db, r.user_id, "business", f"{b.name} didn't confirm your role", f"{r.title} stays on your profile as self-declared.", "/profile")
    else:
        r.hidden_by_business = decision == "hide"  # FR-ORG-04: either side can hide
    await db.commit()


@router.post("/businesses/{slug}/works/{link_id}/{decision}", status_code=status.HTTP_204_NO_CONTENT)
async def decide_work(
    slug: str, link_id: uuid.UUID, decision: Literal["accept", "reject"],
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    b = await _require(db, slug, user, "admin")
    link = await db.get(BusinessWorkLink, link_id)
    if link is None or link.business_id != b.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    link.status = "accepted" if decision == "accept" else "rejected"
    work = await db.get(WorkItem, link.work_id)
    if work:
        notify(db, work.user_id, "business", f"{b.name} {'accepted' if decision == 'accept' else 'declined'} your work",
               work.title, f"/w/{work.id}")
    await db.commit()


# ---------- my roles ----------

@router.get("/me/roles", response_model=list[RoleOut])
async def my_roles(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = await db.execute(select(Role).where(Role.user_id == user.id).order_by(Role.end_date.is_not(None), Role.start_date.desc().nulls_last()))
    return [await _role_out(db, r) for r in rows.scalars()]


async def _notify_page_admins(db: AsyncSession, b: Business, title: str, body: str) -> None:
    """Tell the people who can approve requests on this business page."""
    admins = await db.scalars(
        select(BusinessMember.user_id).where(BusinessMember.business_id == b.id, BusinessMember.permission.in_(("owner", "admin")))
    )
    for uid in admins:
        notify(db, uid, "business", title, body, f"/business/{b.slug}")


async def _apply_role(db: AsyncSession, user: User, r: Role, payload: RoleIn) -> None:
    if payload.end_date and payload.start_date and payload.end_date < payload.start_date:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "End date is before start date")
    r.title = payload.title.strip()
    r.start_date, r.end_date = payload.start_date, payload.end_date
    r.visibility = Visibility(payload.visibility)
    if payload.business_slug:
        b = await _business(db, payload.business_slug)
        perm = await _permission(db, b, user)
        if perm is None and b.visibility in (Visibility.PRIVATE, Visibility.DRAFT):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Business not found")
        if r.business_id != b.id:
            r.business_id, r.organization_name = b.id, None
            # BR-09: a claim is self-declared until the page's owner/admin confirms. Admins confirm their own.
            r.trust = "confirmed" if perm in ("owner", "admin") else "self_declared"
            r.hidden_by_business = False
            if r.trust == "self_declared":
                await _notify_page_admins(db, b, "New team role to confirm", f"{user.username} says they work at {b.name} as {r.title}.")
    else:
        r.business_id, r.trust = None, "self_declared"
        r.organization_name = (payload.organization_name or "").strip() or None


@router.post("/me/roles", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
async def add_role(payload: RoleIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    r = Role(user_id=user.id, title=payload.title)
    await _apply_role(db, user, r, payload)
    db.add(r)
    await db.commit()
    return await _role_out(db, r)


@router.put("/me/roles/{role_id}", response_model=RoleOut)
async def update_role(role_id: uuid.UUID, payload: RoleIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    r = await db.get(Role, role_id)
    if r is None or r.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Role not found")
    await _apply_role(db, user, r, payload)
    await db.commit()
    return await _role_out(db, r)


@router.delete("/me/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(role_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Only the role's owner hard-deletes. Ending a role (end_date) is the history-keeping path (BR-10)."""
    r = await db.get(Role, role_id)
    if r is None or r.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Role not found")
    await db.delete(r)
    await db.commit()


# ---------- linking my work to a business ----------

@router.post("/works/{work_id}/businesses/{slug}", status_code=status.HTTP_201_CREATED)
async def link_work(work_id: uuid.UUID, slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    work = await db.get(WorkItem, work_id)
    if work is None or work.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Work item not found")
    b = await _business(db, slug)
    perm = await _permission(db, b, user)
    if perm is None and b.visibility in (Visibility.PRIVATE, Visibility.DRAFT):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Business not found")
    existing = await db.scalar(select(BusinessWorkLink).where(BusinessWorkLink.business_id == b.id, BusinessWorkLink.work_id == work.id))
    if existing:
        return {"status": existing.status}
    link = BusinessWorkLink(business_id=b.id, work_id=work.id, status="accepted" if perm in ("owner", "admin") else "pending")
    db.add(link)
    if link.status == "pending":
        await _notify_page_admins(db, b, "New work to review", f"{user.username} asked to link “{work.title}” to {b.name}.")
    await db.commit()
    return {"status": link.status}


@router.get("/works/{work_id}/businesses")
async def work_links(work_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    work = await db.get(WorkItem, work_id)
    if work is None or work.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Work item not found")
    rows = await db.execute(
        select(BusinessWorkLink.status, Business.slug, Business.name)
        .join(Business, Business.id == BusinessWorkLink.business_id)
        .where(BusinessWorkLink.work_id == work_id)
    )
    return [{"status": s, "slug": sl, "name": n} for s, sl, n in rows.all()]


@router.delete("/works/{work_id}/businesses/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_work(work_id: uuid.UUID, slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    work = await db.get(WorkItem, work_id)
    if work is None or work.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Work item not found")
    b = await _business(db, slug)
    await db.execute(delete(BusinessWorkLink).where(BusinessWorkLink.business_id == b.id, BusinessWorkLink.work_id == work_id))
    await db.commit()
