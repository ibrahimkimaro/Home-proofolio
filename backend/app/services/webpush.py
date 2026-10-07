"""Web Push (VAPID): notify a member's subscribed browsers and phones, even when the site is closed.

Configured from VAPID_* in .env (keys made with `web-push generate-vapid-keys`). Sending is blocking, so each
push runs in a thread. A device that unsubscribed or uninstalled answers 404/410: its subscription is deleted.
"""
import asyncio
import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from urllib.parse import urlsplit

from sqlalchemy import delete, select, update

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.push import PushSubscription

log = logging.getLogger(__name__)

# Browsers send pushes through their vendor's service. Only these are accepted as a subscription's address,
# because the server calls that address: anything else (an internal service, a LAN host) would be an SSRF hole.
PUSH_HOSTS = ("googleapis.com", "mozilla.com", "windows.com", "apple.com", "mozaws.net")


def configured() -> bool:
    return bool(settings.vapid_public_key and settings.vapid_private_key)


def endpoint_ok(endpoint: str) -> bool:
    """A real push-service address: https, a hostname (not an IP or single label), on a known vendor domain."""
    try:
        u = urlsplit(endpoint)
    except ValueError:
        return False
    host = (u.hostname or "").lower()
    return u.scheme == "https" and "." in host and not host.replace(".", "").isdigit() and any(host == h or host.endswith("." + h) for h in PUSH_HOSTS)


def _send_one(info: dict, data: str, topic: str | None) -> str | None:
    """None = delivered to the push service, 'gone' = the device no longer exists, 'error' = try again next time."""
    from pywebpush import WebPushException, webpush

    headers = {"Urgency": "high"}
    if topic:
        headers["Topic"] = hashlib.sha256(topic.encode()).hexdigest()[:30]  # a newer push with this topic replaces an older one
    try:
        webpush(
            subscription_info=info,
            data=data,
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},  # fresh dict each time: the library fills it in
            ttl=3600,
            headers=headers,
            timeout=10,
        )
        return None
    except WebPushException as e:
        status = getattr(e.response, "status_code", None)
        if status in (404, 410):
            return "gone"
        log.warning("web push failed (%s): %s", status, str(e)[:160])
        return "error"
    except Exception as e:  # never let one bad device break the others
        log.warning("web push failed: %s", str(e)[:160])
        return "error"


async def push_to_users(user_ids: list[uuid.UUID], payload: dict, topic: str | None = None) -> int:
    """Send `payload` (title, body, url, tag, ...) to every device of these members. Returns how many accepted it."""
    if not configured() or not user_ids:
        return 0
    async with AsyncSessionLocal() as db:
        subs = (await db.execute(select(PushSubscription).where(PushSubscription.user_id.in_(user_ids)))).scalars().all()
        devices = [(s.id, {"endpoint": s.endpoint, "keys": {"p256dh": s.p256dh, "auth": s.auth}}) for s in subs]
    if not devices:
        return 0
    data = json.dumps(payload, ensure_ascii=False)
    results = await asyncio.gather(*[asyncio.to_thread(_send_one, info, data, topic) for _, info in devices])
    gone = [sid for (sid, _), r in zip(devices, results) if r == "gone"]
    ok = [sid for (sid, _), r in zip(devices, results) if r is None]
    if gone or ok:
        async with AsyncSessionLocal() as db:
            if gone:
                await db.execute(delete(PushSubscription).where(PushSubscription.id.in_(gone)))
            if ok:
                await db.execute(update(PushSubscription).where(PushSubscription.id.in_(ok)).values(last_used_at=datetime.now(timezone.utc)))
            await db.commit()
    return len(ok)
