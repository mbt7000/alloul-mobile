"""
ProjectService — business logic for projects and tasks.
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from models import Project, ProjectTask, CompanyMember


class ProjectService:

    @staticmethod
    def get_company_projects(db: Session, company_id: int) -> list[Project]:
        return (
            db.query(Project)
            .filter(Project.company_id == company_id)
            .order_by(Project.created_at.desc())
            .all()
        )

    @staticmethod
    def get_user_projects(db: Session, user_id: int) -> list[Project]:
        return (
            db.query(Project)
            .filter(Project.user_id == user_id)
            .order_by(Project.created_at.desc())
            .all()
        )

    @staticmethod
    def task_counts(db: Session, project_id: int) -> tuple[int, int]:
        """Returns (total_tasks, completed_tasks) for a project."""
        total = db.query(ProjectTask).filter(ProjectTask.project_id == project_id).count()
        done = db.query(ProjectTask).filter(
            ProjectTask.project_id == project_id, ProjectTask.status == "done"
        ).count()
        return total, done

    @staticmethod
    def get_pending_task_count(db: Session, company_id: int) -> int:
        """Count pending/todo tasks across all company projects."""
        project_ids = [
            p.id for p in db.query(Project).filter(Project.company_id == company_id).all()
        ]
        if not project_ids:
            return 0
        return (
            db.query(ProjectTask)
            .filter(
                ProjectTask.project_id.in_(project_ids),
                ProjectTask.status.in_(["todo", "in_progress"]),
            )
            .count()
        )
