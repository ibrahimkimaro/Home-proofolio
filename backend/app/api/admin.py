import asyncio
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.auth import _email_code
from app.api.deps import CODE_TTL, require_admin, start_activation_clock
from app.core.database import get_db
from app.models.business import Role
from app.models.otp import OtpLog
from app.models.profile import Profile, Visibility
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
from app.services import mailer, realtime, webpush
from app.services.activity import notify
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
        select(User)
        .options(selectinload(User.work_items), selectinload(User.profile))
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    user_ids = [u.id for u in users]
    roles_map: dict[uuid.UUID, list[str]] = {uid: [] for uid in user_ids}
    if user_ids:
        role_result = await db.execute(
            select(Role.user_id, Role.title)
            .where(Role.user_id.in_(user_ids))
            .order_by(Role.start_date.desc().nulls_last(), Role.created_at.desc())
        )
        for uid, title in role_result.all():
            if title and title not in roles_map[uid]:
                roles_map[uid].append(title)

    return [_user_out(u, roles_map.get(u.id, [])) for u in users]


def _user_out(u: User, roles: list[str] | None = None) -> AdminUserOut:
    roles_list = roles or []
    headline = u.profile.headline if u.profile else None
    primary_role = headline or (roles_list[0] if roles_list else None)
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
        headline=headline,
        role=primary_role,
        roles=roles_list,
    )


