"""Platform settings and the admin audit log."""
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.platform import AdminAction, PlatformSetting
from app.models.user import User

DEFAULTS: dict[str, dict] = {
    "registration": {"open": True, "closed_message": "Sign-ups are paused for now. Please check back soon."},
    "announcement": {"active": False, "text": "", "tone": "info", "link": None},
    "onboarding": {},
}


async def get_setting(db: AsyncSession, key: str) -> dict:
    row = await db.get(PlatformSetting, key)
    return {**DEFAULTS.get(key, {}), **(row.value if row else {})}


async def put_setting(db: AsyncSession, key: str, value: dict) -> dict:
    row = await db.get(PlatformSetting, key)
    if row is None:
        db.add(PlatformSetting(key=key, value=value))
    else:
        row.value = value
    return value


def audit(db: AsyncSession, admin: User, action: str, target: str | None = None, **details) -> None:
    """Record an admin action. Committed together with the change it describes."""
    db.add(AdminAction(admin_id=admin.id, action=action, target=target, details=details))
