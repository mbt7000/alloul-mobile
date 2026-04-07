"""
Migration: Add company_id to handovers, memories, deals tables
and create company_onboarding table.

Safe to run multiple times (uses IF NOT EXISTS / IGNORE).
"""
import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "app.db")


def run():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH}. Skipping migration.")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    migrations = [
        # Add company_id to handovers
        "ALTER TABLE handovers ADD COLUMN company_id INTEGER REFERENCES companies(id)",
        # Add company_id to memories
        "ALTER TABLE memories ADD COLUMN company_id INTEGER REFERENCES companies(id)",
        # Add company_id to deals
        "ALTER TABLE deals ADD COLUMN company_id INTEGER REFERENCES companies(id)",
        # Create company_onboarding table
        """CREATE TABLE IF NOT EXISTS company_onboarding (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
            step_profile INTEGER NOT NULL DEFAULT 0,
            step_team INTEGER NOT NULL DEFAULT 0,
            step_invite INTEGER NOT NULL DEFAULT 0,
            step_project INTEGER NOT NULL DEFAULT 0,
            completed INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME
        )""",
    ]

    for sql in migrations:
        try:
            cur.execute(sql)
            print(f"  ✓ {sql[:60]}...")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print(f"  ⏭  Already applied: {sql[:60]}...")
            else:
                print(f"  ✗ Error: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
