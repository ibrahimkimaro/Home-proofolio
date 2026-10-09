import asyncio
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Body, Cookie, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CODE_TTL, UNSENT_TTL, SESSION_COOKIE_NAME, get_current_user, purge_unverified, start_activation_clock
from app.core import throttle
from app.core.database import AsyncSessionLocal, get_db
from app.services import mailer, realtime, webpush
from app.services.activity import client_ip, device_name, notify, record
from app.services.platform import get_setting
from app.core.security import (
    generate_session_token,
    hash_password,
    hash_session_token,
    verify_password,
)
from app.models.activity import SecurityEvent
from app.models.otp import OtpLog
from app.models.profile import Profile, Visibility
from app.models.session import Session as SessionModel
from app.models.user import User
from app.schemas.auth import (
    USERNAME_RE,
    LoginRequest,
    LogoutRequest,
    RegisterRequest,
    ActivationStatus,
    UserOut,
    UsernameCheckOut,
    SendCodeRequest,
    VerifyAccountRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_TTL_DAYS = 30


async def _create_session_cookie(response: Response, db: AsyncSession, user_id, request: Request | None = None) -> None:
    token = generate_session_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)
    agent = (request.headers.get("user-agent") or "")[:300] if request else None
    db.add(
        SessionModel(
            user_id=user_id, token_hash=hash_session_token(token), expires_at=expires_at, user_agent=agent,
            ip=client_ip(request) if request else None, last_seen_at=datetime.now(timezone.utc),
        )
    )
    await db.commit()
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=SESSION_TTL_DAYS * 24 * 3600,
        path="/",
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest, request: Request, response: Response, background: BackgroundTasks, db: AsyncSession = Depends(get_db)
):
    reg = await get_setting(db, "registration")
    if not reg.get("open", True):
        raise HTTPException(status.HTTP_403_FORBIDDEN, reg.get("closed_message") or "Sign-ups are closed")
    await purge_unverified(db)  # abandoned sign-ups shouldn't hold on to an email or username
    existing = await db.execute(
        select(User).where((User.email == payload.email) | (User.username == payload.username))
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or username already registered")

    existing_username = await db.execute(select(Profile).where(Profile.username == payload.username))
    if existing_username.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already taken")

    resolved_fullname = payload.fullname or payload.display_name or payload.username
    resolved_display_name = payload.display_name or payload.fullname or payload.username

    # Every new account starts suspended until it enters the code an admin sends it.
    phone = (payload.phone_number or "").strip() or None
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        fullname=resolved_fullname,
        username=payload.username,
        phone_number=phone,
        otp_pending=True,
    )
    # With email sending set up the code goes to their inbox by itself; otherwise an admin delivers it by hand.
    code = _new_code(user, "email" if mailer.configured() or not phone else "phone")
    db.add(code)
    # BR-01: nothing is public without an explicit member action.
    user.profile = Profile(
        username=payload.username, display_name=resolved_display_name, visibility=Visibility.PRIVATE
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or username already taken")

    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == user.id)
    )
    user = result.scalar_one()
    if code.channel == "email" and mailer.configured():
        background.add_task(_email_code, code.id)
    record(db, "signup", request, user_id=user.id, email=user.email)
    await _create_session_cookie(response, db, user.id, request)
    return user


@router.get("/check-username", response_model=UsernameCheckOut)
async def check_username(username: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db)):
    clean_username = username.strip().lower()

    if len(clean_username) < 3 or len(clean_username) > 50 or not USERNAME_RE.match(clean_username):
        return UsernameCheckOut(
            available=False,
            username=clean_username,
            message="Must be 3-50 lowercase letters, numbers, or hyphens (cannot start/end with hyphen)",
            suggestions=[],
        )

    # Check User & Profile
    existing_user = await db.scalar(select(User.id).where(User.username == clean_username))
    existing_profile = await db.scalar(select(Profile.id).where(Profile.username == clean_username))

    if existing_user is not None or existing_profile is not None:
        # Username is taken, generate smart suggestions
        candidate_pool = [
            f"{clean_username}-kimmy",
            f"{clean_username}kimmy",
            f"{clean_username}-dev",
            f"{clean_username}2026",
            f"the-{clean_username}",
        ]
        existing_res = await db.execute(
            select(User.username).where(User.username.in_(candidate_pool))
        )
        taken = set(existing_res.scalars().all())
        suggestions = [c for c in candidate_pool if c not in taken][:4]

        return UsernameCheckOut(
            available=False,
            username=clean_username,
            message=f"@{clean_username} is already taken",
            suggestions=suggestions,
        )

    return UsernameCheckOut(
        available=True,
        username=clean_username,
        message=f"@{clean_username} is available!",
        suggestions=[],
    )


