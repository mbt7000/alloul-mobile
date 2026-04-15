"""
Enhanced Projects Router
نظام إدارة المشاريع المحسّن
- Multi-tenant isolation
- Role-based access control
- Audit logging
- Archival instead of deletion
"""

from __future__ import annotations

from typing import Annotated, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from tenant import CurrentTenant
from query_filters import scope_query_by_company
from models import Project, CompanyMember
from service_utils import (
    log_activity, OperationAction, ResourceNotFoundError, AccessDeniedError,
    ValidationError, Role, can_perform_action, paginate, TimestampedResponse
)

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "active"  # active, archived


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ProjectArchive(BaseModel):
    archived: bool = True


class ProjectResponse(TimestampedResponse):
    id: int
    company_id: int
    name: str
    description: Optional[str] = None
    status: str
    owner_id: int
    member_count: int = 0

    class Config:
        from_attributes = True


def _get_member_role(db: Session, company_id: int, user_id: int) -> Optional[str]:
    """Get member's role in company."""
    member = db.query(CompanyMember).filter(
        CompanyMember.company_id == company_id,
        CompanyMember.user_id == user_id,
    ).first()
    return member.role if member else None


def _require_role(db: Session, tenant: CurrentTenant, required_role: str):
    """Verify user has required role."""
    user_role = _get_member_role(db, tenant.company_id, tenant.user.id)
    if not user_role:
        raise AccessDeniedError("Not a company member")
    if not can_perform_action(user_role, required_role):
        raise AccessDeniedError(f"Requires {required_role} role")


@router.get("", response_model=dict)
def list_projects(
    tenant: CurrentTenant,
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    archived: bool = False,
):
    """List projects for current company."""
    query = db.query(Project)
    query = scope_query_by_company(query, Project, tenant.company_id)
    query = query.filter(Project.status == ("archived" if archived else "active"))
    query = query.order_by(Project.created_at.desc())

    result = paginate(query, page, page_size)

    log_activity(
        db, tenant.company_id, tenant.user.id,
        OperationAction.READ, "Project", 0,
        f"Listed {len(result.items)} projects"
    )

    return result.dict()


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    body: ProjectCreate,
    tenant: CurrentTenant,
    db: Annotated[Session, Depends(get_db)],
):
    """Create a new project."""
    # Only admins and above can create projects
    _require_role(db, tenant, Role.ADMIN)

    if not body.name or len(body.name.strip()) == 0:
        raise ValidationError("Project name is required")

    project = Project(
        company_id=tenant.company_id,
        name=body.name,
        description=body.description,
        status=body.status,
        owner_id=tenant.user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    log_activity(
        db, tenant.company_id, tenant.user.id,
        OperationAction.CREATE, "Project", project.id,
        f"Created project: {project.name}"
    )

    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    tenant: CurrentTenant,
    db: Annotated[Session, Depends(get_db)],
):
    """Get a specific project."""
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project or project.company_id != tenant.company_id:
        raise ResourceNotFoundError("Project", project_id)

    log_activity(
        db, tenant.company_id, tenant.user.id,
        OperationAction.READ, "Project", project_id
    )

    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    body: ProjectUpdate,
    tenant: CurrentTenant,
    db: Annotated[Session, Depends(get_db)],
):
    """Update a project."""
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project or project.company_id != tenant.company_id:
        raise ResourceNotFoundError("Project", project_id)

    # Only owner or admins can update
    _require_role(db, tenant, Role.ADMIN)

    if body.name is not None:
        if not body.name.strip():
            raise ValidationError("Project name cannot be empty")
        project.name = body.name

    if body.description is not None:
        project.description = body.description

    db.commit()
    db.refresh(project)

    log_activity(
        db, tenant.company_id, tenant.user.id,
        OperationAction.UPDATE, "Project", project_id,
        f"Updated project: {project.name}"
    )

    return project


@router.post("/{project_id}/archive", response_model=ProjectResponse)
def archive_project(
    project_id: int,
    tenant: CurrentTenant,
    db: Annotated[Session, Depends(get_db)],
):
    """Archive a project (soft delete)."""
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project or project.company_id != tenant.company_id:
        raise ResourceNotFoundError("Project", project_id)

    _require_role(db, tenant, Role.ADMIN)

    project.status = "archived"
    db.commit()
    db.refresh(project)

    log_activity(
        db, tenant.company_id, tenant.user.id,
        OperationAction.ARCHIVE, "Project", project_id,
        f"Archived project: {project.name}"
    )

    return project
