"""admin messages: choose recipients, and track who each one reached (delivered / read)

Revision ID: c4e6a8b0d2f1
Revises: b3d5f7a9c1e2
Create Date: 2026-10-04 10:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'c4e6a8b0d2f1'
down_revision: Union[str, None] = 'b3d5f7a9c1e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Which admin message a notification came from, and when it first reached the member's device.
    op.add_column('notifications', sa.Column('broadcast_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('broadcasts.id', ondelete='SET NULL'), nullable=True))
    op.add_column('notifications', sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_notifications_broadcast_id', 'notifications', ['broadcast_id'])
    # The people picked when a message goes to chosen members (segment = 'selected').
    op.add_column('broadcasts', sa.Column('user_ids', postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column('broadcasts', 'user_ids')
    op.drop_index('ix_notifications_broadcast_id', table_name='notifications')
    op.drop_column('notifications', 'delivered_at')
    op.drop_column('notifications', 'broadcast_id')
