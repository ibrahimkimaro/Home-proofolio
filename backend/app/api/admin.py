import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CODE_TTL, require_admin
from app.core.database import get_db
from app.models.otp import OtpLog
from app.models.session import Session as SessionModel
from app.models.user import User
from app.models.work import WorkItem
from app.schemas.admin import (
    AdminStatsOut,
    AdminUserOut,
    AdminUserUpdate,
    AdminWorkOut,
    AdminWorkUpdate,
)
from app.services.lifecycle import check_state
from app.services.platform import audit
from app.schemas.otp import OtpGenerateRequest, OtpGenerateResponse, OtpLogOut

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/stats", response_model=AdminStatsOut)
async def get_admin_stats(db: AsyncSession = Depends(get_db)):
    user_count = await db.scalar(select(func.count(User.id))) or 0
    work_count = await db.scalar(select(func.count(WorkItem.id))) or 0
    otp_sent_count = await db.scalar(select(func.count(OtpLog.id))) or 0
    otp_verified_count = (
        await db.scalar(select(func.count(OtpLog.id)).where(OtpLog.is_verified == True)) or 0
    )
    admin_count = await db.scalar(select(func.count(User.id)).where(User.is_admin == True)) or 0

    return AdminStatsOut(
        total_users=user_count,
        total_works=work_count,
        total_otps_sent=otp_sent_count,
        total_otps_verified=otp_verified_count,
        admin_count=admin_count,
    )


@router.get("/users", response_model=list[AdminUserOut])
async def list_admin_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).options(selectinload(User.work_items)).order_by(User.created_at.desc())
    )
    return [_user_out(u) for u in result.scalars().all()]


def _user_out(u: User) -> AdminUserOut:
    return AdminUserOut(
        id=u.id,
        email=u.email,
        fullname=u.fullname,
        username=u.username,
        phone_number=u.phone_number,
        is_admin=u.is_admin,
        is_active=u.is_active,
        created_at=u.created_at,
        works_count=len(u.work_items),
    )


async def _get_other_user(user_id: uuid.UUID, admin: User, db: AsyncSession) -> User:
    if user_id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot modify your own admin account here")
    result = await db.execute(
        select(User).options(selectinload(User.work_items)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_admin_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_other_user(user_id, admin, db)
    changes = payload.model_dump(exclude_none=True)
    for field, value in changes.items():
        setattr(user, field, value)
    if changes.get("is_active") is False:
        # Suspending takes effect now: sign the member out on every device.
        await db.execute(delete(SessionModel).where(SessionModel.user_id == user.id))
    audit(db, admin, "user.update", user.username, **changes)
    await db.commit()
    await db.refresh(user, ["work_items"])
    return _user_out(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_user(
    user_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_other_user(user_id, admin, db)
    audit(db, admin, "user.delete", target.username, email=target.email)
    # DB-level delete: FKs cascade sessions/profile/works and null out otp_logs.
    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()


def _work_out(w: WorkItem) -> AdminWorkOut:
    return AdminWorkOut(
        id=w.id,
        title=w.title,
        work_type=w.work_type,
        status=w.status,
        visibility=w.visibility,
        skills=w.skills or [],
        owner_id=w.user_id,
        owner_username=w.user.username,
        owner_fullname=w.user.fullname,
        created_at=w.created_at,
        updated_at=w.updated_at,
    )


async def _get_work(work_id: uuid.UUID, db: AsyncSession) -> WorkItem:
    result = await db.execute(
        select(WorkItem).options(selectinload(WorkItem.user)).where(WorkItem.id == work_id)
    )
    work = result.scalar_one_or_none()
    if work is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Work item not found")
    return work


@router.get("/works", response_model=list[AdminWorkOut])
async def list_admin_works(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WorkItem).options(selectinload(WorkItem.user)).order_by(WorkItem.updated_at.desc())
    )
    return [_work_out(w) for w in result.scalars().all()]


@router.patch("/works/{work_id}", response_model=AdminWorkOut)
async def update_admin_work(
    work_id: uuid.UUID, payload: AdminWorkUpdate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    work = await _get_work(work_id, db)
    changes = payload.model_dump(exclude_none=True)
    if "status" in changes:
        try:
            check_state(work.work_type, changes["status"])
        except ValueError as e:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e))
    for field, value in changes.items():
        setattr(work, field, value)
    audit(db, admin, "work.moderate", str(work_id), title=work.title, **{k: getattr(v, "value", v) for k, v in changes.items()})
    await db.commit()
    return _work_out(await _get_work(work_id, db))


@router.delete("/works/{work_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_work(work_id: uuid.UUID, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    work = await _get_work(work_id, db)
    audit(db, admin, "work.delete", str(work_id), title=work.title, owner=work.user.username)
    await db.delete(work)
    await db.commit()


@router.get("/otps", response_model=list[OtpLogOut])
async def list_admin_otps(limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(OtpLog).order_by(OtpLog.created_at.desc()).limit(limit)
    )
    return result.scalars().all()


@router.post("/otps/{otp_id}/sent", response_model=OtpLogOut)
async def mark_otp_sent(otp_id: uuid.UUID, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """The admin has texted or emailed this code. The member's 15 minutes start now."""
    otp = await db.get(OtpLog, otp_id)
    if otp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Code not found")
    now = datetime.now(timezone.utc)
    if otp.is_verified or otp.expires_at <= now:
        raise HTTPException(status.HTTP_409_CONFLICT, "This code was already used or has expired")
    otp.delivery_status = "sent"
    otp.expires_at = now + CODE_TTL
    audit(db, admin, "otp.sent", str(otp.id), destination=otp.destination, channel=otp.channel)
    await db.commit()
    await db.refresh(otp)
    return otp


@router.post("/otps/simulate", response_model=OtpGenerateResponse)
async def admin_simulate_otp(payload: OtpGenerateRequest, db: AsyncSession = Depends(get_db)):
    code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    otp = OtpLog(
        destination=payload.destination.strip(),
        channel=payload.channel,
        code=code,
        purpose=payload.purpose,
        delivery_status="simulated_sent",
        expires_at=expires_at,
    )
    db.add(otp)
    await db.commit()

    return OtpGenerateResponse(
        success=True,
        message=f"Simulated OTP dispatched to {payload.destination}",
        destination=payload.destination,
        channel=payload.channel,
        code=code,
        expires_in_seconds=600,
    )
