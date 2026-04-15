"""
Multi-Tenant Query Filters
تطبيق عزل البيانات على مستوى الاستعلام
"""

from __future__ import annotations

from sqlalchemy.orm import Session, Query
from sqlalchemy import and_

from models import (
    Project, Task, Meeting, Channel, Message, Handover, Department,
    Team, Workflow, Template, Document, ActivityLog,
)

# Map table classes to their company_id filtering logic
TENANT_AWARE_MODELS = {
    Project: lambda q, cid: q.filter(Project.company_id == cid),
    Task: lambda q, cid: q.filter(Task.company_id == cid),
    Meeting: lambda q, cid: q.filter(Meeting.company_id == cid),
    Channel: lambda q, cid: q.filter(Channel.company_id == cid),
    Message: lambda q, cid: q.filter(Message.company_id == cid),
    Handover: lambda q, cid: q.filter(Handover.company_id == cid),
    Department: lambda q, cid: q.filter(Department.company_id == cid),
    Team: lambda q, cid: q.filter(Team.company_id == cid),
    Workflow: lambda q, cid: q.filter(Workflow.company_id == cid),
    Template: lambda q, cid: q.filter(Template.company_id == cid),
    Document: lambda q, cid: q.filter(Document.company_id == cid),
    ActivityLog: lambda q, cid: q.filter(ActivityLog.company_id == cid),
}


def scope_query_by_company(
    query: Query,
    model_class,
    company_id: int,
) -> Query:
    """
    Scope a query to a specific company.
    
    Usage:
        query = db.query(Project)
        query = scope_query_by_company(query, Project, tenant.company_id)
        projects = query.all()
    """
    if model_class in TENANT_AWARE_MODELS:
        filter_func = TENANT_AWARE_MODELS[model_class]
        return filter_func(query, company_id)
    
    # If model is not in our list, return unmodified (user responsibility to ensure safety)
    return query


def ensure_company_scope(obj, company_id: int) -> bool:
    """
    Verify that an object belongs to the specified company.
    Raises exception if scope is violated.
    """
    if hasattr(obj, "company_id"):
        if obj.company_id != company_id:
            raise ValueError(
                f"Object belongs to company {obj.company_id}, not {company_id}"
            )
    return True
