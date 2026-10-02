"""Admin > Security monitoring and Devices: sign-in activity, attack detection, IP blocks, every signed-in device."""
import ipaddress
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.activity import BlockedIp, SecurityEvent
from app.models.session import Session as SessionModel
from app.models.user import User
from app.services.activity import client_ip, device_name, forget_blocks, is_private
from app.services.platform import audit

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

# Detection thresholds. ponytail: fixed rules over the event log; tune here as real traffic shows what's normal.
BRUTE_FORCE = (10, timedelta(minutes=15))  # failed logins from one IP
SPRAYING = (5, timedelta(hours=1))  # distinct accounts failed from one IP
TARGETED = (5, 3, timedelta(hours=1))  # failures on one account, from at least N IPs
OTP_GUESSING = (5, timedelta(hours=1))  # wrong activation codes on one account


def _since(delta: timedelta) -> datetime:
    return datetime.now(timezone.utc) - delta


async def _alerts(db: AsyncSession, blocked: set[str]) -> list[dict]:
    """Suspicious patterns in the event log, most serious first."""
    alerts: list[dict] = []
    failed = SecurityEvent.kind == "login_failed"

    n, window = BRUTE_FORCE
    for ip, count, last in (await db.execute(
        select(SecurityEvent.ip, func.count(), func.max(SecurityEvent.created_at))
        .where(failed, SecurityEvent.created_at > _since(window), SecurityEvent.ip.is_not(None))
        .group_by(SecurityEvent.ip).having(func.count() >= n)
    )).all():
        alerts.append({"rule": "brute_force", "severity": "high", "ip": ip, "email": None, "count": count, "last_seen": last,
                       "title": "Password guessing from one address",
                       "detail": f"{count} failed sign-ins from {ip} in the last 15 minutes."})

    n, window = SPRAYING
    for ip, accounts, last in (await db.execute(
        select(SecurityEvent.ip, func.count(distinct(SecurityEvent.email)), func.max(SecurityEvent.created_at))
        .where(failed, SecurityEvent.created_at > _since(window), SecurityEvent.ip.is_not(None))
        .group_by(SecurityEvent.ip).having(func.count(distinct(SecurityEvent.email)) >= n)
    )).all():
        alerts.append({"rule": "spraying", "severity": "high", "ip": ip, "email": None, "count": accounts, "last_seen": last,
                       "title": "One address trying many accounts",
                       "detail": f"{ip} failed to sign in to {accounts} different accounts in the last hour."})

    n, ips, window = TARGETED
    for email, count, distinct_ips, last in (await db.execute(
        select(SecurityEvent.email, func.count(), func.count(distinct(SecurityEvent.ip)), func.max(SecurityEvent.created_at))
        .where(failed, SecurityEvent.created_at > _since(window), SecurityEvent.email.is_not(None))
        .group_by(SecurityEvent.email).having(func.count() >= n, func.count(distinct(SecurityEvent.ip)) >= ips)
    )).all():
        alerts.append({"rule": "targeted", "severity": "medium", "ip": None, "email": email, "count": count, "last_seen": last,
                       "title": "One account attacked from many places",
                       "detail": f"{count} failed sign-ins to {email} from {distinct_ips} addresses in the last hour."})

    n, window = OTP_GUESSING
    for email, count, last in (await db.execute(
        select(SecurityEvent.email, func.count(), func.max(SecurityEvent.created_at))
        .where(SecurityEvent.kind == "otp_failed", SecurityEvent.created_at > _since(window))
        .group_by(SecurityEvent.email).having(func.count() >= n)
    )).all():
        alerts.append({"rule": "otp_guessing", "severity": "medium", "ip": None, "email": email, "count": count, "last_seen": last,
                       "title": "Activation code guessing",
                       "detail": f"{count} wrong activation codes for {email} in the last hour."})

    for a in alerts:
        a["blocked"] = bool(a["ip"]) and a["ip"] in blocked
    order = {"high": 0, "medium": 1, "low": 2}
    return sorted(alerts, key=lambda a: (order[a["severity"]], -a["last_seen"].timestamp()))


@router.get("/security/overview")
async def security_overview(hours: int = Query(24, ge=1, le=24 * 30), db: AsyncSession = Depends(get_db)):
    since = _since(timedelta(hours=hours))
    counts = dict((await db.execute(
        select(SecurityEvent.kind, func.count()).where(SecurityEvent.created_at > since).group_by(SecurityEvent.kind)
    )).all())
    # Hourly sign-ins vs failures for the chart (last 24h regardless of the window).
    bucket = func.date_trunc("hour", SecurityEvent.created_at)
    timeline = [
        {"hour": h, "ok": ok, "failed": failed}
        for h, ok, failed in (await db.execute(
            select(bucket,
                   func.count().filter(SecurityEvent.kind == "login_ok"),
                   func.count().filter(SecurityEvent.kind.in_(("login_failed", "login_locked"))))
            .where(SecurityEvent.created_at > _since(timedelta(hours=24)))
            .group_by(bucket).order_by(bucket)
        )).all()
    ]
    top_ips = [
        {"ip": ip, "failed": n, "last_seen": last}
        for ip, n, last in (await db.execute(
            select(SecurityEvent.ip, func.count(), func.max(SecurityEvent.created_at))
            .where(SecurityEvent.kind == "login_failed", SecurityEvent.created_at > since, SecurityEvent.ip.is_not(None))
            .group_by(SecurityEvent.ip).order_by(func.count().desc()).limit(8)
        )).all()
    ]
    blocked = set((await db.execute(select(BlockedIp.ip))).scalars())
    active_sessions = await db.scalar(
        select(func.count()).select_from(SessionModel).where(SessionModel.expires_at > datetime.now(timezone.utc))
    )
    return {
        "hours": hours,
        "counts": counts,
        "active_sessions": active_sessions or 0,
        "alerts": await _alerts(db, blocked),
        "top_ips": [{**t, "blocked": t["ip"] in blocked} for t in top_ips],
        "timeline": timeline,
    }


