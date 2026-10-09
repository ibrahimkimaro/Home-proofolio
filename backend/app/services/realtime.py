"""Live pushes through realtime_chat (POST /internal/events, see its InternalController).

Best effort and after commit: what matters (notifications, chat lines) is already in the database,
so a member who is offline, or a push that fails, still sees it on their next load.
"""
import asyncio
import hashlib
import hmac
import json
import logging
import urllib.request

from app.core.config import settings

log = logging.getLogger(__name__)


def _token() -> str:
    return hmac.new(settings.secret_key.encode(), b"internal-events", hashlib.sha256).hexdigest()


def _post(events: list[dict]) -> None:
    req = urllib.request.Request(
        f"{settings.realtime_internal_url.rstrip('/')}/internal/events",
        data=json.dumps({"events": events}).encode(),
        headers={"content-type": "application/json", "authorization": f"Bearer {_token()}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=3) as res:
        res.read()


async def push(events: list[dict]) -> None:
    if not events:
        return
    try:
        await asyncio.to_thread(_post, events)
    except Exception as e:  # the realtime service being down must never fail the request
        log.warning("realtime push failed: %s", e)


def to_user(user_id, event: str, payload: dict | None = None) -> dict:
    return {"type": "user", "user_id": str(user_id), "event": event, "payload": payload or {}}


def room_message(slug: str, seq: int) -> dict:
    return {"type": "room_message", "topic": f"room:{slug}", "seq": seq}


def member_removed(slug: str, user_id) -> dict:
    return {"type": "member_removed", "topic": f"room:{slug}", "user_id": str(user_id)}
