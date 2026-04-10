"""add referrals table and referral columns to users

Revision ID: 001_add_referrals
Revises: (your base revision)
Create Date: 2026-04-05
"""

from alembic import op
import sqlalchemy as sa

revision = "001_add_referrals"
down_revision = None  # Set to your previous migration revision ID
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Add referral columns to users table ───────────────────────────────────
    op.add_column("users", sa.Column("referral_code", sa.String(20), nullable=True, unique=True))
    op.add_column("users", sa.Column("referred_by_code", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("pro_trial_ends_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("total_referrals", sa.Integer(), nullable=False, server_default="0"))

    op.create_index("ix_users_referral_code", "users", ["referral_code"], unique=True)

    # ── Create referrals table ────────────────────────────────────────────────
    op.create_table(
        "referrals",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("referrer_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("referred_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "completed", "rewarded", name="referral_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )

    op.create_index("ix_referrals_referrer_id", "referrals", ["referrer_id"])
    op.create_index("ix_referrals_code", "referrals", ["code"])

    # ── Update analytics_events table (if not exists) ─────────────────────────
    # Ensures referral event types work with existing analytics infrastructure
    # No schema change needed — event_type is a varchar already


def downgrade() -> None:
    op.drop_table("referrals")
    op.drop_index("ix_users_referral_code", table_name="users")
    op.drop_column("users", "referral_code")
    op.drop_column("users", "referred_by_code")
    op.drop_column("users", "pro_trial_ends_at")
    op.drop_column("users", "total_referrals")
    op.execute("DROP TYPE IF EXISTS referral_status")
