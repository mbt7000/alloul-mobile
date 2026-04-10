"""
Run the AI confirm-save migration against the live database.

Usage:
    python scripts/run_ai_confirm_migration.py

Works with both SQLite and PostgreSQL (reads DATABASE_URL from environment).
For PostgreSQL, ADD COLUMN IF NOT EXISTS is supported natively.
For SQLite, we catch OperationalError for "duplicate column" to stay idempotent.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Allow running from project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text
from config import settings

engine = create_engine(settings.DATABASE_URL)
IS_SQLITE = settings.DATABASE_URL.startswith("sqlite")

# --------------------------------------------------------------------------
# Column additions: (table, column, type_sql)
# --------------------------------------------------------------------------
TASK_COLUMNS = [
    ("project_tasks", "created_by_user_id", "INTEGER"),
    ("project_tasks", "related_client",     "VARCHAR(255)"),
    ("project_tasks", "tags",               "TEXT"),
    ("project_tasks", "notes",              "TEXT"),
    ("project_tasks", "ai_confirmed_at",    "DATETIME"),
    ("project_tasks", "ai_confirmed_by",    "INTEGER"),
]

HANDOVER_COLUMNS = [
    ("handovers", "client_name",              "VARCHAR(255)"),
    ("handovers", "next_owner_name",          "VARCHAR(255)"),
    ("handovers", "next_owner_user_id",       "INTEGER"),
    ("handovers", "pending_actions_json",     "TEXT"),
    ("handovers", "important_contacts_json",  "TEXT"),
    ("handovers", "referenced_files_json",    "TEXT"),
    ("handovers", "flagged_amount",           "REAL"),
    ("handovers", "currency",                 "VARCHAR(8)"),
    ("handovers", "deadline",                 "VARCHAR(32)"),
    ("handovers", "risk_level",               "VARCHAR(16)"),
    ("handovers", "summary",                  "TEXT"),
    ("handovers", "notes",                    "TEXT"),
    ("handovers", "ai_confirmed_at",          "DATETIME"),
    ("handovers", "ai_confirmed_by",          "INTEGER"),
]

ALL_COLUMN_CHANGES = TASK_COLUMNS + HANDOVER_COLUMNS

CREATE_SALES_LEDGER = """
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
    notes               TEXT,
    invoice_number      VARCHAR(128),
    ai_confirmed_at     DATETIME,
    ai_confirmed_by     INTEGER,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
)
"""

CREATE_SALES_LEDGER_PG = CREATE_SALES_LEDGER.replace(
    "INTEGER PRIMARY KEY AUTOINCREMENT",
    "SERIAL PRIMARY KEY",
)

SALES_LEDGER_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_sales_ledger_company  ON sales_ledger(company_id)",
    "CREATE INDEX IF NOT EXISTS idx_sales_ledger_creator  ON sales_ledger(created_by_user_id)",
    "CREATE INDEX IF NOT EXISTS idx_sales_ledger_type     ON sales_ledger(transaction_type)",
    "CREATE INDEX IF NOT EXISTS idx_sales_ledger_status   ON sales_ledger(payment_status)",
]


def _add_column(conn, table: str, col: str, col_type: str) -> None:
    if IS_SQLITE:
        try:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
            print(f"  + {table}.{col}")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print(f"  ~ {table}.{col} already exists — skipped")
            else:
                raise
    else:
        # PostgreSQL supports IF NOT EXISTS
        conn.execute(text(
            f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_type}"
        ))
        print(f"  + {table}.{col}")


def run() -> None:
    print("=== AI Confirm Migration ===\n")
    with engine.begin() as conn:
        # 1. Alter project_tasks + handovers
        print("[1] Altering existing tables...")
        for (table, col, col_type) in ALL_COLUMN_CHANGES:
            _add_column(conn, table, col, col_type)

        # 2. Create sales_ledger
        print("\n[2] Creating sales_ledger table...")
        ddl = CREATE_SALES_LEDGER if IS_SQLITE else CREATE_SALES_LEDGER_PG
        conn.execute(text(ddl))
        print("  + sales_ledger")

        # 3. Indexes
        print("\n[3] Creating indexes...")
        for stmt in SALES_LEDGER_INDEXES:
            try:
                conn.execute(text(stmt))
                idx_name = stmt.split("INDEX IF NOT EXISTS")[1].split("ON")[0].strip()
                print(f"  + {idx_name}")
            except Exception as e:
                print(f"  ~ index already exists or error: {e}")

    print("\n✓ Migration complete.")


if __name__ == "__main__":
    run()
