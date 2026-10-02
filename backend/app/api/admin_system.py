"""Admin > System health: is the app up, how fast, how busy, what's failing."""
import os
import platform
import shutil
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core import monitor
from app.core.database import get_db
from app.api.uploads import UPLOAD_DIR
from app.models.activity import SecurityEvent
from app.models.session import Session as SessionModel
from app.models.user import User
from app.models.work import WorkItem

router = APIRouter(prefix="/admin/system", tags=["admin"], dependencies=[Depends(require_admin)])

# When to call things degraded. ponytail: fixed thresholds; adjust once real traffic shows normal levels.
SLOW_DB_MS = 300
SLOW_P95_MS = 1500
ERROR_RATE = 0.05
LOW_DISK = 0.10


def _dir_size(path) -> int:
    total = 0
    for root, _, files in os.walk(path):
        for f in files:
            try:
                total += os.path.getsize(os.path.join(root, f))
            except OSError:
                pass
    return total


@router.get("/health")
async def system_health(db: AsyncSession = Depends(get_db)):
    issues: list[str] = []

    started = time.perf_counter()
    try:
        await db.execute(text("SELECT 1"))
        db_ms = round((time.perf_counter() - started) * 1000, 1)
        db_ok = True
        db_size = await db.scalar(text("SELECT pg_database_size(current_database())"))
        db_conns = await db.scalar(text("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()"))
        db_version = (await db.scalar(text("SHOW server_version"))) or ""
    except Exception as exc:  # the dashboard must still load when the database is the problem
        db_ok, db_ms, db_size, db_conns, db_version = False, None, None, None, ""
        issues.append(f"Database unreachable: {type(exc).__name__}")
    if db_ok and db_ms > SLOW_DB_MS:
        issues.append(f"Database is slow to answer ({db_ms} ms)")

    traffic = monitor.snapshot(900)
    if traffic["requests"] >= 20 and traffic["errors_5xx"] / traffic["requests"] > ERROR_RATE:
        issues.append(f"{traffic['errors_5xx']} server errors in the last 15 minutes")
    if traffic["p95_ms"] > SLOW_P95_MS:
        issues.append(f"Slow responses (95% under {traffic['p95_ms']} ms)")

    disk = shutil.disk_usage(UPLOAD_DIR if UPLOAD_DIR.exists() else "/")
    if disk.free / disk.total < LOW_DISK:
        issues.append(f"Disk almost full ({round(disk.free / 1e9, 1)} GB free)")

    activity = {}
    if db_ok:
        now = datetime.now(timezone.utc)
        day = now - timedelta(hours=24)
        bucket = func.date_trunc("hour", SecurityEvent.created_at)
        activity = {
            "users": await db.scalar(select(func.count()).select_from(User)),
            "works": await db.scalar(select(func.count()).select_from(WorkItem)),
            "active_sessions": await db.scalar(select(func.count()).select_from(SessionModel).where(SessionModel.expires_at > now)),
            "online_15m": await db.scalar(
                select(func.count(func.distinct(SessionModel.user_id))).where(SessionModel.last_seen_at > now - timedelta(minutes=15))
            ),
            "signups_24h": await db.scalar(select(func.count()).select_from(User).where(User.created_at > day)),
            "logins_24h": await db.scalar(select(func.count()).select_from(SecurityEvent).where(SecurityEvent.kind == "login_ok", SecurityEvent.created_at > day)),
            "hourly": [
                {"hour": h, "logins": logins, "signups": signups}
                for h, logins, signups in (await db.execute(
                    select(bucket, func.count().filter(SecurityEvent.kind == "login_ok"), func.count().filter(SecurityEvent.kind == "signup"))
                    .where(SecurityEvent.created_at > day).group_by(bucket).order_by(bucket)
                )).all()
            ],
        }

    return {
        "status": "down" if not db_ok else "degraded" if issues else "ok",
        "issues": issues,
        "checked_at": datetime.now(timezone.utc),
        "api": {
            "uptime_s": int(time.time() - monitor.STARTED),
            "python": platform.python_version(),
            "pid": os.getpid(),
        },
        "database": {"ok": db_ok, "ping_ms": db_ms, "size_bytes": db_size, "connections": db_conns, "version": db_version},
        "storage": {"uploads_bytes": _dir_size(UPLOAD_DIR) if UPLOAD_DIR.exists() else 0, "disk_free_bytes": disk.free, "disk_total_bytes": disk.total},
        "traffic": traffic,
        "traffic_hour": monitor.snapshot(3600),
        "per_minute": monitor.per_minute(30),
        "recent_errors": monitor.recent_errors(),
        "activity": activity,
    }
