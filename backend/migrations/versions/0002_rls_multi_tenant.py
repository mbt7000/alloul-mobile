"""Add Row-Level Security for multi-tenant isolation

Revision ID: 0002_rls_multi_tenant
Revises: 0001_baseline
Create Date: 2026-04-15

This migration enables Row-Level Security (RLS) on tables that need
multi-tenant isolation. All rows in these tables must be filtered by
company_id to ensure proper data isolation between tenants.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002_rls_multi_tenant"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tables that need RLS policies (have company_id column)
RLS_TABLES = [
    "projects",
    "tasks",
    "meetings",
    "channels",
    "messages",
    "handovers",
    "departments",
    "teams",
    "workflows",
    "templates",
    "documents",
    "knowledge_base_articles",
    "crm_deals",
    "job_postings",
    "candidates",
    "activity_logs",
]

def upgrade() -> None:
    # This migration assumes PostgreSQL is being used for production
    # For SQLite (development), RLS is not supported, so these operations are no-ops
    
    connection = op.get_bind()
    
    # Check if this is PostgreSQL (RLS is PG-only)
    if "postgresql" not in str(connection.engine.url):
        # SQLite doesn't support RLS; this is a development setup
        print("Skipping RLS setup (not PostgreSQL)")
        return
    
    # Enable RLS on company_members table
    try:
        connection.execute(sa.text("ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;"))
    except Exception as e:
        print(f"Could not enable RLS on company_members: {e}")
    
    # For each table with company_id, enable RLS and create policies
    for table_name in RLS_TABLES:
        try:
            # Check if table exists
            result = connection.execute(sa.text(
                f"SELECT to_regclass('{table_name}');"
            )).scalar()
            
            if result is None:
                continue  # Table doesn't exist yet
            
            # Enable RLS
            connection.execute(sa.text(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;"))
            
            # Create policy: users can only see rows for their company
            policy_name = f"rls_{table_name}_company_isolation"
            connection.execute(sa.text(f"""
                CREATE POLICY IF NOT EXISTS {policy_name}
                ON {table_name}
                FOR ALL
                USING (
                    company_id IN (
                        SELECT company_id 
                        FROM company_members 
                        WHERE user_id = current_user_id()
                    )
                );
            """))
            
        except Exception as e:
            print(f"Could not setup RLS for {table_name}: {e}")


def downgrade() -> None:
    # Note: In production, disabling RLS should be done carefully
    # For now, we'll just remove policies but leave RLS enabled
    connection = op.get_bind()
    
    if "postgresql" not in str(connection.engine.url):
        return
    
    for table_name in RLS_TABLES:
        try:
            policy_name = f"rls_{table_name}_company_isolation"
            connection.execute(sa.text(f"""
                DROP POLICY IF EXISTS {policy_name} ON {table_name};
            """))
        except Exception as e:
            print(f"Could not drop policy for {table_name}: {e}")
