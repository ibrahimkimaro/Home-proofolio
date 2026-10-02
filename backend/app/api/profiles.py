import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.files import sign
from datetime import date

from app.core.visibility import (
    business_visible,
    link_visible_work,
    listed_works,
    profile_visible,
    public_contact,
    public_evidence,
    public_roles_filter,
    section_public,
    team_roles_filter,
)
from app.models.business import Business, BusinessOffering, BusinessWorkLink, Follow, Role
from app.models.profile import Profile, Visibility
from app.models.user import User
from app.models.work import WorkItem
from app.schemas import portfolio as portfolio_schema
from app.schemas.portfolio import PortfolioSettings
from app.schemas.work import EvidenceLink, WorkOut

router = APIRouter(tags=["public"])


class SkillOut(BaseModel):
    name: str
    works: int
    proofs: int


class PublicRoleOut(BaseModel):
    title: str
    organization: str | None
    business_slug: str | None
    start_date: date | None
    end_date: date | None
    current: bool
    trust: str  # self_declared | confirmed (FR-ORG-05: the page shows which)


class PublicProfileOut(BaseModel):
    username: str
    display_name: str
    headline: str | None
    bio: str | None
    avatar_url: str | None
    skills: list[SkillOut]
    roles: list[PublicRoleOut]
    followers: int
    works: list[WorkOut]
    portfolio: PortfolioSettings
    allow_indexing: bool
    verified: bool = False  # the account was activated with a code sent to its phone or email


class OwnerOut(BaseModel):
    username: str
    display_name: str
    avatar_url: str | None


class PublicWorkOut(BaseModel):
    work: WorkOut
    owner: OwnerOut
    source: WorkOut | None = None


def _visitor_work(w: WorkItem) -> WorkOut:
    out = WorkOut.model_validate(w)
    # model_construct: "exists" entries intentionally carry no URL.
    out.evidence_links = [EvidenceLink.model_construct(**e) for e in public_evidence([e.model_dump() for e in out.evidence_links])]
    return out


@router.get("/profiles/{username}", response_model=PublicProfileOut)
async def get_public_profile(username: str, db: AsyncSession = Depends(get_db)):
    """Always the anonymous view, so "View as visitor" is exactly what the public gets (PRD rule 5)."""
    profile = await db.scalar(select(Profile).where(func.lower(Profile.username) == username.lower()))
    if not profile_visible(profile):
        # Same answer for private and missing: never reveal that a private profile exists.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")

    works = [_visitor_work(w) for w in (await db.execute(listed_works(profile.user_id))).scalars().all()]

    # FR-SKL-02: a skill is stronger when linked to work and proof, and the profile shows it.
    skills: dict[str, SkillOut] = {}
    for w in works:
        proofs = sum(1 for e in w.evidence_links if e.visibility == "public")
        for s in w.skills:
            sk = skills.setdefault(s.lower(), SkillOut(name=s, works=0, proofs=0))
            sk.works += 1
            sk.proofs += proofs
    ranked = sorted(skills.values(), key=lambda s: (-s.proofs, -s.works, s.name.lower()))

    role_rows = await db.execute(
        select(Role, Business)
        .outerjoin(Business, Business.id == Role.business_id)
        .where(Role.user_id == profile.user_id, public_roles_filter())
        .order_by(Role.end_date.is_not(None), Role.start_date.desc().nulls_last())
    )
    roles = []
    for r, b in role_rows.all():
        # A private business page is not revealed: the role shows as plain text.
        linked = b if business_visible(b) else None
        roles.append(PublicRoleOut(
            title=r.title,
            organization=(b.name if b else r.organization_name),
            business_slug=linked.slug if linked else None,
            start_date=r.start_date, end_date=r.end_date,
            current=r.end_date is None or r.end_date >= date.today(),
            trust=r.trust,
        ))
    followers = await db.scalar(select(func.count()).select_from(Follow).where(Follow.user_id == profile.user_id)) or 0

    return PublicProfileOut(
        username=profile.username,
        display_name=profile.display_name,
        headline=profile.headline,
        bio=profile.bio,
        avatar_url=sign(profile.avatar_url) if profile.avatar_url else None,
        skills=ranked,
        roles=roles,
        followers=followers,
        works=works,
        portfolio=_visitor_portfolio(profile, works),
        allow_indexing=profile.allow_indexing,
        verified=await db.scalar(select(User.otp_pending).where(User.id == profile.user_id)) is False,
    )


