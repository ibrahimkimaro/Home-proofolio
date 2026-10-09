import asyncio
import json
import logging
import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi.responses import FileResponse, StreamingResponse
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.companion import PERMISSIONS, PROACTIVITY, load_companion
from app.ai.chat import answer, reply
from app.ai.security_guard import SANDBOX_DIR
from app.ai.support_agent import MAX_MESSAGE, support_reply, wait_seconds
from app.ai.pdf_export import ADMIN_FILE, USER_FILE
from app.ai.work_report import build_work_report
from app.ai.engine import explain_error, get_engine, model_name
from app.ai.admin_dashboard import build_dashboard
from app.ai.mcp_client import general_tools, status as mcp_status
from app.ai.python_tools import generate_chart
from app.ai.knowledge import DIR as KNOWLEDGE_DIR
from app.api.deps import get_current_user, require_admin
from app.core.database import AsyncSessionLocal, get_db
from app.models.ai_chat import AiChatMessage, AiChatSession
from app.models.companion import Companion
from app.models.user import User
from app.services.activity import client_ip

router = APIRouter(prefix="/ai", tags=["ai"])
log = logging.getLogger("app.ai")


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[str] = Field(default_factory=list, max_length=10)  # recent turns, oldest first
    session_id: uuid.UUID | None = None


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
    who, user_id = f"You are talking to {user.fullname} (@{user.username}).", user.id
    session = None
    if body.session_id:
        try:
            session = await _own_session(db, user_id, body.session_id)
        except HTTPException:
            session = None
    if not session:
        recent_s = await db.scalar(
            select(AiChatSession).where(AiChatSession.user_id == user_id).order_by(AiChatSession.updated_at.desc()).limit(1)
        )
        session = recent_s
    if not session:
        session = AiChatSession(id=uuid.uuid4(), user_id=user_id, title=" ".join(body.message.split())[:60] or "New chat")
        db.add(session)
        await db.flush()

    db.add(AiChatMessage(id=uuid.uuid4(), session_id=session.id, role="user", content=body.message, created_at=datetime.now(timezone.utc)))
    session.updated_at = datetime.now(timezone.utc)
    await db.commit()

    try:
        text = await reply(get_engine(), db, user_id, who, body.message, body.history)
    except Exception as e:
        log.exception("AI chat failed: %s", explain_error(e))  # the reason goes to the log, not to the user
        raise HTTPException(503, "AI model is unavailable")

    asst_msg = AiChatMessage(id=uuid.uuid4(), session_id=session.id, role="assistant", content=text, created_at=datetime.now(timezone.utc))
    db.add(asst_msg)
    session.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return {"reply": text, "session_id": str(session.id), "message_id": str(asst_msg.id)}


AI_TURN_SECONDS = 240  # a chat turn on a slow (CPU) model can take minutes; past this the user is told instead of waiting for ever


class StreamChatIn(ChatIn):
    session_id: uuid.UUID | None = None  # continue this conversation; none starts a new one


def _session_out(s: AiChatSession) -> dict:
    return {"id": str(s.id), "title": s.title, "updated_at": s.updated_at.isoformat()}


