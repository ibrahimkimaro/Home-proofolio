"""create ai_usage_logs and ai_user_quotas tables

Revision ID: e8c9d0f1a2b3
Revises: d6e8f0a2b4c6
Create Date: 2026-10-09 10:40:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'e8c9d0f1a2b3'
down_revision: Union[str, None] = 'd6e8f0a2b4c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'ai_usage_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('feature', sa.String(50), server_default='companion_chat', nullable=False),
        sa.Column('endpoint', sa.String(100), server_default='/ai/chat', nullable=False),
        sa.Column('model', sa.String(80), nullable=False),
        sa.Column('prompt_tokens', sa.Integer(), server_default='0', nullable=False),
        sa.Column('completion_tokens', sa.Integer(), server_default='0', nullable=False),
        sa.Column('total_tokens', sa.Integer(), server_default='0', nullable=False),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(20), server_default='success', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_ai_usage_logs_user_created', 'ai_usage_logs', ['user_id', 'created_at'])
    op.create_index('ix_ai_usage_logs_created_at', 'ai_usage_logs', ['created_at'])
    op.create_index('ix_ai_usage_logs_status', 'ai_usage_logs', ['status'])

    op.create_table(
        'ai_user_quotas',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('is_ai_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('daily_token_limit', sa.Integer(), server_default='50000', nullable=False),
        sa.Column('monthly_token_limit', sa.Integer(), server_default='1000000', nullable=False),
        sa.Column('custom_rpm_limit', sa.Integer(), nullable=True),
        sa.Column('tier', sa.String(50), server_default='standard', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('ai_user_quotas')
    op.drop_index('ix_ai_usage_logs_status', table_name='ai_usage_logs')
    op.drop_index('ix_ai_usage_logs_created_at', table_name='ai_usage_logs')
    op.drop_index('ix_ai_usage_logs_user_created', table_name='ai_usage_logs')
    op.drop_table('ai_usage_logs')
