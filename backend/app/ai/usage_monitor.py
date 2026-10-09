"""AI usage tracking, quota enforcement, and Gemini rate-limit monitoring."""
import logging
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from sqlalchemy import Date, and_, cast, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.ai_usage import AiUsageLog, AiUserQuota
from app.models.user import User

log = logging.getLogger("app.ai.usage_monitor")


class QuotaExceededError(Exception):
    """Raised when a user's AI quota is exceeded or disabled."""

    def __init__(self, message: str, code: str = "quota_exceeded"):
        super().__init__(message)
        self.message = message
        self.code = code


# Model rate limit constants (based on Google Gemini specifications)
GEMINI_MODEL_SPECS: dict[str, dict[str, Any]] = {
    "gemini-3.5-flash-lite": {
        "display_name": "Gemini 3.5 Flash Lite",
        "rpm_limit": 15,
        "tpm_limit": 250_000,
        "rpd_limit": 1_500,
        "context_window": 1_048_576,
        "max_output_tokens": 65_536,
        "tier": "Standard / Free Tier Available",
    },
    "gemini-3.5-flash": {
        "display_name": "Gemini 3.5 Flash",
        "rpm_limit": 15,
        "tpm_limit": 250_000,
        "rpd_limit": 20,  # Free tier default
        "context_window": 1_048_576,
        "max_output_tokens": 65_536,
        "tier": "Standard Tier",
    },
    "gemini-2.5-flash": {
        "display_name": "Gemini 2.5 Flash",
        "rpm_limit": 15,
        "tpm_limit": 1_000_000,
        "rpd_limit": 1_500,
        "context_window": 1_048_576,
        "max_output_tokens": 8_192,
        "tier": "Flash Tier",
    },
    "gemini-2.5-pro": {
        "display_name": "Gemini 2.5 Pro",
        "rpm_limit": 5,
        "tpm_limit": 125_000,
        "rpd_limit": 50,
        "context_window": 2_097_152,
        "max_output_tokens": 8_192,
        "tier": "Pro Tier",
    },
}

DEFAULT_MODEL_SPECS = {
    "display_name": "Google Gemini",
    "rpm_limit": 15,
    "tpm_limit": 250_000,
    "rpd_limit": 1_500,
    "context_window": 1_048_576,
    "max_output_tokens": 8_192,
    "tier": "Standard Tier",
}


def get_model_specs(model_name: str | None = None) -> dict[str, Any]:
    name = (model_name or settings.gemini_model or "gemini-3.5-flash-lite").lower()
    for key, spec in GEMINI_MODEL_SPECS.items():
        if key in name:
            return spec
    return DEFAULT_MODEL_SPECS


async def check_user_quota(db: AsyncSession, user_id: uuid.UUID | None) -> tuple[bool, str | None, AiUserQuota | None]:
    """Check if the user is authorized and within their token allowance.

    Returns (allowed, error_message, quota_obj).
    """
    if not user_id:
        return True, None, None

    quota = await db.scalar(select(AiUserQuota).where(AiUserQuota.user_id == user_id))
    if not quota:
        # Create default quota
        quota = AiUserQuota(
            user_id=user_id,
            is_ai_enabled=True,
            daily_token_limit=50_000,
            monthly_token_limit=1_000_000,
            tier="standard",
        )
        db.add(quota)
        await db.flush()

    if not quota.is_ai_enabled:
        return False, "Your AI assistant access has been paused by an administrator.", quota

    now = datetime.now(timezone.utc)
    # Check daily token limit
    if quota.daily_token_limit > 0:
        midnight_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        used_today = (
            await db.scalar(
                select(func.coalesce(func.sum(AiUsageLog.total_tokens), 0)).where(
                    AiUsageLog.user_id == user_id,
                    AiUsageLog.created_at >= midnight_today,
                    AiUsageLog.status == "success",
                )
            )
            or 0
        )
        if used_today >= quota.daily_token_limit:
            msg = (
                f"You have reached your daily limit of {quota.daily_token_limit:,} tokens "
                f"({used_today:,} used today). Quota resets at 00:00 UTC."
            )
            return False, msg, quota

    # Check monthly token limit
    if quota.monthly_token_limit > 0:
        first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        used_month = (
            await db.scalar(
                select(func.coalesce(func.sum(AiUsageLog.total_tokens), 0)).where(
                    AiUsageLog.user_id == user_id,
                    AiUsageLog.created_at >= first_of_month,
                    AiUsageLog.status == "success",
                )
            )
            or 0
        )
        if used_month >= quota.monthly_token_limit:
            msg = (
                f"You have reached your monthly limit of {quota.monthly_token_limit:,} tokens "
                f"({used_month:,} used this month). Contact an admin to increase your allowance."
            )
            return False, msg, quota

    return True, None, quota


