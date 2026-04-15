"""
Service Utilities — Common patterns for all services
خدمات الأدوات المشتركة
"""

from __future__ import annotations

from enum import Enum
from typing import Optional, Generic, TypeVar
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models import ActivityLog


class OperationAction(str, Enum):
    """Activity log action types."""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    ARCHIVE = "archive"
    SHARE = "share"
    INVITE = "invite"
    ACCEPT = "accept"
    REJECT = "reject"


def log_activity(
    db: Session,
    company_id: int,
    user_id: int,
    action: OperationAction,
    resource_type: str,
    resource_id: int,
    details: Optional[str] = None,
):
    """Log an activity for audit trail."""
    log = ActivityLog(
        company_id=company_id,
        user_id=user_id,
        action=f"{resource_type}:{action.value}",
        details=details or f"{action.value} {resource_type} #{resource_id}",
    )
    db.add(log)
    try:
        db.commit()
    except Exception:
        db.rollback()


class ResourceNotFoundError(HTTPException):
    """Resource not found error."""
    def __init__(self, resource_type: str, resource_id):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource_type} #{resource_id} not found",
        )


class AccessDeniedError(HTTPException):
    """Access denied error."""
    def __init__(self, reason: str = "Access denied"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=reason,
        )


class ValidationError(HTTPException):
    """Validation error."""
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=message,
        )


class Role(str, Enum):
    """Company member roles."""
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    MEMBER = "member"
    GUEST = "guest"


ROLE_HIERARCHY = {
    Role.OWNER: 5,
    Role.ADMIN: 4,
    Role.MANAGER: 3,
    Role.MEMBER: 2,
    Role.GUEST: 1,
}


def can_perform_action(user_role: str, required_role: str) -> bool:
    """Check if user role can perform action requiring minimum role."""
    user_level = ROLE_HIERARCHY.get(user_role, 0)
    required_level = ROLE_HIERARCHY.get(required_role, 0)
    return user_level >= required_level


class TimestampedResponse(BaseModel):
    """Base response with timestamps."""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper."""
    items: list[T]
    total: int
    page: int
    page_size: int
    has_more: bool

    @property
    def total_pages(self) -> int:
        return (self.total + self.page_size - 1) // self.page_size


def paginate(
    query,
    page: int = 1,
    page_size: int = 20,
):
    """Apply pagination to a query."""
    if page < 1:
        raise ValidationError("Page must be >= 1")
    if page_size < 1 or page_size > 100:
        raise ValidationError("Page size must be between 1 and 100")

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )
