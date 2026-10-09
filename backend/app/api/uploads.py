import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_optional_user
from app.core.database import get_db
from app.core.files import verify
from app.models.user import User
from app.models.work import Upload

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_BYTES = 10 * 1024 * 1024
# No SVG/HTML: they can carry script when served from our origin.
ALLOWED = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
}
IMAGES = {k: v for k, v in ALLOWED.items() if k.startswith("image/")}

# Chat attachments (app/api/chat_files.py): images, PDF and everyday documents. Only images and
# PDF are ever shown inline; everything else is served as a download (Content-Disposition: attachment).
DOCUMENTS = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "application/msword": ".doc",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/zip": ".zip",
    "application/x-zip-compressed": ".zip",
    "text/plain": ".txt",
    "text/csv": ".csv",
}
CHAT_ALLOWED = {**ALLOWED, **DOCUMENTS}

ZIP = (b"PK\x03\x04",)  # docx/xlsx/pptx are zip files
OLE = (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",)  # legacy .doc/.xls/.ppt

# The browser-declared type is just a claim; check the file's first bytes too.
SIGNATURES = {
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/gif": (b"GIF87a", b"GIF89a"),
    "application/pdf": (b"%PDF-",),
    **{t: ZIP for t, ext in DOCUMENTS.items() if ext in (".docx", ".xlsx", ".pptx", ".zip")},
    **{t: OLE for t, ext in DOCUMENTS.items() if ext in (".doc", ".xls", ".ppt")},
}


def looks_like(content_type: str, data: bytes) -> bool:
    if content_type == "image/webp":
        return data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    if content_type in ("text/plain", "text/csv"):  # text has no magic bytes: must be UTF-8, no binary
        try:
            return b"\x00" not in data and bool(data.decode("utf-8"))
        except UnicodeDecodeError:
            return False
    return data.startswith(SIGNATURES.get(content_type, ()))

router = APIRouter(tags=["files"])


async def save_upload(
    db: AsyncSession, owner: User, file: UploadFile, allowed: dict[str, str] = ALLOWED, public: bool = False
) -> str:
    """Validate type and size, store under a random name owned by `owner`, return '/files/<name>'.

    Private by default: only the owner (or a signed link the API hands out) can read it.
    """
    ext = allowed.get(file.content_type or "")
    if ext is None:
        kinds = "images (JPG, PNG, WEBP, GIF)" + (" and PDF files" if "application/pdf" in allowed else "")
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"Only {kinds}")
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File is larger than 10 MB")
    if not looks_like(file.content_type, data):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "That file doesn't look like the type it claims to be")

    name = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / name).write_bytes(data)
    db.add(Upload(name=name, owner_id=owner.id, content_type=file.content_type, is_public=public))
    await db.commit()
    return f"/files/{name}"


@router.post("/uploads", status_code=status.HTTP_201_CREATED)
async def upload_file(file: UploadFile, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    path = await save_upload(db, user, file)
    return {"path": path, "name": file.filename or path.rsplit("/", 1)[-1], "content_type": file.content_type}


@router.get("/files/{name}")
async def get_file(
    name: str,
    exp: int | None = None,
    sig: str | None = None,
    viewer: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.get(Upload, name)
    path = UPLOAD_DIR / name
    allowed = row is not None and (row.is_public or (viewer and viewer.id == row.owner_id) or verify(name, exp, sig))
    # Same 404 whether missing or forbidden: never confirm a private file exists.
    if not allowed or not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    headers = {"Cache-Control": "public, max-age=86400" if row.is_public else "private, max-age=3600"}
    return FileResponse(path, media_type=row.content_type if "*" not in row.content_type else None, headers=headers)