@router.post("/login", response_model=UserOut)
async def login(payload: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    # Throttle per account and per client so neither can be brute-forced.
    keys = [f"email:{payload.email.lower()}", f"ip:{client_ip(request) or '?'}"]
    if wait := max(throttle.retry_after(k) for k in keys):
        record(db, "login_locked", request, email=payload.email, wait_s=wait)
        await db.commit()
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Too many attempts. Try again in {max(1, wait // 60)} min.",
            headers={"Retry-After": str(wait)},
        )
    await purge_unverified(db)
    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.email == payload.email)
    )
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        for k in keys:
            throttle.fail(k)
        record(db, "login_failed", request, user_id=user.id if user else None, email=payload.email,
               reason="wrong_password" if user else "unknown_email")
        await db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        record(db, "login_blocked", request, user_id=user.id, email=user.email, reason="suspended")
        await db.commit()
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is inactive")

    throttle.clear(keys[0])
    await _signin_alert(db, user, request)
    record(db, "login_ok", request, user_id=user.id, email=user.email)
    await _create_session_cookie(response, db, user.id, request)
    return user


async def _signin_alert(db: AsyncSession, user: User, request: Request) -> None:
    """Tell the member about a sign-in from a browser this account hasn't used before."""
    agent = (request.headers.get("user-agent") or "")[:300]
    seen = SecurityEvent.user_id == user.id, SecurityEvent.kind.in_(("login_ok", "signup"))
    if await db.scalar(select(SecurityEvent.id).where(*seen, SecurityEvent.user_agent == agent).limit(1)):
        return
    if not await db.scalar(select(SecurityEvent.id).where(*seen).limit(1)):
        return  # no history yet (account from before sign-in tracking): nothing to compare with
    ip = client_ip(request)
    notify(
        db, user.id, "signin", f"New sign-in from {device_name(agent)}",
        f"Signed in{f' from IP {ip}' if ip else ''}. If this wasn't you, sign out everywhere and change your password.",
        "/settings#security",
    )


RESEND_COOLDOWN_S = 30


def _new_code(user: User, channel: str) -> OtpLog:
    """An activation code for the account's own phone or email, queued for an admin to deliver."""
    return OtpLog(
        id=uuid.uuid4(),  # known up front, so the background email can find it
        user=user,
        destination=user.phone_number if channel == "phone" else user.email,
        channel=channel,
        code=f"{secrets.randbelow(900000) + 100000}",
        purpose="activation",
        delivery_status="awaiting_admin",
        expires_at=datetime.now(timezone.utc) + UNSENT_TTL,
    )


log = logging.getLogger(__name__)