async def _get_other_user(user_id: uuid.UUID, admin: User, db: AsyncSession) -> User:
    if user_id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot modify your own admin account here")
    result = await db.execute(
        select(User).options(selectinload(User.work_items), selectinload(User.profile)).where(User.id == user_id)
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
    if "is_active" in changes:
        user.is_active = changes["is_active"]
        if not user.is_active:
            await db.execute(delete(SessionModel).where(SessionModel.user_id == user.id))
    if "is_admin" in changes:
        user.is_admin = changes["is_admin"]
    if "fullname" in changes:
        user.fullname = changes["fullname"]
    if "headline" in changes:
        if user.profile:
            user.profile.headline = changes["headline"].strip() or None
    if "role_title" in changes:
        clean_title = changes["role_title"].strip()
        if clean_title:
            if user.profile and "headline" not in changes:
                user.profile.headline = clean_title
            existing_role = await db.scalar(
                select(Role).where(Role.user_id == user.id).order_by(Role.created_at.desc()).limit(1)
            )
            if existing_role:
                existing_role.title = clean_title
            else:
                db.add(Role(user_id=user.id, title=clean_title, trust="confirmed", visibility=Visibility.PUBLIC))

    audit(db, admin, "user.update", user.username, **changes)
    await db.commit()
    await db.refresh(user, ["work_items", "profile"])
    role_rows = await db.execute(
        select(Role.title).where(Role.user_id == user.id).order_by(Role.created_at.desc())
    )
    user_roles = [r for r in role_rows.scalars().all() if r]
    return _user_out(user, user_roles)


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
    otp.sent_via = "admin"
    otp.expires_at = now + CODE_TTL
    audit(db, admin, "otp.sent", str(otp.id), destination=otp.destination, channel=otp.channel)
    member_id = otp.user_id
    activation = otp.purpose in ("activation", "registration")
    if member_id and activation:
        # The 15 minutes run from now; after them an account that still isn't active is suspended.
        await start_activation_clock(db, member_id)
        notify(db, member_id, "activation", "Your activation code is here", "Enter it within 15 minutes to activate your account.", "/home")
    await db.commit()
    await db.refresh(otp)
    if member_id:  # it is now usable: show them the banner (and a sound), and a push if the site is closed
        await realtime.push([realtime.to_user(member_id, "notifications_changed")])
        if activation:
            await webpush.push_to_users(
                [member_id],
                {"title": "Your activation code is here", "body": "Enter it within 15 minutes to activate your account.", "url": "/home", "tag": "activation"},
                "activation",
            )
    return otp


@router.delete("/otps/{otp_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_otp(otp_id: uuid.UUID, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Remove one code from the list. If it was still waiting, the member needs to ask for a new one."""
    otp = await db.get(OtpLog, otp_id)
    if otp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Code not found")
    audit(db, admin, "otp.delete", str(otp.id), destination=otp.destination, purpose=otp.purpose)
    member_id = otp.user_id
    await db.delete(otp)
    await db.commit()
    if member_id:
        await realtime.push([realtime.to_user(member_id, "notifications_changed")])


@router.post("/otps/clear")
async def clear_otps(scope: str = "finished", admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Empty the list. scope=finished: used and expired codes (nothing a member can still use); scope=all: every code."""
    if scope not in ("finished", "all"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "scope must be finished or all")
    q = delete(OtpLog)
    if scope == "finished":
        q = q.where((OtpLog.is_verified.is_(True)) | (OtpLog.expires_at <= datetime.now(timezone.utc)))
    removed = (await db.execute(q)).rowcount or 0
    audit(db, admin, "otp.clear", scope, removed=removed)
    await db.commit()
    return {"removed": removed}


@router.post("/otps/{otp_id}/email", status_code=status.HTTP_202_ACCEPTED)
async def resend_otp_email(
    otp_id: uuid.UUID, background: BackgroundTasks, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    """Email this code again (for example after the member corrected a mistyped address with an admin)."""
    otp = await db.get(OtpLog, otp_id)
    if otp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Code not found")
    if otp.channel != "email" or otp.purpose != "activation":
        raise HTTPException(status.HTTP_409_CONFLICT, "Only activation codes for an email address can be emailed")
    if otp.is_verified or otp.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_409_CONFLICT, "This code was already used or has expired")
    if not mailer.configured():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email sending isn't set up. Send the code by hand.")
    audit(db, admin, "otp.email_again", str(otp.id), destination=otp.destination)
    await db.commit()
    background.add_task(_email_code, otp_id)
    return {"queued": True}


_PURPOSES = {
    "activation": "Your activation code",
    "registration": "Your activation code",
    "login": "Your sign-in code",
    "password_change": "Your password-change code",
    "phone_verification": "Your phone verification code",
    "admin_test": "A test code",
}


def _digits(s: str | None) -> str:
    return "".join(c for c in (s or "") if c.isdigit())


def _mask_email(e: str) -> str:
    name, _, domain = e.partition("@")
    return f"{name[:1]}•••@{domain}"


async def _member_for(db: AsyncSession, channel: str, destination: str) -> User | None:
    """The one member a code is for, if that email or phone number belongs to exactly one (never a guest).
    A number two members share is ambiguous: better to tell nobody than the wrong person."""
    if channel == "email":
        cond = func.lower(User.email) == destination.lower()
    else:
        tail = _digits(destination)[-9:]
        if len(tail) < 7:
            return None
        cond = (User.phone_number.is_not(None)) & (
            func.right(func.regexp_replace(User.phone_number, "[^0-9]", "", "g"), len(tail)) == tail
        )
    found = (await db.execute(select(User).where(User.is_guest.is_(False), cond).limit(2))).scalars().all()
    return found[0] if len(found) == 1 else None


@router.get("/otps/people")
async def find_code_recipients(q: str = "", db: AsyncSession = Depends(get_db)):
    """Members to pick when sending a code: search by name, username, email or phone."""
    stmt = select(User).where(User.is_active, User.is_guest.is_(False)).order_by(User.fullname).limit(8)
    if term := q.strip()[:80]:
        like = f"%{term}%"
        digits = _digits(term)
        cond = (User.fullname.ilike(like)) | (User.username.ilike(like)) | (User.email.ilike(like))
        if len(digits) >= 3:
            cond = cond | func.regexp_replace(func.coalesce(User.phone_number, ""), "[^0-9]", "", "g").like(f"%{digits}%")
        stmt = stmt.where(cond)
    rows = (await db.execute(stmt)).scalars().all()
    return [{"id": u.id, "name": u.fullname, "username": u.username, "email": u.email, "phone": u.phone_number} for u in rows]


@router.post("/otps/send", response_model=OtpGenerateResponse)
async def admin_send_code(payload: OtpGenerateRequest, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Send a verification code (account verification, 2FA sign-in, registration, password change, phone verification).
    An email goes out straight away. A phone number can't be texted from here, so that code waits in "Codes to send"
    for the admin to send by SMS. If the address belongs to a member, they are told in the app (never with the code)."""
    channel = payload.channel
    destination = payload.destination.strip()
    if channel not in ("email", "phone"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Choose email or phone")
    if channel == "email" and ("@" not in destination or " " in destination):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "That doesn't look like an email address")
    if channel == "phone" and len(_digits(destination)) < 7:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "That doesn't look like a phone number")
    purpose = payload.purpose if payload.purpose in _PURPOSES else "admin_test"

    member = await _member_for(db, channel, destination)
    code = f"{secrets.randbelow(900000) + 100000}"
    now = datetime.now(timezone.utc)
    otp = OtpLog(
        user_id=member.id if member else None,
        destination=destination,
        channel=channel,
        code=code,
        purpose=purpose,
        delivery_status="awaiting_admin",
        expires_at=now + CODE_TTL,
    )

    delivery, problem = "manual", None
    if channel == "email" and mailer.configured():
        mail = mailer.code_mail(destination, member.fullname if member else None, code, int(CODE_TTL.total_seconds() // 60), purpose)
        problem = (await asyncio.to_thread(mailer.send_many, [mail]))[0]
        if problem is None:
            otp.delivery_status, otp.sent_via, delivery = "sent", "email", "emailed"
    db.add(otp)

    if member:
        label = _PURPOSES[purpose]
        if delivery == "emailed":
            notify(db, member.id, "code", f"{label} was emailed to you",
                   f"Check your inbox ({_mask_email(destination)}). Never share it with anyone: we will never ask for it.")
        else:
            where = "to your phone by SMS" if channel == "phone" else "to your email"
            notify(db, member.id, "code", f"{label} is on its way",
                   f"Our team is sending it {where}. Never share it with anyone: we will never ask for it.")
    audit(db, admin, "otp.send", destination, channel=channel, purpose=purpose, delivery=delivery)
    await db.commit()
    if member:  # their banner and bell update right now (best effort)
        await realtime.push([realtime.to_user(member.id, "notifications_changed")])

    if delivery == "emailed":
        message = f"Emailed to {destination}" + (f" ({member.fullname})" if member else "")
    elif channel == "phone":
        message = f"Send this code to {destination} by SMS, then press Mark sent in Codes to send"
    elif problem:
        message = f"Couldn't email {destination} ({problem}). It's waiting in Codes to send: send it by hand"
    else:
        message = f"Email sending isn't set up. It's waiting in Codes to send: send it to {destination} by hand"
    return OtpGenerateResponse(
        success=delivery == "emailed", message=message, destination=destination, channel=channel, code=code,
        expires_in_seconds=int(CODE_TTL.total_seconds()), delivery=delivery, user_name=member.fullname if member else None,
    )
