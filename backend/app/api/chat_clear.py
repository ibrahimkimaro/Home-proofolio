"""Delete a chat for yourself, in a 1:1 conversation or a group.

It clears YOUR copy: you no longer see the messages up to now, and the other people still have them (like
WhatsApp's "Delete chat"). In a group you stay a member (leaving is separate). A new message brings the chat back,
with only the new messages in it."""
from urllib.parse import quote_plus

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.activity import Notification
from app.models.chat import ChatClear, ChatGroup, ChatGroupMember
from app.models.user import User
from app.services import realtime

router = APIRouter(prefix="/chat", tags=["chat"])


class ClearIn(BaseModel):
    topic: str = Field(min_length=8, max_length=200)


async def _is_theirs(db: AsyncSession, user: User, topic: str) -> bool:
    """Only conversations this member is part of: their own 1:1 chats and the groups they've joined."""
    if topic.startswith("direct:"):
        pair = topic.removeprefix("direct:").split("_")
        return len(pair) == 2 and str(user.id) in pair
    if topic.startswith("room:"):
        found = await db.scalar(
            select(ChatGroupMember.user_id)
            .join(ChatGroup, ChatGroup.id == ChatGroupMember.group_id)
            .where(ChatGroup.slug == topic.removeprefix("room:"), ChatGroupMember.user_id == user.id, ChatGroupMember.status == "member")
        )
        return found is not None
    return False


@router.post("/clear", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat(payload: ClearIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not await _is_theirs(db, user, payload.topic):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chat not found")
    newest = (await db.execute(text("SELECT COALESCE(max(id), 0) FROM chat_messages WHERE topic = :t"), {"t": payload.topic})).scalar() or 0
    stmt = insert(ChatClear).values(user_id=user.id, topic=payload.topic, up_to=newest)
    await db.execute(
        stmt.on_conflict_do_update(
            index_elements=[ChatClear.user_id, ChatClear.topic],
            set_={"up_to": func.greatest(ChatClear.up_to, newest), "cleared_at": func.now()},
        )
    )
    # "X sent you messages" in the bell is about messages that are gone for this member now.
    await db.execute(
        delete(Notification).where(
            Notification.user_id == user.id, Notification.kind == "message", Notification.link == f"/chat?c={quote_plus(payload.topic)}"
        )
    )
    await db.commit()
    # This member's other open tabs refresh their chat list and bell.
    await realtime.push([realtime.to_user(user.id, "groups_changed"), realtime.to_user(user.id, "notifications_changed")])
