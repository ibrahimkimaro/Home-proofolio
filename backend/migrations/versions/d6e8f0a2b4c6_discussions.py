"""create discussions, replies, and votes tables

Revision ID: d6e8f0a2b4c6
Revises: c2d4e6f8a1b3
Create Date: 2026-10-08 17:35:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'd6e8f0a2b4c6'
down_revision: Union[str, None] = 'c2d4e6f8a1b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'discussions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('category', sa.String(50), server_default='general', nullable=False),
        sa.Column('access_type', sa.String(20), server_default='open', nullable=False),
        sa.Column('invited_users', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=False),
        sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_discussions_user_id', 'discussions', ['user_id'])
    op.create_index('ix_discussions_category', 'discussions', ['category'])
    op.create_index('ix_discussions_access_type', 'discussions', ['access_type'])
    op.create_index('ix_discussions_created_at', 'discussions', ['created_at'])

    op.create_table(
        'discussion_replies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('discussion_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('discussions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_discussion_replies_discussion_id', 'discussion_replies', ['discussion_id'])
    op.create_index('ix_discussion_replies_user_id', 'discussion_replies', ['user_id'])
    op.create_index('ix_discussion_replies_created_at', 'discussion_replies', ['created_at'])

    op.create_table(
        'discussion_votes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('discussion_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('discussions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('discussion_id', 'user_id', name='uq_discussion_user_vote'),
    )
    op.create_index('ix_discussion_votes_pair', 'discussion_votes', ['discussion_id', 'user_id'])


def downgrade() -> None:
    op.drop_table('discussion_votes')
    op.drop_table('discussion_replies')
    op.drop_table('discussions')
