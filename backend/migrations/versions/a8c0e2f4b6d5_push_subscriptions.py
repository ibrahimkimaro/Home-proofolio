"""web push: the browsers/devices a member allowed to send them notifications

Revision ID: a8c0e2f4b6d5
Revises: f7b9d1e3a5c4
Create Date: 2026-10-04 14:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'a8c0e2f4b6d5'
down_revision: Union[str, None] = 'f7b9d1e3a5c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'push_subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('endpoint', sa.Text(), nullable=False, unique=True),
        sa.Column('p256dh', sa.String(200), nullable=False),
        sa.Column('auth', sa.String(100), nullable=False),
        sa.Column('user_agent', sa.String(300), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_push_subscriptions_user_id', 'push_subscriptions', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_push_subscriptions_user_id', table_name='push_subscriptions')
    op.drop_table('push_subscriptions')
