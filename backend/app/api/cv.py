"""Curriculum Vitae (side menu > Curriculum Vitae). See app/models/cv.py for what is stored vs live.

GET /me/cv returns the live parts (profile, roles, skills from work items) next to the stored
extras, so the CV changes as soon as the member edits their profile, adds a role or a work item.
A CV is valid once signed; only a signed CV can be shared (/cv/shared/<token>, the QR code).
"""
import base64
import math
import re
import secrets
from collections import Counter
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.files import sign
from app.models.business import Business, Role
from app.models.cv import Cv
from app.models.profile import Profile
from app.models.user import User
from app.models.work import WorkItem

router = APIRouter(tags=["cv"])

Short = Field(default="", max_length=120)
Point = Field(default_factory=list, max_length=8)


class CvLink(BaseModel):
    label: str = Field(max_length=40)
    url: str = Field(max_length=300)

    @field_validator("url")
    @classmethod
    def http_only(cls, v: str) -> str:
        v = v.strip()
        if v and not re.match(r"^https?://", v, re.I):
            v = "https://" + v
        return v


class CvReferee(BaseModel):
    id: str = Field(max_length=40)
    name: str = Field(max_length=120)
    title: str = Short
    organization: str = Short
    phone: str = Field(default="", max_length=40)
    email: str = Field(default="", max_length=160)


class CvEntry(BaseModel):
    """An education entry, or a job that isn't a role on Proofolio."""
    id: str = Field(max_length=40)
    title: str = Field(max_length=160)  # qualification / job title
    organization: str = Short  # school / employer
    place: str = Short
    start: str = Field(default="", max_length=20)
    end: str = Field(default="", max_length=20)
    points: list[str] = Point


class CvLevel(BaseModel):
    name: str = Field(max_length=60)
    level: int = Field(ge=1, le=5)


class CvData(BaseModel):
    # Overrides of the profile (empty = use the profile's).
    name: str = Short
    title: str = Short
    about: str = Field(default="", max_length=1200)
    address: str = Short
    show_phone: bool = True
    show_email: bool = True
    links: list[CvLink] = Field(default_factory=list, max_length=8)
    referees: list[CvReferee] = Field(default_factory=list, max_length=6)
    education: list[CvEntry] = Field(default_factory=list, max_length=10)
    jobs: list[CvEntry] = Field(default_factory=list, max_length=15)
    role_points: dict[str, list[str]] = Field(default_factory=dict)  # role id -> duty bullets
    hidden_roles: list[str] = Field(default_factory=list, max_length=50)
    skills: list[CvLevel] = Field(default_factory=list, max_length=20)  # added or re-rated skills
    hidden_skills: list[str] = Field(default_factory=list, max_length=50)
    languages: list[CvLevel] = Field(default_factory=list, max_length=10)
    hobbies: list[str] = Field(default_factory=list, max_length=12)

    @field_validator("role_points")
    @classmethod
    def bounded_points(cls, v: dict[str, list[str]]) -> dict[str, list[str]]:
        if len(v) > 50:
            raise ValueError("too many roles")
        return {k[:40]: [p[:200] for p in pts[:8]] for k, pts in v.items()}


class SignatureIn(BaseModel):
    data_url: str = Field(max_length=400_000)

    @field_validator("data_url")
    @classmethod
    def png(cls, v: str) -> str:
        prefix = "data:image/png;base64,"
        if not v.startswith(prefix):
            raise ValueError("signature must be a PNG image")
        try:
            raw = base64.b64decode(v[len(prefix):], validate=True)
        except Exception as e:
            raise ValueError("signature is not valid base64") from e
        if not raw.startswith(b"\x89PNG\r\n\x1a\n"):
            raise ValueError("signature must be a PNG image")
        return v


async def _cv_row(db: AsyncSession, user: User) -> Cv:
    row = await db.get(Cv, user.id)
    if row is None:
        row = Cv(user_id=user.id, data={})
        db.add(row)
        await db.flush()
    return row


