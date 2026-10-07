"""engagement: stars, comments, CV requests and visitor messages

Revision ID: d1f3b5c7e9a8
Revises: c0e2a4b6d8f7
Create Date: 2026-10-05 10:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'd1f3b5c7e9a8'
down_revision: Union[str, None] = 'c0e2a4b6d8f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def uid():
    return postgresql.UUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        'likes',
        sa.Column('id', uid(), primary_key=True),
        sa.Column('user_id', uid(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('target_kind', sa.String(10), nullable=False),
        sa.Column('target_id', uid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'target_kind', 'target_id'),
    )
    op.create_index('ix_likes_target', 'likes', ['target_kind', 'target_id'])
    op.create_table(
        'comments',
        sa.Column('id', uid(), primary_key=True),
        sa.Column('user_id', uid(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('target_kind', sa.String(10), nullable=False),
        sa.Column('target_id', uid(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_comments_target', 'comments', ['target_kind', 'target_id'])
    op.create_table(
        'cv_requests',
        sa.Column('id', uid(), primary_key=True),
        sa.Column('owner_id', uid(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('requester_id', uid(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('message', sa.String(500), nullable=True),
        sa.Column('status', sa.String(10), nullable=False, server_default='pending'),
        sa.Column('ip', sa.String(64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        'visitor_messages',
        sa.Column('id', uid(), primary_key=True),
        sa.Column('owner_id', uid(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('ip', sa.String(64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('visitor_messages')
    op.drop_table('cv_requests')
    op.drop_index('ix_comments_target', table_name='comments')
    op.drop_table('comments')
    op.drop_index('ix_likes_target', table_name='likes')
    op.drop_table('likes')
