"""notifications, security events, IP blocks, broadcasts; session IP and last seen

Revision ID: b7d2c5e8f1a3
Revises: a1c4e7f0b2d9
Create Date: 2026-10-01 16:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'b7d2c5e8f1a3'
down_revision: Union[str, None] = 'a1c4e7f0b2d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('kind', sa.String(30), nullable=False),
        sa.Column('title', sa.String(160), nullable=False),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('link', sa.String(300), nullable=True),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])

    op.create_table(
        'security_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('kind', sa.String(30), nullable=False),
        sa.Column('ip', sa.String(64), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('user_agent', sa.String(300), nullable=True),
        sa.Column('details', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_security_events_kind', 'security_events', ['kind'])
    op.create_index('ix_security_events_ip', 'security_events', ['ip'])
    op.create_index('ix_security_events_user_id', 'security_events', ['user_id'])
    op.create_index('ix_security_events_created_at', 'security_events', ['created_at'])

    op.create_table(
        'blocked_ips',
        sa.Column('ip', sa.String(64), primary_key=True),
        sa.Column('reason', sa.String(200), server_default='', nullable=False),
        sa.Column('blocked_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'broadcasts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('admin_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('channel', sa.String(10), nullable=False),
        sa.Column('segment', sa.String(20), nullable=False),
        sa.Column('subject', sa.String(160), server_default='', nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('recipients', sa.Integer(), server_default='0', nullable=False),
        sa.Column('delivery', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_broadcasts_created_at', 'broadcasts', ['created_at'])

    op.add_column('sessions', sa.Column('ip', sa.String(64), nullable=True))
    op.add_column('sessions', sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('sessions', 'last_seen_at')
    op.drop_column('sessions', 'ip')
    op.drop_table('broadcasts')
    op.drop_table('blocked_ips')
    op.drop_table('security_events')
    op.drop_table('notifications')
