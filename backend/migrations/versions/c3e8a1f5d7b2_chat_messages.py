"""chat_messages: persisted realtime chat history

Revision ID: c3e8a1f5d7b2
Revises: b7d2c5e8f1a3
Create Date: 2026-10-02 09:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'c3e8a1f5d7b2'
down_revision: Union[str, None] = 'b7d2c5e8f1a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('client_id', sa.String(64), nullable=False),
        sa.Column('topic', sa.String(200), nullable=False),
        sa.Column('author_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('author_name', sa.String(255), nullable=False),
        sa.Column('author_username', sa.String(50), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('reply_to', postgresql.JSONB(), nullable=True),
        sa.Column('inserted_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('author_id', 'client_id', name='uq_chat_messages_author_client'),
    )
    op.create_index('ix_chat_messages_topic_id', 'chat_messages', ['topic', 'id'])


def downgrade() -> None:
    op.drop_index('ix_chat_messages_topic_id', table_name='chat_messages')
    op.drop_table('chat_messages')
