"""chat: edit and delete messages, delete a chat for yourself, and a group picture

Revision ID: b9d1f3a5c7e6
Revises: a8c0e2f4b6d5
Create Date: 2026-10-04 16:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'b9d1f3a5c7e6'
down_revision: Union[str, None] = 'a8c0e2f4b6d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('chat_groups', sa.Column('avatar_url', sa.String(300), nullable=True))
    # A sent message can be corrected (edited_at) or taken back (deleted_at: its text and file are blanked and the
    # chat shows "This message was deleted"; the row stays so history, replies and paging keep their order).
    op.add_column('chat_messages', sa.Column('edited_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('chat_messages', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    # "Delete chat": this member no longer sees messages up to up_to in this conversation. The other people still do.
    op.create_table(
        'chat_clears',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('topic', sa.String(200), primary_key=True),
        sa.Column('up_to', sa.BigInteger(), nullable=False),
        sa.Column('cleared_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('chat_clears')
    op.drop_column('chat_messages', 'deleted_at')
    op.drop_column('chat_messages', 'edited_at')
    op.drop_column('chat_groups', 'avatar_url')
