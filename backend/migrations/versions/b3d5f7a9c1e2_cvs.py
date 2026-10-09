"""cvs: each member's CV extras, signature and share link

Revision ID: b3d5f7a9c1e2
Revises: a7c9e2f4b6d8
Create Date: 2026-10-03 17:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'b3d5f7a9c1e2'
down_revision: Union[str, None] = 'a7c9e2f4b6d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'cvs',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('signature', sa.Text(), nullable=True),
        sa.Column('signed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('share_token', sa.String(64), nullable=True, unique=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('cvs')
