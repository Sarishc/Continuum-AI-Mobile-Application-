"""
Alembic migration: add push_token, push_platform, push_token_updated_at to users table.

Place this file in your alembic/versions/ directory and run:
    alembic upgrade head
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "a1b2c3d4e5f6"
down_revision = None  # set to your current head revision
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create the enum type first
    push_platform_enum = postgresql.ENUM(
        "ios", "android", name="push_platform_enum", create_type=True
    )
    push_platform_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "users",
        sa.Column("push_token", sa.String(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "push_platform",
            sa.Enum("ios", "android", name="push_platform_enum"),
            nullable=True,
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "push_token_updated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_users_push_token", "users", ["push_token"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_users_push_token", table_name="users")
    op.drop_column("users", "push_token_updated_at")
    op.drop_column("users", "push_platform")
    op.drop_column("users", "push_token")

    push_platform_enum = postgresql.ENUM(
        "ios", "android", name="push_platform_enum", create_type=False
    )
    push_platform_enum.drop(op.get_bind(), checkfirst=True)
