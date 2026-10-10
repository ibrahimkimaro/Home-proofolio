import time

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from strawberry.fastapi import GraphQLRouter

from app.api.ai import router as ai_router
from app.api.memories import router as memories_router
from app.api.stories import router as stories_router
from app.api.admin import router as admin_router
from app.api.admin_messages import router as admin_messages_router
from app.api.admin_security import router as admin_security_router
from app.api.admin_system import router as admin_system_router
from app.api.admin_ai_monitoring import router as admin_ai_monitoring_router
from app.api.chat_clear import router as chat_clear_router
from app.api.chat_pins import router as chat_pins_router
from app.api.engage import router as engage_router
from app.api.member_codes import router as member_codes_router
from app.api.push import router as push_router
from app.api.auth import router as auth_router
from app.api.businesses import router as businesses_router
from app.api.settings import router as settings_router
from app.api.social import router as social_router
from app.api.discussions import router as discussions_router
from app.api.support import router as support_router
from app.api.groups import router as groups_router
from app.api.chat_files import router as chat_files_router
from app.api.cv import router as cv_router
from app.api.me import router as me_router
from app.api.notifications import router as notifications_router
from app.api.admin_manage import router as admin_manage_router
from app.api.onboarding import router as onboarding_router
from app.api.profiles import router as profiles_router
from app.api.uploads import router as uploads_router
from app.api.legal import router as legal_router
from app.api.site_visits import router as site_visits_router
from app.api.work import router as work_router, templates_router
from app.core.config import settings
from app.core import monitor
from app.core.database import AsyncSessionLocal, engine
from app.graphql.context import get_context
from app.graphql.schema import schema
from app.services.activity import client_ip, is_blocked, record

app = FastAPI(title="HOME PROOFOLIO API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|([a-z0-9-]+\.)*devtunnels\.ms|([a-z0-9-]+\.)*trycloudflare\.com)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def guard_and_measure(request: Request, call_next):
    """Refuse blocked addresses, then time every request for Admin > System health."""
    ip = client_ip(request)
    async with AsyncSessionLocal() as db:
        if await is_blocked(db, ip):
            if monitor.should_log_block(ip):
                record(db, "blocked", request, path=request.url.path)
                await db.commit()
            return JSONResponse({"detail": "Access from your network has been blocked."}, status_code=403)
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        monitor.observe(request.method, request.url.path, 500, started, error=f"{type(exc).__name__}: {exc}"[:300])
        raise
    monitor.observe(request.method, request.url.path, response.status_code, started)
    return response


app.include_router(auth_router)
app.include_router(ai_router)
app.include_router(memories_router)
app.include_router(stories_router)
app.include_router(work_router)
app.include_router(templates_router)
app.include_router(admin_router)
app.include_router(admin_security_router)
app.include_router(admin_messages_router)
app.include_router(member_codes_router)
app.include_router(chat_clear_router)
app.include_router(chat_pins_router)
app.include_router(engage_router)
app.include_router(push_router)
app.include_router(admin_system_router)
app.include_router(admin_ai_monitoring_router)
app.include_router(admin_manage_router)
app.include_router(onboarding_router)
app.include_router(profiles_router)
app.include_router(me_router)
app.include_router(notifications_router)
app.include_router(settings_router)
app.include_router(businesses_router)
app.include_router(social_router)
app.include_router(discussions_router)
app.include_router(support_router)
app.include_router(groups_router)
app.include_router(chat_files_router)
app.include_router(cv_router)
app.include_router(uploads_router)
app.include_router(legal_router)
app.include_router(site_visits_router)
app.include_router(GraphQLRouter(schema, context_getter=get_context), prefix="/graphql")


@app.get("/health")
async def health() -> dict:
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    return {"status": "ok"}
