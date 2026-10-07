"""per-user AI companion settings

Revision ID: e2a4c6b8d0f1
Revises: d1f3b5c7e9a8
Create Date: 2026-10-06 07:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'e2a4c6b8d0f1'
down_revision: Union[str, None] = 'd1f3b5c7e9a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'companions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('name', sa.String(50), nullable=False, server_default='Kimmy'),
        sa.Column('relationship_type', sa.String(50), nullable=False, server_default='personal assistant'),
        sa.Column('personality', sa.String(100), nullable=True),
        sa.Column('communication_style', sa.String(30), nullable=False, server_default='friendly'),
        sa.Column('languages', postgresql.JSONB(), nullable=False, server_default='["English", "Kiswahili"]'),
        sa.Column('purpose', postgresql.JSONB(), nullable=False, server_default='["everything"]'),
        sa.Column('proactivity', sa.String(30), nullable=False, server_default='occasional'),
        sa.Column('memory_preferences', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('access_permissions', postgresql.JSONB(), nullable=False, server_default='["profile", "projects"]'),
        sa.Column('custom_instructions', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('companions')