@router.get("/security/events")
async def security_events(
    kind: str | None = None,
    ip: str | None = None,
    email: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    q = select(SecurityEvent).order_by(SecurityEvent.created_at.desc()).limit(limit)
    if kind:
        q = q.where(SecurityEvent.kind == kind)
    if ip:
        q = q.where(SecurityEvent.ip == ip.strip())
    if email:
        q = q.where(SecurityEvent.email.ilike(f"%{email.strip()}%"))
    return [
        {"id": e.id, "kind": e.kind, "ip": e.ip, "email": e.email, "device": device_name(e.user_agent),
         "details": e.details, "created_at": e.created_at}
        for e in (await db.execute(q)).scalars()
    ]


class BlockIn(BaseModel):
    ip: str
    reason: str = Field(default="", max_length=200)
    hours: int | None = Field(default=None, ge=1, le=24 * 365)  # None = until removed

    @field_validator("ip")
    @classmethod
    def valid_ip(cls, v: str) -> str:
        try:
            return str(ipaddress.ip_address(v.strip()))
        except ValueError:
            raise ValueError("Enter a valid IP address")


@router.get("/security/blocks")
async def list_blocks(db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    rows = await db.execute(select(BlockedIp).order_by(BlockedIp.created_at.desc()))
    return [
        {"ip": b.ip, "reason": b.reason, "expires_at": b.expires_at, "created_at": b.created_at,
         "active": b.expires_at is None or b.expires_at > now}
        for b in rows.scalars()
    ]


@router.post("/security/blocks", status_code=status.HTTP_201_CREATED)
async def block_ip(payload: BlockIn, request: Request, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if is_private(payload.ip):
        # Our own proxy and local network show up with private addresses: blocking one could lock everyone out.
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Private and local addresses can't be blocked")
    if payload.ip == client_ip(request):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "That's your own address")
    expires = datetime.now(timezone.utc) + timedelta(hours=payload.hours) if payload.hours else None
    row = await db.get(BlockedIp, payload.ip)
    if row is None:
        db.add(BlockedIp(ip=payload.ip, reason=payload.reason, blocked_by=admin.id, expires_at=expires))
    else:
        row.reason, row.expires_at, row.blocked_by = payload.reason, expires, admin.id
    audit(db, admin, "security.block_ip", payload.ip, reason=payload.reason, hours=payload.hours)
    await db.commit()
    forget_blocks()
    return {"ip": payload.ip, "expires_at": expires}


@router.delete("/security/blocks/{ip}", status_code=status.HTTP_204_NO_CONTENT)
async def unblock_ip(ip: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(BlockedIp).where(BlockedIp.ip == ip))
    audit(db, admin, "security.unblock_ip", ip)
    await db.commit()
    forget_blocks()


# ---------- devices & sessions ----------

@router.get("/sessions")
async def all_sessions(
    user_id: uuid.UUID | None = None, q: str | None = None, limit: int = Query(200, ge=1, le=500), db: AsyncSession = Depends(get_db)
):
    """Every signed-in device, most recently used first."""
    query = (
        select(SessionModel, User.username, User.email, User.fullname, User.is_admin)
        .join(User, User.id == SessionModel.user_id)
        .where(SessionModel.expires_at > datetime.now(timezone.utc))
        .order_by(func.coalesce(SessionModel.last_seen_at, SessionModel.created_at).desc())
        .limit(limit)
    )
    if user_id:
        query = query.where(SessionModel.user_id == user_id)
    if q:
        term = f"%{q.strip()}%"
        query = query.where(User.username.ilike(term) | User.email.ilike(term) | SessionModel.ip.ilike(term))
    return [
        {"id": s.id, "user_id": s.user_id, "username": username, "email": email, "name": fullname, "is_admin": is_admin,
         "device": device_name(s.user_agent), "user_agent": s.user_agent, "ip": s.ip,
         "created_at": s.created_at, "last_seen_at": s.last_seen_at or s.created_at}
        for s, username, email, fullname, is_admin in (await db.execute(query)).all()
    ]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def end_session(session_id: uuid.UUID, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    s = await db.get(SessionModel, session_id)
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    audit(db, admin, "session.end", str(s.user_id), device=device_name(s.user_agent), ip=s.ip)
    await db.delete(s)
    await db.commit()


@router.delete("/users/{user_id}/sessions", status_code=status.HTTP_204_NO_CONTENT)
async def end_all_sessions(user_id: uuid.UUID, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Use Settings to sign out your own devices")
    await db.execute(delete(SessionModel).where(SessionModel.user_id == user_id))
    audit(db, admin, "session.end_all", str(user_id))
    await db.commit()
