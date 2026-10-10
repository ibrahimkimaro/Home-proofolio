"""Public and Admin endpoints for legal documents: Privacy Policy, Terms of Service, etc."""
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.legal import LegalDocument
from app.models.user import User
from app.services.platform import audit

router = APIRouter(tags=["legal"])


class LegalDocumentIn(BaseModel):
    slug: str = Field(min_length=2, max_length=80)
    title: str = Field(min_length=2, max_length=200)
    content: str = Field(min_length=10)
    summary: str | None = Field(default=None, max_length=1000)
    version: str = Field(default="1.0", max_length=20)
    is_published: bool = True


class LegalDocumentOut(BaseModel):
    id: str
    slug: str
    title: str
    content: str
    summary: str | None = None
    version: str
    is_published: bool
    created_at: str | None = None
    updated_at: str | None = None


def _doc_to_dict(doc: LegalDocument) -> dict[str, Any]:
    return {
        "id": str(doc.id),
        "slug": doc.slug,
        "title": doc.title,
        "content": doc.content,
        "summary": doc.summary,
        "version": doc.version,
        "is_published": doc.is_published,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
    }


# =========================================================================
# PUBLIC ENDPOINTS
# =========================================================================

@router.get("/legal")
async def list_public_legal_docs(db: AsyncSession = Depends(get_db)):
    """List all published legal documents (Privacy Policy, Terms, etc.)."""
    rows = await db.scalars(
        select(LegalDocument)
        .where(LegalDocument.is_published.is_(True))
        .order_by(LegalDocument.created_at.asc())
    )
    return [_doc_to_dict(d) for d in rows]


@router.get("/legal/{slug}")
async def get_public_legal_doc(slug: str, db: AsyncSession = Depends(get_db)):
    """Retrieve a published legal document by slug."""
    doc = await db.scalar(
        select(LegalDocument)
        .where(LegalDocument.slug == slug, LegalDocument.is_published.is_(True))
    )
    if not doc:
        raise HTTPException(status_code=404, detail=f"Legal document '{slug}' not found")
    return _doc_to_dict(doc)


# =========================================================================
# ADMIN ENDPOINTS
# =========================================================================

@router.get("/admin/legal")
async def list_admin_legal_docs(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: List all legal documents including drafts and unpublished items."""
    rows = await db.scalars(select(LegalDocument).order_by(LegalDocument.created_at.asc()))
    return [_doc_to_dict(d) for d in rows]


@router.post("/admin/legal", status_code=status.HTTP_201_CREATED)
async def create_admin_legal_doc(
    body: LegalDocumentIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: Create a new legal document (e.g. Cookie Policy, Data Retention, etc.)."""
    clean_slug = body.slug.strip().lower().replace(" ", "-")
    existing = await db.scalar(select(LegalDocument).where(LegalDocument.slug == clean_slug))
    if existing:
        raise HTTPException(status_code=400, detail=f"A document with slug '{clean_slug}' already exists")

    doc = LegalDocument(
        id=uuid.uuid4(),
        slug=clean_slug,
        title=body.title.strip(),
        content=body.content.strip(),
        summary=body.summary.strip() if body.summary else None,
        version=body.version.strip(),
        is_published=body.is_published,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(doc)
    audit(db, admin, "legal_document_created", f"Created legal document '{doc.title}' ({doc.slug})")
    await db.commit()
    await db.refresh(doc)
    return _doc_to_dict(doc)


@router.get("/admin/legal/{doc_id}")
async def get_admin_legal_doc(
    doc_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: Get single document details by ID."""
    doc = await db.get(LegalDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return _doc_to_dict(doc)


@router.put("/admin/legal/{doc_id}")
async def update_admin_legal_doc(
    doc_id: uuid.UUID,
    body: LegalDocumentIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: Edit an existing legal document."""
    doc = await db.get(LegalDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    clean_slug = body.slug.strip().lower().replace(" ", "-")
    if clean_slug != doc.slug:
        existing = await db.scalar(select(LegalDocument).where(LegalDocument.slug == clean_slug, LegalDocument.id != doc_id))
        if existing:
            raise HTTPException(status_code=400, detail=f"Another document already uses slug '{clean_slug}'")
        doc.slug = clean_slug

    doc.title = body.title.strip()
    doc.content = body.content.strip()
    doc.summary = body.summary.strip() if body.summary else None
    doc.version = body.version.strip()
    doc.is_published = body.is_published
    doc.updated_at = datetime.now(timezone.utc)

    audit(db, admin, "legal_document_updated", f"Updated legal document '{doc.title}' ({doc.slug})")
    await db.commit()
    await db.refresh(doc)
    return _doc_to_dict(doc)


@router.delete("/admin/legal/{doc_id}")
async def delete_admin_legal_doc(
    doc_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: Delete a legal document."""
    doc = await db.get(LegalDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    title, slug = doc.title, doc.slug
    await db.delete(doc)
    audit(db, admin, "legal_document_deleted", f"Deleted legal document '{title}' ({slug})")
    await db.commit()
    return {"ok": True, "message": f"Deleted document '{title}'"}
