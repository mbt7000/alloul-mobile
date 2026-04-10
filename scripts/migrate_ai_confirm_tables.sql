-- =============================================================================
-- Migration: AI Confirm-Save Tables
-- Adds columns needed by the /ai/confirm-* endpoints and creates sales_ledger.
-- Safe to run multiple times — all statements use ADD COLUMN IF NOT EXISTS
-- (SQLite 3.37+) or CREATE TABLE IF NOT EXISTS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. project_tasks — add AI confirm + audit columns
-- -----------------------------------------------------------------------------
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id);
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS related_client     VARCHAR(255);
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS tags               TEXT;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS notes              TEXT;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS ai_confirmed_at    DATETIME;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS ai_confirmed_by    INTEGER REFERENCES users(id);

-- -----------------------------------------------------------------------------
-- 2. handovers — add rich AI confirm + audit columns
-- -----------------------------------------------------------------------------
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS client_name              VARCHAR(255);
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS next_owner_name          VARCHAR(255);
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS next_owner_user_id       INTEGER REFERENCES users(id);
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS pending_actions_json     TEXT;
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS important_contacts_json  TEXT;
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS referenced_files_json    TEXT;
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS flagged_amount           REAL;
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS currency                 VARCHAR(8);
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS deadline                 VARCHAR(32);
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS risk_level               VARCHAR(16);
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS summary                  TEXT;
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS notes                    TEXT;
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS ai_confirmed_at          DATETIME;
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS ai_confirmed_by          INTEGER REFERENCES users(id);

-- -----------------------------------------------------------------------------
-- 3. sales_ledger — new table for financial transactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_ledger (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id          INTEGER NOT NULL REFERENCES companies(id),
    created_by_user_id  INTEGER NOT NULL REFERENCES users(id),
    transaction_type    VARCHAR(32) NOT NULL,          -- income, expense, invoice, payment
    counterparty_name   VARCHAR(255),
    item_name           VARCHAR(255),
    quantity            REAL,
    amount              REAL NOT NULL,
    currency            VARCHAR(8) DEFAULT 'SAR',
    transaction_date    VARCHAR(32),                   -- YYYY-MM-DD
    payment_status      VARCHAR(32) DEFAULT 'pending', -- pending, paid, overdue, cancelled
    category            VARCHAR(128),
    notes               TEXT,
    invoice_number      VARCHAR(128),
    ai_confirmed_at     DATETIME,
    ai_confirmed_by     INTEGER REFERENCES users(id),
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_ledger_company   ON sales_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_ledger_creator   ON sales_ledger(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_sales_ledger_type      ON sales_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_sales_ledger_status    ON sales_ledger(payment_status);

-- =============================================================================
-- To UNDO (rollback):
--   SQLite does NOT support DROP COLUMN directly before v3.35 (2021).
--   For environments >= SQLite 3.35:
--
--   ALTER TABLE project_tasks DROP COLUMN IF EXISTS created_by_user_id;
--   ALTER TABLE project_tasks DROP COLUMN IF EXISTS related_client;
--   ... etc.
--   DROP TABLE IF EXISTS sales_ledger;
--
--   For older SQLite, recreate the table without the new columns.
-- =============================================================================
