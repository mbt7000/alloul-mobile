from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import User, Project, ProjectTask, CompanyMember, CompanyOnboarding
from plan_limits import check_limit
from admin_access import user_is_admin

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    company_id: Optional[int] = None
    due_date: Optional[str] = None
    status: Optional[str] = "planning"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    due_date: Optional[str] = None
    priority: Optional[str] = "medium"  # high, medium, low


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[int] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None


class TaskResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    assignee_name: Optional[str] = None
    status: str
    due_date: Optional[str] = None
    priority: str = "medium"
    created_at: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    user_id: int
    company_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    status: str
    due_date: Optional[str] = None
    tasks_count: int = 0
    completed_count: int = 0
    created_at: Optional[str] = None


def _project_response(p: Project, db: Session) -> ProjectResponse:
    total = db.query(ProjectTask).filter(ProjectTask.project_id == p.id).count()
    done = db.query(ProjectTask).filter(
        ProjectTask.project_id == p.id, ProjectTask.status == "done"
    ).count()
    return ProjectResponse(
        id=p.id,
        user_id=p.user_id,
        company_id=p.company_id,
        name=p.name,
        description=p.description,
        status=p.status,
        due_date=getattr(p, "due_date", None),
        tasks_count=total,
        completed_count=done,
        created_at=p.created_at.isoformat() if p.created_at else None,
    )


def _task_response(t: ProjectTask) -> TaskResponse:
    return TaskResponse(
        id=t.id,
        project_id=t.project_id,
        title=t.title,
        description=t.description,
        assignee_id=t.assignee_id,
        assignee_name=t.assignee.name if t.assignee else None,
        status=t.status,
        due_date=t.due_date,
        priority=getattr(t, "priority", None) or "medium",
        created_at=t.created_at.isoformat() if t.created_at else None,
    )


@router.get("/", response_model=list[ProjectResponse])
def list_projects(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    company_id: Optional[int] = Query(None, description="Filter by company (returns company projects the user can see)"),
):
    q = db.query(Project)
    if company_id is not None:
        # Return all projects for the company (any member can view)
        q = q.filter(Project.company_id == company_id)
    else:
        # Default: personal projects owned by the user
        q = q.filter(Project.user_id == current_user.id)
    projects = q.order_by(Project.created_at.desc()).all()
    return [_project_response(p, db) for p in projects]


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    body: ProjectCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    # Auto-attach to user's company if no company_id given and user is a member
    company_id = body.company_id
    if company_id is None:
        mem = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
        if mem:
            company_id = mem.company_id

    # Plan limit: max projects
    if company_id:
        current_count = db.query(Project).filter(Project.company_id == company_id).count()
        check_limit(db, company_id, "max_projects", current_count, is_admin=user_is_admin(current_user))

    project = Project(
        user_id=current_user.id,
        name=body.name.strip(),
        description=body.description,
        company_id=company_id,
        due_date=body.due_date,
        status=body.status or "planning",
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    # Tick onboarding step_project if company linked
    if company_id:
        ob = db.query(CompanyOnboarding).filter(CompanyOnboarding.company_id == company_id).first()
        if ob and not ob.step_project:
            ob.step_project = 1
            if ob.step_profile and ob.step_team and ob.step_invite and ob.step_project:
                ob.completed = 1
            db.commit()
    return _project_response(project, db)


@router.get("/all-tasks", response_model=list[TaskResponse])
def list_all_company_tasks_alias(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    company_id: Optional[int] = Query(None),
):
    """Alias placed before /{project_id} to avoid routing ambiguity."""
    if company_id is None:
        mem = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
        if mem:
            company_id = mem.company_id
    if company_id is None:
        return []
    project_ids = [p.id for p in db.query(Project.id).filter(Project.company_id == company_id).all()]
    if not project_ids:
        return []
    tasks = (
        db.query(ProjectTask)
        .filter(ProjectTask.project_id.in_(project_ids))
        .order_by(ProjectTask.created_at.desc())
        .all()
    )
    return [_task_response(t) for t in tasks]


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _project_response(project, db)


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    body: ProjectUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if body.name is not None:
        project.name = body.name
    if body.description is not None:
        project.description = body.description
    if body.status is not None:
        project.status = body.status
    if body.due_date is not None:
        project.due_date = body.due_date
    db.commit()
    db.refresh(project)
    return _project_response(project, db)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()


# ─── Tasks ───────────────────────────────────────────────────────────────────

@router.get("/{project_id}/tasks", response_model=list[TaskResponse])
def list_tasks(
    project_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    tasks = (
        db.query(ProjectTask)
        .filter(ProjectTask.project_id == project_id)
        .order_by(ProjectTask.created_at.desc())
        .all()
    )
    return [_task_response(t) for t in tasks]


@router.post("/{project_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: int,
    body: TaskCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Plan limit: max tasks (company-wide)
    if project.company_id:
        task_count = (
            db.query(ProjectTask)
            .join(Project, ProjectTask.project_id == Project.id)
            .filter(Project.company_id == project.company_id)
            .count()
        )
        check_limit(db, project.company_id, "max_tasks", task_count, is_admin=user_is_admin(current_user))

    task = ProjectTask(
        project_id=project_id,
        title=body.title.strip(),
        description=body.description,
        assignee_id=body.assignee_id,
        due_date=body.due_date,
        priority=body.priority or "medium",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_response(task)


@router.patch("/{project_id}/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    project_id: int,
    task_id: int,
    body: TaskUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    task = db.query(ProjectTask).filter(
        ProjectTask.id == task_id, ProjectTask.project_id == project_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if body.title is not None:
        task.title = body.title
    if body.status is not None:
        task.status = body.status
    if body.assignee_id is not None:
        task.assignee_id = body.assignee_id
    if body.due_date is not None:
        task.due_date = body.due_date
    if body.priority is not None:
        task.priority = body.priority
    db.commit()
    db.refresh(task)
    return _task_response(task)


@router.delete("/{project_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    project_id: int,
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    task = db.query(ProjectTask).filter(
        ProjectTask.id == task_id, ProjectTask.project_id == project_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=403, detail="Not your project")
    db.delete(task)
    db.commit()
