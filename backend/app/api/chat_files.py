"""Chat attachments and the details panel of a 1:1 chat.

A file is uploaded first (POST /chat/attachments, owned by the sender), then sent as a chat message
whose `attachment` names it; realtime_chat only accepts files the sender owns. Who may download it
follows the conversation: the uploader, or anyone who can read a chat it was sent in (the two
people of a DM, the accepted members of a group). Removed group members lose access with the chat.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.uploads import CHAT_ALLOWED, UPLOAD_DIR, save_upload
from app.core.database import get_db
from app.core.files import sign
from app.models.profile import Profile
from app.models.user import User
from app.models.work import Upload

router = APIRouter(prefix="/chat", tags=["chat-files"])

INLINE = {"image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"}

# A message's attachment, if the viewer can read a conversation it was sent in.
_VISIBLE = text("""
SELECT m.attachment FROM chat_messages m
WHERE m.attachment->>'name' = :name AND (
  (m.topic LIKE 'direct:%' AND strpos(m.topic, :me) > 0)
  OR EXISTS (
    SELECT 1 FROM chat_groups g JOIN chat_group_members gm ON gm.group_id = g.id
    WHERE m.topic = 'room:' || g.slug AND gm.user_id = CAST(:me AS uuid) AND gm.status = 'member'
  )
)
LIMIT 1
""")


@router.post("/attachments", status_code=status.HTTP_201_CREATED)
async def upload_attachment(file: UploadFile, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    if (file.content_type or "") not in CHAT_ALLOWED:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "You can send images, PDFs, Word, Excel, PowerPoint, text/CSV and ZIP files",
        )
    path = await save_upload(db, user, file, allowed=CHAT_ALLOWED)
    name = path.removeprefix("/files/")
    size = (UPLOAD_DIR / name).stat().st_size
    filename = (file.filename or name).replace("/", "_").replace("\\", "_")[:200]
    return {"name": name, "filename": filename, "content_type": file.content_type, "size": size}


@router.get("/attachments/{name}")
async def get_attachment(name: str, download: bool = False, viewer: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await db.get(Upload, name)
    path = UPLOAD_DIR / name
    att = None
    if row is not None and row.owner_id != viewer.id:
        att = (await db.execute(_VISIBLE, {"name": name, "me": str(viewer.id)})).scalar()
    allowed = row is not None and (row.owner_id == viewer.id or att is not None)
    # Same 404 whether missing or forbidden: never confirm a private file exists.
    if not allowed or not path.is_file() or "/" in name or "\\" in name:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    filename = (att or {}).get("filename") or name
    inline = row.content_type in INLINE and not download
    return FileResponse(
        path,
        media_type=row.content_type,
        filename=filename,
        content_disposition_type="inline" if inline else "attachment",
        headers={"Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"},
    )


@router.get("/contacts/{user_id}/info")
async def contact_info(user_id: uuid.UUID, viewer: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    """The 1:1 chat's details panel: who they are, and every file the two of you exchanged."""
    other = await db.get(User, user_id)
    if other is None or not other.is_active or other.id == viewer.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    profile = await db.scalar(select(Profile).where(Profile.user_id == other.id))
    # The phone number is the private one used for sign-in codes: shown only if they chose to share it.
    shares_phone = bool(((other.preferences or {}).get("privacy") or {}).get("show_phone_in_chat"))
    topic = "direct:" + "_".join(sorted([str(viewer.id), str(other.id)]))
    rows = (
        await db.execute(
            text(
                "SELECT id, author_id::text, author_name, attachment, inserted_at FROM chat_messages "
                "WHERE topic = :t AND attachment IS NOT NULL ORDER BY id DESC LIMIT 300"
            ),
            {"t": topic},
        )
    ).all()
    return {
        "id": str(other.id),
        "name": (profile.display_name if profile and profile.display_name else other.fullname) or other.username,
        "username": other.username,
        "avatar": sign(profile.avatar_url) if profile and profile.avatar_url else None,
        "headline": profile.headline if profile else None,
        "bio": profile.bio if profile else None,
        "phone": other.phone_number if shares_phone and other.phone_number else None,
        "joined_at": other.created_at.isoformat() if other.created_at else None,
        "topic": topic,
        "files": [
            {
                "message_id": str(mid),
                "mine": author == str(viewer.id),
                "author_name": author_name,
                "sent_at": at.isoformat(),
                **att,
            }
            for mid, author, author_name, att, at in rows
        ],
    }
