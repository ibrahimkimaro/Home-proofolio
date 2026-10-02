"""chat_messages: recipient (DMs) and read_at, for saved read receipts and unread counts

Revision ID: d4f9b2c6e8a1
Revises: c3e8a1f5d7b2
Create Date: 2026-10-02 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'd4f9b2c6e8a1'
down_revision: Union[str, None] = 'c3e8a1f5d7b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('chat_messages', sa.Column('recipient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True))
    op.add_column('chat_messages', sa.Column('read_at', sa.DateTime(timezone=True), nullable=True))
    # Existing DMs: the recipient is the pair member who isn't the author. Treat them as read so
    # nobody wakes up to badges for conversations from before read state was stored.
    op.execute("""
        UPDATE chat_messages SET
          recipient_id = CASE WHEN split_part(substr(topic, 8), '_', 1)::uuid = author_id
                              THEN split_part(substr(topic, 8), '_', 2)::uuid
                              ELSE split_part(substr(topic, 8), '_', 1)::uuid END,
          read_at = inserted_at
        WHERE topic LIKE 'direct:%'
    """)
    op.create_index('ix_chat_messages_unread', 'chat_messages', ['recipient_id'], postgresql_where=sa.text('read_at IS NULL'))


def downgrade() -> None:
    op.drop_index('ix_chat_messages_unread', table_name='chat_messages')
    op.drop_column('chat_messages', 'read_at')
    op.drop_column('chat_messages', 'recipient_id')