def _message_out(m: AiChatMessage) -> dict:
    return {"id": str(m.id), "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}


async def _own_session(db: AsyncSession, user_id, session_id: uuid.UUID) -> AiChatSession:
    s = await db.get(AiChatSession, session_id)
    if not s or s.user_id != user_id:
        raise HTTPException(404, "Chat not found")
    return s


@router.get("/sessions")
async def list_sessions(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """The user's earlier conversations, most recent first."""
    rows = await db.scalars(select(AiChatSession).where(AiChatSession.user_id == user.id).order_by(AiChatSession.updated_at.desc()).limit(100))
    return [_session_out(s) for s in rows]


@router.get("/sessions/{session_id}/messages")
async def session_messages(session_id: uuid.UUID, before: datetime | None = None, limit: int = Query(30, ge=1, le=100),
                           user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """One page of a conversation: the newest {limit} messages, or the {limit} before the cursor. Oldest first within the page."""
    await _own_session(db, user.id, session_id)
    q = select(AiChatMessage).where(AiChatMessage.session_id == session_id)
    if before:
        q = q.where(AiChatMessage.created_at < before)
    rows = list(await db.scalars(q.order_by(AiChatMessage.created_at.desc()).limit(limit + 1)))
    has_more = len(rows) > limit
    return {"messages": [_message_out(m) for m in reversed(rows[:limit])], "has_more": has_more}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.delete(await _own_session(db, user.id, session_id))
    await db.commit()
    return {"ok": True}


@router.post("/chat/stream")
async def chat_stream(body: StreamChatIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Same as /chat, but saves the conversation and streams what the AI is really doing (thinking, reasoning,
    searching, composing) as JSON lines: {"session": ...} {"state": "..."} ... {"reply": ..., "message": ...} or {"error": "..."}."""
    who, user_id = f"You are talking to {user.fullname} (@{user.username}).", user.id
    if body.session_id:
        session = await _own_session(db, user_id, body.session_id)
        earlier = list(await db.scalars(
            select(AiChatMessage).where(AiChatMessage.session_id == session.id).order_by(AiChatMessage.created_at.desc()).limit(10)))
        history = [("User: " if m.role == "user" else "AI: ") + m.content for m in reversed(earlier)]
    else:
        session = AiChatSession(id=uuid.uuid4(), user_id=user_id, title=" ".join(body.message.split())[:60] or "New chat")
        db.add(session)
        await db.flush()
        history = []
    db.add(AiChatMessage(id=uuid.uuid4(), session_id=session.id, role="user", content=body.message, created_at=datetime.now(timezone.utc)))
    session.updated_at = datetime.now(timezone.utc)
    await db.commit()
    session_info = _session_out(session)

    async def events():
        queue: asyncio.Queue = asyncio.Queue()

        async def on_state(state: str):
            await queue.put({"state": state})

        async def work():
            try:
                async with AsyncSessionLocal() as wdb:
                    res = await asyncio.wait_for(
                        answer(get_engine(), wdb, user_id, who, body.message, history, on_state=on_state), AI_TURN_SECONDS)
                    msg = AiChatMessage(id=uuid.uuid4(), session_id=session.id, role="assistant", content=res.text, created_at=datetime.now(timezone.utc))
                    wdb.add(msg)
                    saved = await wdb.get(AiChatSession, session.id)
                    if saved:
                        saved.updated_at = msg.created_at
                    await wdb.commit()
                await queue.put({"reply": res.text, "message": _message_out(msg)})
            except asyncio.TimeoutError:
                log.warning("AI chat timed out after %ss", AI_TURN_SECONDS)
                await queue.put({"error": "The AI is taking too long to answer. Try a shorter question, or try again in a moment."})
            except Exception as e:
                log.exception("AI chat failed: %s", explain_error(e))
                await queue.put({"error": "AI model is unavailable"})
            await queue.put(None)

        task = asyncio.create_task(work())
        try:
            yield json.dumps({"session": session_info}) + "\n"
            while (item := await queue.get()) is not None:
                yield json.dumps(item) + "\n"
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(events(), media_type="application/x-ndjson", headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"})


class SupportIn(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE)
    history: list[str] = Field(default_factory=list, max_length=12)  # recent turns, oldest first
    name: str | None = Field(default=None, max_length=60)  # what the visitor asked to be called, if anything


@router.post("/support")
async def support(body: SupportIn, request: Request):
    """The AI on the public website. No login and no user data: product knowledge only, rate limited per visitor."""
    if wait := wait_seconds(client_ip(request) or "unknown"):
        raise HTTPException(429, "You've sent a lot of messages. Please wait a few minutes, or tap Talk to a person.",
                            headers={"Retry-After": str(wait)})
    try:
        result = await support_reply(get_engine(), body.message, body.history, body.name)
    except Exception as e:
        log.exception("AI support failed: %s", explain_error(e))
        raise HTTPException(503, "The assistant is unavailable right now. Please tap Talk to a person.")
    return {"reply": result.text}


class DashboardIn(BaseModel):
    prompt: str = Field(min_length=1, max_length=1000)
    history: list[str] = Field(default_factory=list, max_length=8)  # earlier requests and summaries, oldest first
    mode: Literal["chat", "build", "prepare", "video", "image"] = "chat"  # chat (default), build, prepare, video, image


@router.post("/admin/dashboard")
async def admin_dashboard(body: DashboardIn, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Admin asks in plain words; the reply is a short summary plus charts filled from the database (read-only)."""
    try:
        return await build_dashboard(get_engine(), db, admin.fullname, body.prompt, body.history, body.mode, admin_id=admin.id)
    except Exception as e:
        reason = explain_error(e)  # safe to show: this endpoint is admin only and the reason never holds the token
        log.exception("AI dashboard failed: %s", reason)
        raise HTTPException(503, f"The AI is unavailable. {reason}")



def _pdf_response(name: str) -> FileResponse:
    path = os.path.join(SANDBOX_DIR, "reports", name)
    if not os.path.isfile(path):
        raise HTTPException(404, "That report is no longer available. Ask the AI to make it again.")
    return FileResponse(path, media_type="application/pdf", filename=name)


@router.get("/admin/report/{name}")
async def admin_report(name: str, _: User = Depends(require_admin)):
    """A PDF the admin dashboard AI made (admin only)."""
    if not ADMIN_FILE.match(name):
        raise HTTPException(404, "Report not found")
    return _pdf_response(name)


@router.get("/report/file/{name}")
async def user_report(name: str, user: User = Depends(get_current_user)):
    """A PDF the companion made for the caller. The file name starts with the owner's id: nobody else's opens."""
    if not USER_FILE.match(name) or not name.startswith(f"u{user.id.hex}_"):
        raise HTTPException(404, "Report not found")
    return _pdf_response(name)


@router.get("/health")
async def ai_health(_: User = Depends(require_admin)):
    """Admin check: one real round trip to the model, and how the tools are served."""
    started = time.perf_counter()
    try:
        answer = await get_engine().ping()
        tools = [t.name for t in await general_tools()]
    except Exception as e:
        return {"ok": False, "model": model_name(), "error": explain_error(e)}
    return {"ok": bool(answer), "model": model_name(), "answer": answer[:80], "seconds": round(time.perf_counter() - started, 2),
            "tools": tools, **mcp_status()}


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
