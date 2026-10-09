"""Pin messages in a chat, for yourself: GET/POST/DELETE /chat/pins.

A pin is personal (the other people don't see it). It works the same in 1:1 chats and groups, for members and admins."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.chat_clear import _is_theirs
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.chat import ChatMessage, ChatPin
from app.models.user import User

router = APIRouter(prefix="/chat/pins", tags=["chat"])
MAX_PINS = 50


class PinIn(BaseModel):
    topic: str = Field(min_length=8, max_length=200)
    message_id: int = Field(gt=0)


async def _require_chat(db: AsyncSession, user: User, topic: str) -> None:
    if not await _is_theirs(db, user, topic):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chat not found")


@router.get("")
async def list_pins(topic: str = Query(min_length=8, max_length=200), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """This member's pinned messages in one chat, most recently pinned first."""
    await _require_chat(db, user, topic)
    rows = (await db.execute(
        select(ChatMessage.id, ChatMessage.author_name, ChatMessage.body, ChatMessage.attachment, ChatMessage.deleted_at)
        .join(ChatPin, ChatPin.message_id == ChatMessage.id)
        .where(ChatPin.user_id == user.id, ChatPin.topic == topic, ChatMessage.topic == topic)
        .order_by(ChatPin.pinned_at.desc())
    )).all()
    return [
        {"message_id": i, "author_name": name, "text": "" if gone else body, "has_file": bool(att) and not gone, "deleted": gone is not None}
        for i, name, body, att, gone in rows
    ]


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
async def pin_message(payload: PinIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _require_chat(db, user, payload.topic)
    found = await db.scalar(select(ChatMessage.id).where(ChatMessage.id == payload.message_id, ChatMessage.topic == payload.topic, ChatMessage.deleted_at.is_(None)))
    if found is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message not found")
    count = len((await db.scalars(select(ChatPin.message_id).where(ChatPin.user_id == user.id, ChatPin.topic == payload.topic))).all())
    if count >= MAX_PINS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"You can pin up to {MAX_PINS} messages in a chat. Unpin one first.")
    await db.execute(insert(ChatPin).values(user_id=user.id, topic=payload.topic, message_id=payload.message_id).on_conflict_do_nothing())
    await db.commit()


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def unpin_message(topic: str = Query(min_length=8, max_length=200), message_id: int = Query(gt=0),
                        user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(ChatPin).where(ChatPin.user_id == user.id, ChatPin.topic == topic, ChatPin.message_id == message_id))
    await db.commit()
