from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import Date, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ensure_can_publish, get_current_user
from app.api.uploads import IMAGES, save_upload
from app.core.database import get_db
from app.models.business import Business, Follow, Role
from app.models.profile import Profile, Visibility
from app.models.user import User
from app.models.work import WorkEvent, WorkItem
from app.schemas import portfolio
from app.schemas.auth import ProfileOut, ProfileUpdate
from app.schemas.portfolio import PortfolioSettings
from app.schemas.work import WorkOut
from app.services.home import bucket_of

ACTIVITY_WEEKS = 12

router = APIRouter(prefix="/me", tags=["me"])


class HomeCounts(BaseModel):
    items: int
    proofs: int
    public: int
    days_active: int
    followers: int


class ActivityWeek(BaseModel):
    week: date  # Monday
    changes: int  # captures, shapes, state changes, publishes


class HomeOut(BaseModel):
    counts: HomeCounts
    roles: list[str]  # current role titles for the identity banner
    activity: list[ActivityWeek]  # oldest first, ACTIVITY_WEEKS long
    portfolio: PortfolioSettings  # for the live portfolio preview card
    keep_going: list[WorkOut]
    needs_proof: list[WorkOut]
    ready: list[WorkOut]


@router.get("/home", response_model=HomeOut)
async def get_home(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Everything Home needs in one request (PRD NFR-08)."""
    works = (
        await db.execute(select(WorkItem).where(WorkItem.user_id == user.id).order_by(WorkItem.updated_at.desc()))
    ).scalars().all()
    days_active = await db.scalar(
        select(func.count(func.distinct(cast(WorkEvent.created_at, Date)))).where(WorkEvent.user_id == user.id)
    )

    lists: dict[str, list[WorkItem]] = {"keep_going": [], "needs_proof": [], "ready": []}
    for w in works:
        b = bucket_of(w.work_type, w.status, w.visibility.value, len(w.evidence_links or []))
        if b:
            lists[b].append(w)

    live = [w for w in works if w.status != "archived"]
    followers = await db.scalar(select(func.count()).select_from(Follow).where(Follow.user_id == user.id))
    role_rows = await db.execute(
        select(Role.title, Business.name, Role.organization_name)
        .outerjoin(Business, Business.id == Role.business_id)
        .where(Role.user_id == user.id, (Role.end_date.is_(None)) | (Role.end_date >= date.today()))
        .order_by(Role.start_date.desc().nulls_last())
    )
    roles = [f"{t} at {b or o}" if (b or o) else t for t, b, o in role_rows.all()]
    return HomeOut(
        counts=HomeCounts(
            items=len(live),
            proofs=sum(len(w.evidence_links or []) for w in live),
            public=sum(1 for w in live if w.visibility == Visibility.PUBLIC and w.work_type != "capture"),
            days_active=days_active or 0,
            followers=followers or 0,
        ),
        roles=roles,
        activity=await _weekly_activity(db, user),
        portfolio=portfolio.load(user.profile.portfolio),
        **lists,
    )


async def _weekly_activity(db: AsyncSession, user: User) -> list[ActivityWeek]:
    """History events per week, zero-filled, so the chart never has gaps."""
    today = datetime.now(timezone.utc).date()
    first = today - timedelta(days=today.weekday(), weeks=ACTIVITY_WEEKS - 1)
    week = func.date_trunc("week", WorkEvent.created_at)
    rows = await db.execute(
        select(cast(week, Date), func.count())
        .where(WorkEvent.user_id == user.id, WorkEvent.created_at >= first)
        .group_by(week)
    )
    counts = dict(rows.all())
    return [ActivityWeek(week=first + timedelta(weeks=i), changes=counts.get(first + timedelta(weeks=i), 0)) for i in range(ACTIVITY_WEEKS)]


@router.get("/portfolio", response_model=PortfolioSettings)
async def get_portfolio(user: User = Depends(get_current_user)):
    return portfolio.load(user.profile.portfolio)


@router.put("/portfolio", response_model=PortfolioSettings)
async def save_portfolio(payload: PortfolioSettings, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if payload.featured:
        owned = set(
            (await db.execute(select(WorkItem.id).where(WorkItem.id.in_(payload.featured), WorkItem.user_id == user.id))).scalars()
        )
        if missing := [w for w in payload.featured if w not in owned]:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"{len(missing)} featured item(s) aren't yours")
    user.profile.portfolio = payload.model_dump(mode="json")
    await db.commit()
    return payload


@router.patch("/profile", response_model=ProfileOut)
async def update_profile(
    payload: ProfileUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    profile = user.profile
    data = payload.model_dump(exclude_unset=True)
    ensure_can_publish(user, data.get("visibility"))

    new_username = data.pop("username", None)
    if new_username and new_username != profile.username:
        taken = await db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.username == new_username, User.id != user.id)
        ) or await db.scalar(
            select(func.count()).select_from(Profile).where(Profile.username == new_username, Profile.user_id != user.id)
        )
        if taken:
            raise HTTPException(status.HTTP_409_CONFLICT, f"@{new_username} is already taken")
        profile.username = new_username
        user.username = new_username

    for field in ("headline", "bio"):
        if field in data:
            data[field] = (data[field] or "").strip() or None
    if data.get("display_name") is not None:
        data["display_name"] = data["display_name"].strip()
        user.fullname = data["display_name"]
    for field, value in data.items():
        if value is not None or field in ("headline", "bio"):
            setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return profile


@router.post("/avatar", response_model=ProfileOut)
async def upload_avatar(file: UploadFile, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user.profile.avatar_url = await save_upload(db, user, file, IMAGES, public=True)
    await db.commit()
    await db.refresh(user.profile)
    return user.profile


@router.delete("/avatar", response_model=ProfileOut)
async def remove_avatar(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user.profile.avatar_url = None
    await db.commit()
    await db.refresh(user.profile)
    return user.profile
