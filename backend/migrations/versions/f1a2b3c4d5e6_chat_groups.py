"""chat groups: members are invited, accept or decline, and one of them is the admin

Revision ID: f1a2b3c4d5e6
Revises: e7a3c5d9f1b4
Create Date: 2026-10-03 12:50:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e7a3c5d9f1b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'chat_groups',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('slug', sa.String(64), nullable=False, unique=True),
        sa.Column('name', sa.String(120), nullable=False),
        sa.Column('topic', sa.String(200), nullable=False, server_default=''),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        'chat_group_members',
        sa.Column('group_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chat_groups.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('role', sa.String(10), nullable=False, server_default='member'),  # admin | member
        sa.Column('status', sa.String(10), nullable=False, server_default='invited'),  # invited | member | declined
        sa.Column('invited_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_chat_group_members_user', 'chat_group_members', ['user_id', 'status'])


def downgrade() -> None:
    op.drop_index('ix_chat_group_members_user', table_name='chat_group_members')
    op.drop_table('chat_group_members')
    op.drop_table('chat_groups')
