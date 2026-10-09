"""Admin endpoints for AI monitoring, Gemini rate limits, and per-user token quotas."""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.usage_monitor import get_ai_monitoring_overview, probe_gemini_api
from app.api.deps import require_admin
from app.core.database import get_db
from app.models.ai_usage import AiUserQuota
from app.models.user import User
from app.services.platform import audit

router = APIRouter(prefix="/admin/ai", tags=["admin-ai-monitoring"])


class UserQuotaUpdateIn(BaseModel):
    is_ai_enabled: bool = True
    daily_token_limit: int = Field(default=50000, ge=-1)
    monthly_token_limit: int = Field(default=1000000, ge=-1)
    tier: str = Field(default="standard", max_length=50)
    notes: str | None = Field(default=None, max_length=500)


@router.get("/monitoring")
async def get_monitoring_data(
    days: int = Query(default=30, ge=1, le=90),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve complete AI token consumption, Gemini model rate limits, user allocations, and real-time logs."""
    return await get_ai_monitoring_overview(db, days=days)


@router.get("/probe")
async def probe_gemini_status(
    model: str | None = Query(default=None),
    admin: User = Depends(require_admin),
) -> dict[str, Any]:
    """Execute a real-time live ping to Google Gemini API to inspect latency, quota availability, and model status."""
    return await probe_gemini_api(model_name=model)


@router.put("/users/{user_id}/quota")
async def update_user_quota(
    user_id: uuid.UUID,
    body: UserQuotaUpdateIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin updates an individual user's token limit, tier, or toggles AI assistant access."""
    target_user = await db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    quota = await db.scalar(select(AiUserQuota).where(AiUserQuota.user_id == user_id))
    if not quota:
        quota = AiUserQuota(user_id=user_id)
        db.add(quota)

    quota.is_ai_enabled = body.is_ai_enabled
    quota.daily_token_limit = body.daily_token_limit
    quota.monthly_token_limit = body.monthly_token_limit
    quota.tier = body.tier
    quota.notes = body.notes

    action_text = (
        f"Updated AI quota for @{target_user.username}: "
        f"enabled={body.is_ai_enabled}, daily_limit={body.daily_token_limit:,}, tier={body.tier}"
    )
    audit(db, admin, "ai_quota_update", action_text, target_id=str(user_id))
    await db.commit()

    return {
        "ok": True,
        "message": f"Updated AI quota for {target_user.fullname}",
        "quota": {
            "user_id": str(user_id),
            "is_ai_enabled": quota.is_ai_enabled,
            "daily_token_limit": quota.daily_token_limit,
            "monthly_token_limit": quota.monthly_token_limit,
            "tier": quota.tier,
            "notes": quota.notes,
        },
    }


class AiConfigIn(BaseModel):
    config: dict[str, Any]


@router.get("/config")
async def get_ai_config(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the current active AI provider configuration stored in the database."""
    from app.ai.engine import load_ai_config_from_db
    return await load_ai_config_from_db(db)


@router.put("/config")
async def update_ai_config(
    body: AiConfigIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Save and activate a new AI provider configuration in the database (Gemini, DeepSeek, Mistral, Ollama, Custom)."""
    from app.ai.engine import set_active_ai_config
    updated = await set_active_ai_config(db, body.config, admin_user=admin)
    return {"ok": True, "message": f"AI provider successfully switched to {body.config.get('provider')}", "config": updated}


@router.post("/config/test")
async def test_ai_config(
    body: AiConfigIn,
    admin: User = Depends(require_admin),
):
    """Live test any provider configuration parameters before saving."""
    from app.ai.engine import test_ai_provider_connection
    return await test_ai_provider_connection(body.config)


class LocalModelBenchmarkIn(BaseModel):
    model: str
    prompt: str = ""
    endpoint: str = ""


class LocalModelSelectIn(BaseModel):
    model: str
    endpoint: str = ""


@router.get("/local-models")
async def list_local_models(
    endpoint: str = "",
    admin: User = Depends(require_admin),
):
    """Scan and list all local models installed and running on the host machine, along with CPU and RAM usage."""
    from app.ai.engine import get_local_ai_models
    return await get_local_ai_models(endpoint=endpoint)


@router.post("/local-models/benchmark")
async def benchmark_model(
    body: LocalModelBenchmarkIn,
    admin: User = Depends(require_admin),
):
    """Run an interactive benchmark test on a specific local model: measures response time (seconds), tokens/sec, CPU %, and RAM."""
    from app.ai.engine import benchmark_local_ai_model
    return await benchmark_local_ai_model(model_name=body.model, prompt=body.prompt, endpoint=body.endpoint)


@router.post("/local-models/select")
async def select_local_model(
    body: LocalModelSelectIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Select and set a local model as the active AI provider for the whole platform."""
    from app.ai.engine import set_active_ai_config, resolve_ollama_base_url, load_ai_config_from_db
    curr = await load_ai_config_from_db(db)
    base_url = (body.endpoint or "").strip() or curr.get("ollama", {}).get("base_url") or resolve_ollama_base_url()

    new_cfg = {
        **curr,
        "provider": "ollama",
        "ollama": {
            **curr.get("ollama", {}),
            "model": body.model,
            "base_url": base_url,
        },
    }
    updated = await set_active_ai_config(db, new_cfg, admin_user=admin)
    return {
        "ok": True,
        "message": f"Successfully activated local model: {body.model}",
        "config": updated,
        "model": body.model,
        "endpoint": base_url,
    }

