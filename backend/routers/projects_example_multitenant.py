"""
Projects Router — Multi-Tenant Example
This is an example of how to implement proper multi-tenant isolation
in a new router. Existing routers should follow this pattern.
"""

from __future__ import annotations

from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from tenant import CurrentTenant
from query_filters import scope_query_by_company
from models import Project

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ProjectResponse(BaseModel):
    id: int
    company_id: int
    name: str
    description: str | None = None

    class Config:
        from_attributes = True


@router.get("", response_model=List[ProjectResponse])
def list_projects(
    tenant: CurrentTenant,
    db: Annotated[Session, Depends(get_db)],
):
    """List all projects for the current company."""
    query = db.query(Project)
    query = scope_query_by_company(query, Project, tenant.company_id)
    projects = query.all()
    return projects


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    body: ProjectCreate,
    tenant: CurrentTenant,
    db: Annotated[Session, Depends(get_db)],
):
    """Create a new project in the current company."""
    project = Project(
        company_id=tenant.company_id,
        name=body.name,
        description=body.description,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    tenant: CurrentTenant,
    db: Annotated[Session, Depends(get_db)],
):
    """Get a specific project (must belong to current company)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    # Verify scope: project must belong to current company
    if not project or project.company_id != tenant.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    body: ProjectUpdate,
    tenant: CurrentTenant,
    db: Annotated[Session, Depends(get_db)],
):
    """Update a project (must belong to current company)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project or project.company_id != tenant.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    if body.name is not None:
        project.name = body.name
    if body.description is not None:
        project.description = body.description
    
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    tenant: CurrentTenant,
    db: Annotated[Session, Depends(get_db)],
):
    """Delete a project (must belong to current company)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project or project.company_id != tenant.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    db.delete(project)
    db.commit()
