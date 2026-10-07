import os
import re

from fastapi.responses import FileResponse
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.companion import PERMISSIONS, PROACTIVITY, load_companion
from app.ai.chat import reply
from app.ai.security_guard import SANDBOX_DIR
from app.ai.work_report import build_work_report
from app.ai.engine import get_engine
from app.ai.python_tools import generate_chart
from app.ai.knowledge import DIR as KNOWLEDGE_DIR
from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.models.companion import Companion
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["ai"])

class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[str] = Field(default_factory=list, max_length=10)  # recent turns, oldest first


class ChartIn(BaseModel):
    name: str
    title: str
    labels: str  # comma separated
    values: str  # comma separated numbers
    kind: str = "bar"  # bar | barh | line | pie | donut
    xlabel: str = ""
    ylabel: str = ""


class CompanionIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    relationship_type: str | None = Field(default=None, max_length=50)
    personality: str | None = Field(default=None, max_length=100)
    communication_style: str | None = Field(default=None, max_length=30)
    languages: list[str] | None = Field(default=None, max_length=5)
    purpose: list[str] | None = Field(default=None, max_length=10)
    proactivity: str | None = None
    memory_preferences: dict | None = None  # {"remember": [...], "forget": [...]}
    access_permissions: list[str] | None = None
    custom_instructions: str | None = Field(default=None, max_length=2000)


FIELDS = list(CompanionIn.model_fields)


def companion_out(c: Companion) -> dict:
    return {f: getattr(c, f) for f in FIELDS}


@router.get("/companion")
async def get_companion(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return companion_out(await load_companion(db, user.id))


@router.put("/companion")
async def update_companion(body: CompanionIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    changes = body.model_dump(exclude_unset=True, exclude_none=True)
    if (p := changes.get("proactivity")) and p not in PROACTIVITY:
        raise HTTPException(422, f"proactivity must be one of {sorted(PROACTIVITY)}")
    if set(changes.get("access_permissions", [])) - PERMISSIONS:
        raise HTTPException(422, f"access_permissions must be within {sorted(PERMISSIONS)}")
    c = await load_companion(db, user.id)
    for k, v in changes.items():
        setattr(c, k, v)
    db.add(c)
    await db.commit()
    return companion_out(c)


@router.post("/chat")
async def chat(body: ChatIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        text = await reply(get_engine(), db, user.id, f"You are talking to {user.fullname} (@{user.username}).", body.message, body.history)
    except Exception:
        raise HTTPException(503, "AI model is unavailable")
    return {"reply": text}


@router.post("/chart")
def chart(body: ChartIn, _: User = Depends(get_current_user)):
    try:
        return {"path": generate_chart(body.name, body.title, body.labels, body.values, body.kind, body.xlabel, body.ylabel)}
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.get("/report/work")
async def work_report(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """PDF of the caller's own work (always their own; no consent needed because they download it themselves)."""
    path = await build_work_report(db, user)
    return FileResponse(os.path.join(SANDBOX_DIR, path), media_type="application/pdf", filename=os.path.basename(path))


@router.get("/knowledge")
async def list_knowledge(_: User = Depends(require_admin)):
    """The AI's product knowledge files (admin only)."""
    return [{"name": p.stem, "text": p.read_text(encoding="utf-8")} for p in sorted(KNOWLEDGE_DIR.glob("*.md"))]


class KnowledgeIn(BaseModel):
    text: str = Field(max_length=20000)


@router.put("/knowledge/{name}")
async def save_knowledge(name: str, body: KnowledgeIn, _: User = Depends(require_admin)):
    """Create or replace one knowledge file. The very next chat uses it (no restart)."""
    if not re.fullmatch(r"[a-z0-9_]{1,60}", name):
        raise HTTPException(422, "name must be lowercase letters, digits and underscores")
    (KNOWLEDGE_DIR / f"{name}.md").write_text(body.text, encoding="utf-8")
    return {"saved": name}
