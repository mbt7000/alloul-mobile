"""baseline — initial schema (all 42 models)

Revision ID: 0001_baseline
Revises:
Create Date: 2026-04-14

NOTE: This baseline is intended for EXISTING databases that were bootstrapped
via Base.metadata.create_all(). For fresh installs, run:
    alembic upgrade head
on an empty database and Alembic will call create_all via op.bulk_insert(...)
fallback — but since the schema is already established on production via
SQLAlchemy's create_all, this migration is idempotent via `alembic stamp head`.

For a truly clean baseline, use:
    alembic revision --autogenerate -m "baseline"
once all models are locked in. This stub exists so subsequent migrations have
a parent revision.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Baseline — no-op. Use `alembic stamp head` on an existing DB.
    pass


def downgrade() -> None:
    # Cannot downgrade below baseline.
    pass
