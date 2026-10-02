"""notifications: at most one unread chat-message notification per member and chat

Revision ID: e7a3c5d9f1b4
Revises: d4f9b2c6e8a1
Create Date: 2026-10-02 14:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e7a3c5d9f1b4'
down_revision: Union[str, None] = 'd4f9b2c6e8a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Keep the newest of any duplicates before adding the constraint.
    op.execute("""
        DELETE FROM notifications n USING notifications m
        WHERE n.kind = 'message' AND m.kind = 'message' AND n.read_at IS NULL AND m.read_at IS NULL
          AND n.user_id = m.user_id AND n.link = m.link AND n.created_at < m.created_at
    """)
    op.create_index(
        'uq_notifications_unread_message', 'notifications', ['user_id', 'link'], unique=True,
        postgresql_where=sa.text("kind = 'message' AND read_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index('uq_notifications_unread_message', table_name='notifications')
