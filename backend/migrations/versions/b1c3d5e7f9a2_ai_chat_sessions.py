"""AI companion chat sessions and messages

Revision ID: b1c3d5e7f9a2
Revises: a4c6e8b0d2f3
Create Date: 2026-10-08 09:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'b1c3d5e7f9a2'
down_revision: Union[str, None] = 'a4c6e8b0d2f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'ai_chat_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(80), nullable=False, server_default='New chat'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_ai_chat_sessions_user_id', 'ai_chat_sessions', ['user_id'])
    op.create_table(
        'ai_chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ai_chat_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(10), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_ai_chat_messages_session_created', 'ai_chat_messages', ['session_id', 'created_at'])


def downgrade() -> None:
    op.drop_table('ai_chat_messages')
    op.drop_table('ai_chat_sessions')