async def _live(db: AsyncSession, user: User) -> dict:
    """What the CV takes from the rest of Proofolio, freshly read."""
    profile = await db.scalar(select(Profile).where(Profile.user_id == user.id))
    roles = (
        await db.execute(
            select(Role, Business.name)
            .outerjoin(Business, Business.id == Role.business_id)
            .where(Role.user_id == user.id)
            .order_by(Role.end_date.is_not(None), Role.start_date.desc().nulls_last())
        )
    ).all()
    counts: Counter[str] = Counter()
    for skills in await db.scalars(select(WorkItem.skills).where(WorkItem.user_id == user.id)):
        for s in skills or []:
            if isinstance(s, str) and s.strip():
                counts[s.strip()] += 1
    top = counts.most_common(12)
    most = top[0][1] if top else 1
    return {
        "profile": {
            "name": (profile.display_name if profile and profile.display_name else user.fullname) or user.username,
            "title": (profile.headline if profile else None) or "",
            "about": (profile.bio if profile else None) or "",
            "photo": sign(profile.avatar_url) if profile and profile.avatar_url else None,
            "email": user.email,
            "phone": user.phone_number or "",
            "username": user.username,
        },
        "roles": [
            {
                "id": str(r.id),
                "title": r.title,
                "organization": business_name or r.organization_name or "",
                "start": r.start_date.isoformat() if r.start_date else None,
                "end": r.end_date.isoformat() if r.end_date else None,
            }
            for r, business_name in roles
        ],
        # Level 1-5 from how often the skill appears across their work, relative to their top skill.
        "skills": [{"name": n, "level": max(1, math.ceil(5 * c / most)), "count": c} for n, c in top],
    }


def _out(live: dict, row: Cv, public: bool = False) -> dict:
    data = CvData.model_validate(row.data or {}).model_dump()
    out = {
        **live,
        "data": data,
        "signature": row.signature,
        "signed_at": row.signed_at.isoformat() if row.signed_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }
    if public:
        # What the member chose not to show stays private on the shared copy.
        if not data["show_phone"]:
            out["profile"] = {**out["profile"], "phone": ""}
        if not data["show_email"]:
            out["profile"] = {**out["profile"], "email": ""}
    else:
        out["share_token"] = row.share_token
    return out


@router.get("/me/cv")
async def my_cv(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await _cv_row(db, user)
    await db.commit()
    return _out(await _live(db, user), row)


@router.put("/me/cv")
async def save_cv(payload: CvData, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await _cv_row(db, user)
    row.data = payload.model_dump()
    await db.commit()
    await db.refresh(row)
    return _out(await _live(db, user), row)


@router.put("/me/cv/signature")
async def sign_cv(payload: SignatureIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await _cv_row(db, user)
    row.signature, row.signed_at = payload.data_url, datetime.now(timezone.utc)
    await db.commit()
    return {"signed_at": row.signed_at.isoformat()}


@router.delete("/me/cv/signature", status_code=status.HTTP_204_NO_CONTENT)
async def unsign_cv(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await _cv_row(db, user)
    row.signature, row.signed_at = None, None
    row.share_token = None  # an unsigned CV isn't valid, so it can't stay shared
    await db.commit()


@router.post("/me/cv/share")
async def share_cv(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await _cv_row(db, user)
    if not row.signature:
        raise HTTPException(status.HTTP_409_CONFLICT, "Sign your CV before sharing it")
    if not row.share_token:
        row.share_token = secrets.token_urlsafe(24)
    await db.commit()
    return {"share_token": row.share_token}


@router.delete("/me/cv/share", status_code=status.HTTP_204_NO_CONTENT)
async def unshare_cv(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Stop sharing: the old link and QR code stop working."""
    row = await _cv_row(db, user)
    row.share_token = None
    await db.commit()


@router.get("/cv/shared/{token}")
async def shared_cv(token: str, db: AsyncSession = Depends(get_db)):
    row = await db.scalar(select(Cv).where(Cv.share_token == token)) if 16 <= len(token) <= 64 else None
    user = await db.get(User, row.user_id) if row else None
    if not row or not row.signature or not user or not user.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This CV link is not valid")
    return _out(await _live(db, user), row, public=True)
