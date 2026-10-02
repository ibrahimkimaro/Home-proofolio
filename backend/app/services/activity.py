"""Notifications, the security event log and IP blocking: small helpers every router shares."""
import ipaddress
import re
import time
import uuid
from datetime import datetime, timezone

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.activity import BlockedIp, Notification, SecurityEvent


# Our own machines: loopback, LAN and Docker networks, link-local. (ipaddress.is_private also covers
# documentation and other special ranges, which are not ours to trust.)
_LOCAL_NETS = [ipaddress.ip_network(n) for n in (
    "127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "169.254.0.0/16", "::1/128", "fc00::/7", "fe80::/10",
)]


def is_private(ip: str | None) -> bool:
    try:
        addr = ipaddress.ip_address(ip or "")
    except ValueError:
        return False
    return any(addr.version == net.version and addr in net for net in _LOCAL_NETS)


def client_ip(request: Request) -> str | None:
    """The visitor's IP: the configured proxy header (only when it comes from our own private network), else the peer."""
    peer = request.client.host if request.client else None
    if settings.client_ip_header and is_private(peer):
        if value := request.headers.get(settings.client_ip_header):
            return value.split(",")[0].strip()[:64]
    return peer


def device_name(ua: str | None) -> str:
    """'Chrome on Android' from a user agent; matches deviceName() in the Settings page."""
    if not ua:
        return "Unknown device"
    browser = next((n for p, n in ((r"Edg/", "Edge"), (r"OPR/", "Opera"), (r"Firefox/", "Firefox"),
                                   (r"Chrome/", "Chrome"), (r"Safari/", "Safari")) if re.search(p, ua)), "Browser")
    os = next((n for p, n in ((r"iPhone|iPad", "iPhone"), (r"Android", "Android"), (r"Windows", "Windows"),
                              (r"Mac OS", "Mac"), (r"Linux", "Linux")) if re.search(p, ua)), "")
    return f"{browser} on {os}" if os else browser


def notify(db: AsyncSession, user_id: uuid.UUID, kind: str, title: str, body: str | None = None, link: str | None = None) -> None:
    """Queue a notification for a member. Committed with the change that caused it."""
    db.add(Notification(user_id=user_id, kind=kind, title=title[:160], body=body, link=link))


def record(db: AsyncSession, kind: str, request: Request | None, user_id: uuid.UUID | None = None,
           email: str | None = None, **details) -> None:
    """Add a security event (login_ok, login_failed, login_locked, otp_failed, blocked, ...). Caller commits."""
    db.add(SecurityEvent(
        kind=kind,
        ip=client_ip(request) if request else None,
        user_id=user_id,
        email=email.lower() if email else None,
        user_agent=(request.headers.get("user-agent") or "")[:300] if request else None,
        details=details,
    ))


# ponytail: blocked IPs cached per process for 30s; a block takes up to 30s to reach other workers.
_blocked: set[str] = set()
_blocked_at = 0.0


async def is_blocked(db: AsyncSession, ip: str | None) -> bool:
    global _blocked, _blocked_at
    if time.monotonic() - _blocked_at > 30:
        now = datetime.now(timezone.utc)
        rows = await db.execute(select(BlockedIp.ip).where((BlockedIp.expires_at.is_(None)) | (BlockedIp.expires_at > now)))
        _blocked, _blocked_at = set(rows.scalars()), time.monotonic()
    return bool(ip) and ip in _blocked


def forget_blocks() -> None:
    """Make the next request reload the block list (after an admin adds or removes one)."""
    global _blocked_at
    _blocked_at = 0.0
