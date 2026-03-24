from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import User, Company

router = APIRouter(prefix="/marketplace", tags=["marketplace"])


class MarketplaceCompanyResponse(BaseModel):
    id: str
    name: str
    industry: Optional[str] = None
    size: Optional[str] = None
    location: Optional[str] = None
    knowledgeScore: int = 70
    handoverScore: int = 70
    documentationRate: int = 70
    stabilityScore: int = 70
    verified: bool = False
    description: Optional[str] = None
    tags: list[str] = []

    class Config:
        from_attributes = True


def _company_to_marketplace(c: Company) -> MarketplaceCompanyResponse:
    tags = []
    if c.company_type:
        tags.append(c.company_type)
    if c.industry:
        tags.append(c.industry)
    return MarketplaceCompanyResponse(
        id=str(c.id),
        name=c.name,
        industry=c.industry or c.company_type or "Technology",
        size=c.size or "1-10",
        location=c.location or "Global",
        knowledgeScore=c.knowledge_score or 70,
        handoverScore=c.handover_score or 70,
        documentationRate=c.documentation_rate or 70,
        stabilityScore=c.stability_score or 70,
        verified=bool(c.verified),
        description=c.description,
        tags=tags,
    )


@router.get("/", response_model=list[MarketplaceCompanyResponse])
def list_marketplace(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    search: Optional[str] = None,
):
    q = db.query(Company)
    if search:
        q = q.filter(Company.name.ilike(f"%{search}%"))
    companies = q.order_by(Company.created_at.desc()).limit(50).all()
    return [_company_to_marketplace(c) for c in companies]


@router.get("/{company_id}", response_model=MarketplaceCompanyResponse)
def get_marketplace_company(
    company_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    c = db.query(Company).filter(Company.id == company_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Company not found")
    return _company_to_marketplace(c)
