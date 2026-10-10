"""add legal_documents table

Revision ID: e3d8f7a1c9b2
Revises: 44493da25d3b
Create Date: 2026-10-10 12:22:00.000000

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "e3d8f7a1c9b2"
down_revision = "44493da25d3b"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "legal_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("version", sa.String(length=20), server_default="1.0", nullable=False),
        sa.Column("is_published", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f("ix_legal_documents_slug"), "legal_documents", ["slug"], unique=True)


def downgrade():
    op.drop_index(op.f("ix_legal_documents_slug"), table_name="legal_documents")
    op.drop_table("legal_documents")