async def record_ai_usage(
    db: AsyncSession,
    *,
    user_id: uuid.UUID | None = None,
    feature: str = "companion_chat",
    endpoint: str = "/ai/chat",
    model: str | None = None,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    total_tokens: int = 0,
    latency_ms: int | None = None,
    status: str = "success",
    error_message: str | None = None,
) -> AiUsageLog:
    """Log an AI invocation with token details and status."""
    if total_tokens <= 0:
        total_tokens = prompt_tokens + completion_tokens

    active_model = model or getattr(settings, "gemini_model", "gemini-3.5-flash-lite") or "gemini-3.5-flash-lite"
    log_entry = AiUsageLog(
        user_id=user_id,
        feature=feature,
        endpoint=endpoint,
        model=active_model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        latency_ms=latency_ms,
        status=status,
        error_message=error_message,
    )
    db.add(log_entry)
    try:
        await db.commit()
    except Exception as e:
        log.warning("Failed to commit AI usage log: %s", e)
        await db.rollback()
    return log_entry


async def probe_gemini_api(model_name: str | None = None) -> dict[str, Any]:
    """Perform a live roundtrip check against Google Gemini to measure latency and verify key."""
    key = getattr(settings, "gemini_api_key", None)
    active_model = model_name or getattr(settings, "gemini_model", "gemini-3.5-flash-lite") or "gemini-3.5-flash-lite"
    if not key:
        return {
            "ok": False,
            "status": "missing_key",
            "message": "No GEMINI_API_KEY configured",
            "model": active_model,
            "latency_ms": 0,
        }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{active_model}?key={key}"
    start_time = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "ok": True,
                    "status": "healthy",
                    "model": active_model,
                    "display_name": data.get("displayName", active_model),
                    "input_token_limit": data.get("inputTokenLimit"),
                    "output_token_limit": data.get("outputTokenLimit"),
                    "latency_ms": elapsed_ms,
                    "message": "Live API connection confirmed",
                }
            elif resp.status_code == 429:
                return {
                    "ok": False,
                    "status": "rate_limited",
                    "model": active_model,
                    "latency_ms": elapsed_ms,
                    "message": "Gemini API rate limit reached (429 RESOURCE_EXHAUSTED)",
                }
            else:
                return {
                    "ok": False,
                    "status": "error",
                    "model": active_model,
                    "status_code": resp.status_code,
                    "latency_ms": elapsed_ms,
                    "message": resp.text[:200],
                }
    except Exception as e:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        return {
            "ok": False,
            "status": "unreachable",
            "model": active_model,
            "latency_ms": elapsed_ms,
            "message": str(e)[:200],
        }


