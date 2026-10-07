"""daily memories, stories and chapters

Revision ID: a4c6e8b0d2f3
Revises: f3b5d7e9a1c2
Create Date: 2026-10-06 10:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'a4c6e8b0d2f3'
down_revision: Union[str, None] = 'f3b5d7e9a1c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

VIS = postgresql.ENUM('public', 'unlisted', 'private', 'draft', name='visibility', create_type=False)
UUID = postgresql.UUID(as_uuid=True)
JSONB = postgresql.JSONB()


def _ts():
    return [sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now())]


def upgrade() -> None:
    op.create_table(
        'memories',
        sa.Column('id', UUID, primary_key=True),
        sa.Column('user_id', UUID, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(200)),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('occurred_on', sa.Date(), nullable=False),
        sa.Column('occurred_time', sa.Time()),
        sa.Column('category', sa.String(50), nullable=False, server_default='daily'),
        sa.Column('mood', sa.String(50), nullable=False),
        sa.Column('people', JSONB, nullable=False),
        sa.Column('location', sa.String(200)),
        sa.Column('project_id', UUID, sa.ForeignKey('work_items.id', ondelete='SET NULL')),
        sa.Column('achievement_id', UUID, sa.ForeignKey('work_items.id', ondelete='SET NULL')),
        sa.Column('skills', JSONB, nullable=False, server_default='[]'),
        sa.Column('media', JSONB, nullable=False, server_default='[]'),
        sa.Column('tags', JSONB, nullable=False, server_default='[]'),
        sa.Column('attributes', JSONB, nullable=False, server_default='{}'),
        sa.Column('visibility', VIS, nullable=False, server_default='private'),
        sa.Column('importance', sa.Integer(), nullable=False, server_default='3'),
        *_ts(),
    )
    op.create_index('ix_memories_user_date', 'memories', ['user_id', 'occurred_on'])
    op.create_table(
        'stories',
        sa.Column('id', UUID, primary_key=True),
        sa.Column('user_id', UUID, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('cover_media', sa.String(64)),
        sa.Column('visibility', VIS, nullable=False, server_default='private'),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        *_ts(),
    )
    op.create_table(
        'story_chapters',
        sa.Column('id', UUID, primary_key=True),
        sa.Column('story_id', UUID, sa.ForeignKey('stories.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('content', sa.Text(), nullable=False, server_default=''),
        sa.Column('memory_ids', JSONB, nullable=False, server_default='[]'),
        sa.Column('project_ids', JSONB, nullable=False, server_default='[]'),
        sa.Column('achievement_ids', JSONB, nullable=False, server_default='[]'),
        sa.Column('media', JSONB, nullable=False, server_default='[]'),
        sa.Column('visibility', VIS, nullable=False, server_default='private'),
        sa.Column('ai_generated', sa.Boolean(), nullable=False, server_default='false'),
        *_ts(),
    )


def downgrade() -> None:
    op.drop_table('story_chapters')
    op.drop_table('stories')
    op.drop_index('ix_memories_user_date', table_name='memories')
    op.drop_table('memories')
