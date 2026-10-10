"""Visitor tracking: the site reports each page view (public, rate limited); Admin > Overview reads the counts."""
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core import throttle
from app.core.database import get_db
from app.models.guest import Guest
from app.models.visit import SiteVisit
from app.services.activity import client_ip, device_name

router = APIRouter(tags=["site-visits"])

PER_IP, PAUSE = 120, 300  # page views one address may report before a 5 minute pause


class VisitIn(BaseModel):
    visitor_id: str = Field(min_length=10, max_length=64)
    path: str = Field(min_length=1, max_length=200)
    referrer: str | None = Field(default=None, max_length=200)


@router.post("/track/visit", status_code=204)
async def track_visit(body: VisitIn, request: Request, db: AsyncSession = Depends(get_db)):
    ip = client_ip(request)
    if throttle.retry_after(f"visit:{ip}"):
        return
    throttle.fail(f"visit:{ip}", max_attempts=PER_IP, lockout=PAUSE)
    if not body.path.startswith("/") or body.path.startswith(("/admin", "/_next")):
        return
    db.add(SiteVisit(
        visitor_id="".join(c for c in body.visitor_id if c.isalnum() or c in "-_")[:64],
        path=body.path.split("?")[0][:200],
        referrer=body.referrer or None,
        device=device_name(request.headers.get("user-agent")),
        ip_address=ip,
    ))
    await db.commit()


Range = Literal["today", "yesterday", "7d", "30d"]


@router.get("/admin/visits")
async def visits_overview(
    range: Range = Query(default="today"),
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start, end = {
        "today": (midnight, now),
        "yesterday": (midnight - timedelta(days=1), midnight),
        "7d": (midnight - timedelta(days=6), now),
        "30d": (midnight - timedelta(days=29), now),
    }[range]
    in_range = (SiteVisit.created_at >= start) & (SiteVisit.created_at < end + timedelta(seconds=1))

    views = await db.scalar(select(func.count()).select_from(SiteVisit).where(in_range)) or 0
    visitors = await db.scalar(select(func.count(distinct(SiteVisit.visitor_id))).where(in_range)) or 0
    # New = the visitor's first ever view falls inside the range.
    first_seen = select(SiteVisit.visitor_id, func.min(SiteVisit.created_at).label("first")).group_by(SiteVisit.visitor_id).subquery()
    new = await db.scalar(
        select(func.count()).select_from(first_seen).where(first_seen.c.first >= start, first_seen.c.first < end + timedelta(seconds=1))
    ) or 0

    # One point per hour for a single day, per day otherwise.
    hourly = range in ("today", "yesterday")
    bucket = func.date_trunc("hour" if hourly else "day", SiteVisit.created_at)
    rows = (await db.execute(
        select(bucket, func.count(), func.count(distinct(SiteVisit.visitor_id))).where(in_range).group_by(bucket).order_by(bucket)
    )).all()
    have = {r[0]: (r[1], r[2]) for r in rows}
    series: list[dict] = []
    step = timedelta(hours=1) if hourly else timedelta(days=1)
    t = start.replace(minute=0, second=0, microsecond=0)
    while t <= end and len(series) < 400:
        v = have.get(t, (0, 0))
        series.append({"at": t.isoformat(), "views": v[0], "visitors": v[1]})
        t += step

    pages = (await db.execute(
        select(SiteVisit.path, func.count().label("n")).where(in_range).group_by(SiteVisit.path).order_by(func.count().desc()).limit(8)
    )).all()
    uniq = func.count(distinct(SiteVisit.visitor_id))
    devices = (await db.execute(
        select(SiteVisit.device, uniq.label("n")).where(in_range).group_by(SiteVisit.device).order_by(uniq.desc()).limit(6)
    )).all()

    last = func.max(SiteVisit.created_at)
    recent = (await db.execute(
        select(SiteVisit.visitor_id, last.label("last"), func.count().label("n"), func.max(SiteVisit.device), func.max(SiteVisit.ip_address))
        .where(in_range).group_by(SiteVisit.visitor_id).order_by(last.desc()).limit(25)
    )).all()
    guests = {}
    if recent:
        guests = {g.session_id: g for g in (await db.execute(select(Guest).where(Guest.session_id.in_([r[0] for r in recent])))).scalars()}

    return {
        "range": range,
        "views": views,
        "visitors": visitors,
        "new_visitors": new,
        "returning_visitors": max(0, visitors - new),
        "series": series,
        "bucket": "hour" if hourly else "day",
        "top_pages": [{"label": p or "/", "value": n} for p, n in pages],
        "devices": [{"label": d or "Unknown", "value": n} for d, n in devices],
        "recent": [
            {
                "visitor_id": r[0][:8],
                "name": guests[r[0]].name if r[0] in guests else None,
                "email": guests[r[0]].email if r[0] in guests else None,
                "last_seen": r[1].isoformat(),
                "views": r[2],
                "device": r[3],
                "ip": r[4],
            }
            for r in recent
        ],
    }
