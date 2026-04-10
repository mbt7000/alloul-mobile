"""
AI Tables Migration
====================
Idempotent migration that:
1. Adds company_id to handovers (critical org isolation fix)
2. Adds priority, tags, audit columns to project_tasks
3. Adds AI-enriched columns to handovers
4. Creates sales_ledger table

Run from the backend directory:
    python scripts/migrate_ai_tables.py

Safe to run multiple times — duplicates are silently ignored.
Works with SQLite (development) and PostgreSQL (production).
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, inspect, text
from config import settings

engine = create_engine(settings.DATABASE_URL)
IS_SQLITE = settings.DATABASE_URL.startswith("sqlite")


def _add_column(conn, table: str, col: str, col_type: str) -> None:
    """Add a column if it doesn't exist. Silent on duplicate."""
    # Check if column exists via inspector
    insp = inspect(engine)
    existing = [c["name"] for c in insp.get_columns(table)]
    if col in existing:
        print(f"  ~ {table}.{col} already exists")
        return
    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
    print(f"  + {table}.{col}")


HANDOVER_COLUMNS = [
    ("company_id",              "INTEGER"),    # CRITICAL: org isolation
    ("client_name",             "VARCHAR(255)"),
    ("next_owner_name",         "VARCHAR(255)"),
    ("next_owner_user_id",      "INTEGER"),
    ("pending_actions_json",    "TEXT"),
    ("important_contacts_json", "TEXT"),
    ("referenced_files_json",   "TEXT"),
    ("flagged_amount",          "REAL"),
    ("currency",                "VARCHAR(8)"),
    ("deadline",                "VARCHAR(64)"),
    ("risk_level",              "VARCHAR(16)"),
    ("summary",                 "TEXT"),
    ("notes",                   "TEXT"),
    ("ai_confirmed_at",         "DATETIME"),
    ("ai_confirmed_by",         "INTEGER"),
]

TASK_COLUMNS = [
    ("priority",            "VARCHAR(16) DEFAULT 'medium'"),
    ("created_by_user_id",  "INTEGER"),
    ("related_client",      "VARCHAR(255)"),
    ("tags",                "TEXT"),
    ("notes",               "TEXT"),
    ("ai_confirmed_at",     "DATETIME"),
    ("ai_confirmed_by",     "INTEGER"),
]

CREATE_SALES_LEDGER_SQLITE = """
CREATE TABLE IF NOT EXISTS sales_ledger (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id          INTEGER NOT NULL,
    created_by_user_id  INTEGER NOT NULL,
    transaction_type    VARCHAR(32) NOT NULL,
    counterparty_name   VARCHAR(255),
    item_name           VARCHAR(255),
    quantity            REAL,
    amount              REAL NOT NULL,
    currency            VARCHAR(8) DEFAULT 'SAR',
    transaction_date    VARCHAR(32),
    payment_status      VARCHAR(32) DEFAULT 'pending',
    category            VARCHAR(128),
    invoice_number      VARCHAR(128),
    notes               TEXT,
    ai_confirmed_at     DATETIME,
    ai_confirmed_by     INTEGER,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
)
"""

CREATE_SALES_LEDGER_PG = CREATE_SALES_LEDGER_SQLITE.replace(
    "INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY"
)

SALES_LEDGER_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_sl_company  ON sales_ledger(company_id)",
    "CREATE INDEX IF NOT EXISTS idx_sl_creator  ON sales_ledger(created_by_user_id)",
    "CREATE INDEX IF NOT EXISTS idx_sl_type     ON sales_ledger(transaction_type)",
    "CREATE INDEX IF NOT EXISTS idx_sl_status   ON sales_ledger(payment_status)",
]


def run():
    print("=" * 50)
    print("  Alloul AI Tables Migration")
    print("=" * 50)
    with engine.begin() as conn:
        print("\n[1] Updating handovers table...")
        for col, dtype in HANDOVER_COLUMNS:
            _add_column(conn, "handovers", col, dtype)

        print("\n[2] Updating project_tasks table...")
        for col, dtype in TASK_COLUMNS:
            _add_column(conn, "project_tasks", col, dtype)

        print("\n[3] Creating sales_ledger table...")
        ddl = CREATE_SALES_LEDGER_SQLITE if IS_SQLITE else CREATE_SALES_LEDGER_PG
        conn.execute(text(ddl))
        print("  + sales_ledger")

        print("\n[4] Creating indexes...")
        for stmt in SALES_LEDGER_INDEXES:
            try:
                conn.execute(text(stmt))
                name = stmt.split("INDEX IF NOT EXISTS")[1].split("ON")[0].strip()
                print(f"  + {name}")
            except Exception as e:
                print(f"  ~ {e}")

    print("\n✓ Migration complete.")


if __name__ == "__main__":
    run()
