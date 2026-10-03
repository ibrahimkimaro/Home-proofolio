"""chat messages can carry one attachment (image or document)

Revision ID: a7c9e2f4b6d8
Revises: f1a2b3c4d5e6
Create Date: 2026-10-03 15:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'a7c9e2f4b6d8'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # {"name": "<uploads.name>", "filename": "...", "content_type": "...", "size": 1234}
    op.add_column('chat_messages', sa.Column('attachment', postgresql.JSONB(), nullable=True))
    # "Shared files" in a chat's details panel lists a conversation's attachments.
    op.create_index(
        'ix_chat_messages_topic_attachment', 'chat_messages', ['topic', 'id'],
        postgresql_where=sa.text('attachment IS NOT NULL'),
    )


def downgrade() -> None:
    op.drop_index('ix_chat_messages_topic_attachment', table_name='chat_messages')
    op.drop_column('chat_messages', 'attachment')