async def _email_code(otp_id: uuid.UUID) -> None:
    """Email an activation code, and once it has gone out start its 15-minute clock.
    If email isn't possible the code stays "awaiting_admin", so an admin can still deliver it by hand."""
    async with AsyncSessionLocal() as db:
        otp = await db.get(OtpLog, otp_id)
        user = await db.get(User, otp.user_id) if otp and otp.user_id else None
        if not otp or not user or otp.channel != "email" or otp.is_verified or otp.expires_at <= datetime.now(timezone.utc):
            return
        mail = mailer.code_mail(otp.destination, user.fullname, otp.code, int(CODE_TTL.total_seconds() // 60))
    result = (await asyncio.to_thread(mailer.send_many, [mail]))[0]
    if result:
        log.warning("activation email not sent (%s): the code stays with the admins to deliver", result)
        return
    async with AsyncSessionLocal() as db:
        otp = await db.get(OtpLog, otp_id)
        now = datetime.now(timezone.utc)
        if otp and not otp.is_verified and otp.expires_at > now:  # skip if a newer code replaced it meanwhile
            otp.delivery_status = "sent"
            otp.sent_via = "email"
            otp.expires_at = now + CODE_TTL
            await start_activation_clock(db, otp.user_id)
            notify(db, otp.user_id, "activation", "Your activation code is here",
                   "Enter it within 15 minutes to activate your account.", "/home")
            await db.commit()
            await webpush.push_to_users([otp.user_id], {"title": "Your activation code is here", "body": "Enter it within 15 minutes to activate your account.", "url": "/home", "tag": "activation"}, "activation")
            await realtime.push([realtime.to_user(otp.user_id, "notifications_changed")])


async def _live_code(db: AsyncSession, user: User) -> OtpLog | None:
    return await db.scalar(
        select(OtpLog)
        .where(
            OtpLog.user_id == user.id,
            OtpLog.is_verified == False,  # noqa: E712
            OtpLog.expires_at > datetime.now(timezone.utc),
        )
        .order_by(OtpLog.created_at.desc())
        .limit(1)
    )


def _status(otp: OtpLog, user: User | None = None) -> ActivationStatus:
    now = datetime.now(timezone.utc)
    deadline = user.activation_deadline if user else None
    sent = otp.delivery_status == "sent"
    return ActivationStatus(
        channel="email" if otp.channel == "email" else "phone",
        destination=otp.destination,
        sent=sent,
        expires_in_seconds=max(0, int((otp.expires_at - now).total_seconds())) if sent else None,
        resend_in_seconds=max(0, RESEND_COOLDOWN_S - int((now - otp.created_at).total_seconds())),
        suspends_in_seconds=max(0, int((deadline - now).total_seconds())) if deadline else None,
    )


@router.get("/verify-account", response_model=ActivationStatus | None)
async def activation_status(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Where the member's activation code is (waiting for an admin, or sent), or null if they need a new one."""
    if not current_user.otp_pending:
        return None
    otp = await _live_code(db, current_user)
    return _status(otp, current_user) if otp else None


@router.post("/verify-account/send", response_model=ActivationStatus)
async def send_activation_code(
    payload: SendCodeRequest,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ask for a new code. It replaces any earlier one, so admins never deliver a stale code."""
    if not current_user.otp_pending:
        raise HTTPException(status.HTTP_409_CONFLICT, "This account is already active")
    if payload.channel == "phone" and not current_user.phone_number:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No phone number on this account. Send the code to your email.")
    last = await _live_code(db, current_user)
    if last and (wait := _status(last).resend_in_seconds):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, f"Wait {wait}s before asking for another code.", headers={"Retry-After": str(wait)}
        )
    # Cap requests so nobody can flood the admins' delivery queue.
    key = f"send:{current_user.id}"
    if wait := throttle.retry_after(key):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Too many code requests. Try again in {max(1, wait // 60)} min.",
            headers={"Retry-After": str(wait)},
        )
    throttle.fail(key)

    now = datetime.now(timezone.utc)
    await db.execute(
        update(OtpLog)
        .where(OtpLog.user_id == current_user.id, OtpLog.is_verified == False, OtpLog.expires_at > now)  # noqa: E712
        .values(expires_at=now)
    )
    otp = _new_code(current_user, payload.channel)
    db.add(otp)
    code_id = otp.id
    await db.commit()
    await db.refresh(otp)
    if otp.channel == "email" and mailer.configured():
        background.add_task(_email_code, code_id)
    return _status(otp, current_user)


@router.post("/verify-account", response_model=UserOut)
async def verify_account(
    payload: VerifyAccountRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Activate a suspended account. Five wrong tries cancels the code; the account stays, they send a new one."""
    if current_user.otp_pending:
        key = f"otp:{current_user.id}"
        otp = await _live_code(db, current_user)
        if otp is None:
            raise HTTPException(status.HTTP_410_GONE, "This code has expired. Send a new one.")
        if not secrets.compare_digest(otp.code, payload.code.strip()):
            throttle.fail(key)
            record(db, "otp_failed", request, user_id=current_user.id, email=current_user.email)
            if throttle.retry_after(key):
                throttle.clear(key)
                otp.expires_at = datetime.now(timezone.utc)
                record(db, "otp_cancelled", request, user_id=current_user.id, email=current_user.email)
                await db.commit()
                raise HTTPException(status.HTTP_410_GONE, "Too many wrong tries, so that code was cancelled. Send a new one.")
            await db.commit()
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "That code doesn't match. Check it and try again.")

        otp.is_verified = True
        otp.verified_at = datetime.now(timezone.utc)
        current_user.otp_pending = False
        current_user.activation_deadline = None
        throttle.clear(key)
        notify(db, current_user.id, "activated", "Your account is active",
               "You can now publish your work and make your profile public.", "/profile")
        await db.commit()

    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == current_user.id)
    )
    return result.scalar_one()


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    request: Request,
    payload: LogoutRequest | None = Body(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
):
    if payload and (payload.rating is not None or payload.feedback):
        record(
            db,
            "logout_feedback",
            request,
            user_id=current_user.id,
            email=current_user.email,
            details={
                "rating": payload.rating,
                "feedback": payload.feedback[:1000] if payload.feedback else None,
            },
        )
    else:
        record(db, "logout", request, user_id=current_user.id, email=current_user.email)

    await db.execute(
        SessionModel.__table__.delete().where(
            SessionModel.token_hash == hash_session_token(session_token)
        )
    )
    await db.commit()
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