async def get_ai_monitoring_overview(db: AsyncSession, days: int = 30) -> dict[str, Any]:
    """Aggregate overall tokens, rate limits, live Gemini health, user quotas, and recent logs."""
    now = datetime.now(timezone.utc)
    midnight_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    one_minute_ago = now - timedelta(seconds=60)
    days_ago = now - timedelta(days=days)

    from app.ai.engine import load_ai_config_from_db
    active_cfg = await load_ai_config_from_db(db)
    provider = (active_cfg.get("provider") or "gemini").lower()
    sub_cfg = active_cfg.get(provider) or {}
    active_model = sub_cfg.get("model") or getattr(settings, "gemini_model", "gemini-3.5-flash-lite")
    specs = get_model_specs(active_model)
    has_key = bool(sub_cfg.get("api_key") or getattr(settings, "gemini_api_key", None)) if provider != "ollama" else True


    # 1. Today's stats
    today_stats = (
        await db.execute(
            select(
                func.count(AiUsageLog.id).label("requests_count"),
                func.coalesce(func.sum(AiUsageLog.prompt_tokens), 0).label("prompt_tokens"),
                func.coalesce(func.sum(AiUsageLog.completion_tokens), 0).label("completion_tokens"),
                func.coalesce(func.sum(AiUsageLog.total_tokens), 0).label("total_tokens"),
                func.coalesce(func.avg(AiUsageLog.latency_ms), 0).label("avg_latency"),
            ).where(AiUsageLog.created_at >= midnight_today)
        )
    ).first()

    requests_today = int(today_stats.requests_count if today_stats else 0)
    prompt_today = int(today_stats.prompt_tokens if today_stats else 0)
    comp_today = int(today_stats.completion_tokens if today_stats else 0)
    tokens_today = int(today_stats.total_tokens if today_stats else 0)
    avg_latency = int(round(float(today_stats.avg_latency or 0))) if today_stats else 0

    # Rate limit hits today
    rate_limited_today = (
        await db.scalar(
            select(func.count(AiUsageLog.id)).where(
                AiUsageLog.created_at >= midnight_today,
                AiUsageLog.status.in_(["rate_limited", "quota_exceeded"]),
            )
        )
        or 0
    )

    # 2. Last minute rates (real RPM and TPM)
    rpm_curr = (
        await db.scalar(
            select(func.count(AiUsageLog.id)).where(AiUsageLog.created_at >= one_minute_ago)
        )
        or 0
    )
    tpm_curr = (
        await db.scalar(
            select(func.coalesce(func.sum(AiUsageLog.total_tokens), 0)).where(
                AiUsageLog.created_at >= one_minute_ago
            )
        )
        or 0
    )

    # 3. All-time stats
    all_time_stats = (
        await db.execute(
            select(
                func.count(AiUsageLog.id).label("total_requests"),
                func.coalesce(func.sum(AiUsageLog.prompt_tokens), 0).label("prompt_tokens"),
                func.coalesce(func.sum(AiUsageLog.completion_tokens), 0).label("completion_tokens"),
                func.coalesce(func.sum(AiUsageLog.total_tokens), 0).label("total_tokens"),
            )
        )
    ).first()

    total_requests = int(all_time_stats.total_requests if all_time_stats else 0)
    total_tokens = int(all_time_stats.total_tokens if all_time_stats else 0)
    total_prompt = int(all_time_stats.prompt_tokens if all_time_stats else 0)
    total_comp = int(all_time_stats.completion_tokens if all_time_stats else 0)

    # 4. Breakdown by feature
    feature_rows = (
        await db.execute(
            select(
                AiUsageLog.feature,
                func.count(AiUsageLog.id).label("requests_count"),
                func.coalesce(func.sum(AiUsageLog.total_tokens), 0).label("total_tokens"),
            )
            .group_by(AiUsageLog.feature)
            .order_by(desc("total_tokens"))
        )
    ).all()
    breakdown_by_feature = [
        {"feature": r.feature, "requests_count": int(r.requests_count), "total_tokens": int(r.total_tokens)}
        for r in feature_rows
    ]

    # 5. Time series for past N days
    series_rows = (
        await db.execute(
            select(
                cast(AiUsageLog.created_at, Date).label("log_date"),
                func.count(AiUsageLog.id).label("requests_count"),
                func.coalesce(func.sum(AiUsageLog.prompt_tokens), 0).label("prompt_tokens"),
                func.coalesce(func.sum(AiUsageLog.completion_tokens), 0).label("completion_tokens"),
                func.coalesce(func.sum(AiUsageLog.total_tokens), 0).label("total_tokens"),
            )
            .where(AiUsageLog.created_at >= days_ago)
            .group_by("log_date")
            .order_by("log_date")
        )
    ).all()
    time_series = [
        {
            "date": str(r.log_date),
            "requests_count": int(r.requests_count),
            "prompt_tokens": int(r.prompt_tokens),
            "completion_tokens": int(r.completion_tokens),
            "total_tokens": int(r.total_tokens),
        }
        for r in series_rows
    ]

    # 6. Per-user quota and usage summary
    users = list(await db.scalars(select(User).order_by(User.fullname)))
    quotas = {q.user_id: q for q in await db.scalars(select(AiUserQuota))}

    # Query tokens used per user today
    user_tokens_today_rows = (
        await db.execute(
            select(
                AiUsageLog.user_id,
                func.count(AiUsageLog.id).label("requests_today"),
                func.coalesce(func.sum(AiUsageLog.total_tokens), 0).label("tokens_today"),
            )
            .where(AiUsageLog.created_at >= midnight_today)
            .group_by(AiUsageLog.user_id)
        )
    ).all()
    user_today_map = {r.user_id: (int(r.requests_today), int(r.tokens_today)) for r in user_tokens_today_rows}

    # Query tokens used per user all-time and last active
    user_all_time_rows = (
        await db.execute(
            select(
                AiUsageLog.user_id,
                func.count(AiUsageLog.id).label("requests_total"),
                func.coalesce(func.sum(AiUsageLog.total_tokens), 0).label("tokens_total"),
                func.max(AiUsageLog.created_at).label("last_used_at"),
            ).group_by(AiUsageLog.user_id)
        )
    ).all()
    user_all_time_map = {
        r.user_id: (int(r.requests_total), int(r.tokens_total), r.last_used_at) for r in user_all_time_rows
    }

    user_summaries = []
    for u in users:
        q = quotas.get(u.id)
        req_today, tok_today = user_today_map.get(u.id, (0, 0))
        req_tot, tok_tot, last_used = user_all_time_map.get(u.id, (0, 0, None))

        daily_limit = q.daily_token_limit if q else 50_000
        monthly_limit = q.monthly_token_limit if q else 1_000_000
        is_enabled = q.is_ai_enabled if q else True
        tier = q.tier if q else "standard"
        notes = q.notes if q else None

        usage_pct = round((tok_today / daily_limit * 100), 1) if daily_limit > 0 else 0.0

        user_summaries.append(
            {
                "id": str(u.id),
                "fullname": u.fullname,
                "username": u.username,
                "email": u.email,
                "is_admin": u.is_admin,
                "is_ai_enabled": is_enabled,
                "daily_token_limit": daily_limit,
                "monthly_token_limit": monthly_limit,
                "tier": tier,
                "notes": notes,
                "tokens_today": tok_today,
                "tokens_total": tok_tot,
                "requests_today": req_today,
                "requests_total": req_tot,
                "last_used_at": last_used.isoformat() if last_used else None,
                "usage_percent_today": min(usage_pct, 100.0),
            }
        )

    # 7. Recent 50 logs
    recent_log_rows = (
        await db.execute(
            select(AiUsageLog, User.fullname, User.username)
            .outerjoin(User, AiUsageLog.user_id == User.id)
            .order_by(desc(AiUsageLog.created_at))
            .limit(50)
        )
    ).all()
    recent_logs = [
        {
            "id": str(r[0].id),
            "user_id": str(r[0].user_id) if r[0].user_id else None,
            "user_name": r[1] or r[2] or "System / Anonymous",
            "feature": r[0].feature,
            "endpoint": r[0].endpoint,
            "model": r[0].model,
            "prompt_tokens": r[0].prompt_tokens,
            "completion_tokens": r[0].completion_tokens,
            "total_tokens": r[0].total_tokens,
            "latency_ms": r[0].latency_ms,
            "status": r[0].status,
            "error_message": r[0].error_message,
            "created_at": r[0].created_at.isoformat() if r[0].created_at else None,
        }
        for r in recent_log_rows
    ]

    rpd_limit = specs.get("rpd_limit", 1500)
    requests_remaining = max(0, rpd_limit - requests_today)

    return {
        "provider": provider,
        "model": active_model,
        "model_specs": specs,
        "has_api_key": has_key,
        "active_config": active_cfg,
        "rate_limits": {

            "rpm_limit": specs.get("rpm_limit", 15),
            "tpm_limit": specs.get("tpm_limit", 250_000),
            "rpd_limit": rpd_limit,
            "context_window": specs.get("context_window", 1_048_576),
            "max_output_tokens": specs.get("max_output_tokens", 8_192),
            "current_rpm": rpm_curr,
            "current_tpm": tpm_curr,
            "requests_today": requests_today,
            "requests_remaining_today": requests_remaining,
            "rate_limited_today": rate_limited_today,
        },
        "usage_today": {
            "requests_count": requests_today,
            "prompt_tokens": prompt_today,
            "completion_tokens": comp_today,
            "total_tokens": tokens_today,
            "avg_latency_ms": avg_latency,
            "rate_limit_hits": rate_limited_today,
        },
        "usage_all_time": {
            "total_requests": total_requests,
            "total_tokens": total_tokens,
            "prompt_tokens": total_prompt,
            "completion_tokens": total_comp,
        },
        "breakdown_by_feature": breakdown_by_feature,
        "time_series": time_series,
        "users": user_summaries,
        "recent_logs": recent_logs,
    }
