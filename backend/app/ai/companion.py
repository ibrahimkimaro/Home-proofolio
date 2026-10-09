from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.companion import Companion

# Every permission the user may grant. Only "projects" feeds data into the prompt so far (chat.py asks for it).
PERMISSIONS = {"profile", "projects", "learning", "ideas", "achievements", "memories", "wellness", "conversations"}
PROACTIVITY = {
    "on_request": "Only respond when asked.",
    "occasional": "Give occasional suggestions.",
    "active": "Actively help the user stay on track.",
}


async def load_companion(db: AsyncSession, user_id) -> Companion:
    """The user's companion, or an unsaved one holding the defaults (name Kimmy)."""
    found = await db.scalar(select(Companion).where(Companion.user_id == user_id))
    return found or Companion(
        user_id=user_id, name="Kimmy", relationship_type="personal assistant", communication_style="friendly",
        languages=["English", "Kiswahili"], purpose=["everything"], proactivity="occasional",
        memory_preferences={}, access_permissions=[],
    )


def companion_prompt(c: Companion) -> str:
    name = c.name
    lines = [
        f"Your name is {name}. Only when someone asks your name or \"who are you\", answer: "
        f"\"My name is {name}, assistant from HOME PROOFOLIO.\" Do not introduce yourself otherwise.",
        f"You are the user's {c.relationship_type}"
        + (f", with a {c.personality} personality." if c.personality else "."),
        f"Communication style: {c.communication_style}. Languages: {', '.join(c.languages)}.",
        f"Help most with: {', '.join(c.purpose)}. {PROACTIVITY.get(c.proactivity, '')}",
    ]
    mem = c.memory_preferences or {}
    if mem.get("remember"):
        lines.append(f"Remember: {', '.join(mem['remember'])}.")
    if mem.get("forget"):
        lines.append(f"Never remember or bring up: {', '.join(mem['forget'])}.")
    if c.custom_instructions:
        lines.append(f"Custom instructions from the user: {c.custom_instructions}")
    return "\n".join(lines)
