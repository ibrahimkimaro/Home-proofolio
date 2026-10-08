"""personal pinned messages in chats

Revision ID: c2d4e6f8a1b3
Revises: b1c3d5e7f9a2
Create Date: 2026-10-08 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'c2d4e6f8a1b3'
down_revision: Union[str, None] = 'b1c3d5e7f9a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'chat_pins',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('topic', sa.String(200), primary_key=True),
        sa.Column('message_id', sa.BigInteger(), primary_key=True),
        sa.Column('pinned_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('chat_pins')