def _visitor_portfolio(profile: Profile, works: list[WorkOut]) -> PortfolioSettings:
    """Featured ids only for works the visitor can already see; contact email only if opted in."""
    s = portfolio_schema.load(profile.portfolio)
    visible = {w.id for w in works}
    s.featured = [w for w in s.featured if w in visible]
    return s


@router.get("/public/works/{work_id}", response_model=PublicWorkOut)
async def get_public_work(work_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    work = await db.scalar(link_visible_work(work_id))
    profile = work and await db.scalar(select(Profile).where(Profile.user_id == work.user_id))
    if work is None or not profile_visible(profile):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    source = work.source_id and await db.scalar(link_visible_work(work.source_id))
    return PublicWorkOut(
        work=_visitor_work(work),
        owner=OwnerOut(username=profile.username, display_name=profile.display_name, avatar_url=profile.avatar_url),
        source=_visitor_work(source) if source else None,
    )


class TeamMemberOut(BaseModel):
    username: str
    display_name: str
    avatar_url: str | None
    title: str
    current: bool
    trust: str


class ProjectOut(BaseModel):
    work: WorkOut
    author: OwnerOut  # FR-ORG-09: the original author stays visible


class PublicBusinessOut(BaseModel):
    slug: str
    name: str
    type: str
    description: str | None
    followers: int
    offerings: list[dict] | None  # None = section hidden
    team: list[TeamMemberOut] | None
    projects: list[ProjectOut] | None
    contact: dict | None


@router.get("/public/businesses/{slug}", response_model=PublicBusinessOut)
async def get_public_business(slug: str, db: AsyncSession = Depends(get_db)):
    b = await db.scalar(select(Business).where(Business.slug == slug.lower()))
    if not business_visible(b):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")

    offerings = team = projects = contact = None
    if section_public(b, "services"):
        rows = await db.execute(select(BusinessOffering).where(BusinessOffering.business_id == b.id).order_by(BusinessOffering.sort, BusinessOffering.name))
        offerings = [{"kind": o.kind, "name": o.name, "description": o.description, "price": o.price} for o in rows.scalars()]
    if section_public(b, "team"):
        rows = await db.execute(
            select(Role, Profile)
            .join(Profile, Profile.user_id == Role.user_id)
            .where(team_roles_filter(b.id), Profile.visibility.in_((Visibility.PUBLIC, Visibility.UNLISTED)))
            .order_by(Role.trust.desc(), Role.start_date.nulls_last())
        )
        team = [
            TeamMemberOut(
                username=p.username, display_name=p.display_name, avatar_url=sign(p.avatar_url) if p.avatar_url else None,
                title=r.title, current=r.end_date is None or r.end_date >= date.today(), trust=r.trust,
            )
            for r, p in rows.all()
        ]
    if section_public(b, "projects"):
        rows = await db.execute(
            select(WorkItem, Profile)
            .join(BusinessWorkLink, BusinessWorkLink.work_id == WorkItem.id)
            .join(Profile, Profile.user_id == WorkItem.user_id)
            .where(
                BusinessWorkLink.business_id == b.id, BusinessWorkLink.status == "accepted",
                WorkItem.visibility == Visibility.PUBLIC, WorkItem.work_type != "capture",
            )
            .order_by(WorkItem.updated_at.desc())
        )
        projects = [
            ProjectOut(work=_visitor_work(w), author=OwnerOut(username=p.username, display_name=p.display_name, avatar_url=None))
            for w, p in rows.all()
        ]
    if section_public(b, "contact"):
        contact = public_contact(b)
    followers = await db.scalar(select(func.count()).select_from(Follow).where(Follow.business_id == b.id)) or 0
    return PublicBusinessOut(
        slug=b.slug, name=b.name, type=b.type,
        description=b.description if section_public(b, "about") else None,
        followers=followers, offerings=offerings, team=team, projects=projects, contact=contact,
    )
