"""
Multi-Tenant Isolation
إدارة عزل البيانات بين الشركات المختلفة
"""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from database import get_db
from models import User, CompanyMember, Company
from auth import get_current_user


class TenantContext:
    """Current tenant/company context for the request."""
    
    def __init__(self, user: User, company_id: int):
        self.user = user
        self.company_id = company_id
    
    def __repr__(self):
        return f"<TenantContext user={self.user.id} company={self.company_id}>"


def get_current_company_id(
    x_company_id: Annotated[Optional[str], Header()] = None,
) -> int:
    """Extract company_id from request header (X-Company-Id)."""
    if not x_company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Company-Id header required for tenant isolation",
        )
    try:
        return int(x_company_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Company-Id must be a valid integer",
        )


def get_tenant_context(
    current_user: Annotated[User, Depends(get_current_user)],
    company_id: Annotated[int, Depends(get_current_company_id)],
    db: Annotated[Session, Depends(get_db)],
) -> TenantContext:
    """
    Verify that user is a member of the company and return tenant context.
    This is the primary access control point for multi-tenant isolation.
    """
    # Check if user is a member of this company
    member = db.query(CompanyMember).filter(
        CompanyMember.user_id == current_user.id,
        CompanyMember.company_id == company_id,
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this company",
        )
    
    # Verify company exists
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )
    
    return TenantContext(user=current_user, company_id=company_id)


# Convenience type for FastAPI dependency injection
CurrentTenant = Annotated[TenantContext, Depends(get_tenant_context)]
