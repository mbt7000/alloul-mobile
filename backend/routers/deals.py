from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import User, DealRecord

router = APIRouter(prefix="/deals", tags=["deals"])


class DealCreate(BaseModel):
    company: str
    value: int = 0
    stage: str = "lead"
    probability: int = 0
    contact: Optional[str] = None
    notes: Optional[str] = None


class DealResponse(BaseModel):
    id: int
    user_id: int
    company: str
    value: int
    stage: str
    probability: int
    contact: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


def _to_response(d: DealRecord) -> DealResponse:
    return DealResponse(
        id=d.id,
        user_id=d.user_id,
        company=d.company,
        value=d.value or 0,
        stage=d.stage or "lead",
        probability=d.probability or 0,
        contact=d.contact,
        notes=d.notes,
        created_at=d.created_at.isoformat() if d.created_at else None,
    )


@router.get("/", response_model=list[DealResponse])
def list_deals(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    stage: Optional[str] = None,
):
    q = db.query(DealRecord).filter(DealRecord.user_id == current_user.id)
    if stage:
        q = q.filter(DealRecord.stage == stage)
    items = q.order_by(DealRecord.created_at.desc()).all()
    return [_to_response(d) for d in items]


@router.post("/", response_model=DealResponse, status_code=status.HTTP_201_CREATED)
def create_deal(
    body: DealCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    d = DealRecord(
        user_id=current_user.id,
        company=body.company,
        value=body.value,
        stage=body.stage,
        probability=body.probability,
        contact=body.contact,
        notes=body.notes,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return _to_response(d)


@router.get("/{deal_id}", response_model=DealResponse)
def get_deal(
    deal_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    d = db.query(DealRecord).filter(
        DealRecord.id == deal_id, DealRecord.user_id == current_user.id
    ).first()
    if not d:
        raise HTTPException(status_code=404, detail="Deal not found")
    return _to_response(d)


@router.patch("/{deal_id}", response_model=DealResponse)
def update_deal(
    deal_id: int,
    body: DealCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    d = db.query(DealRecord).filter(
        DealRecord.id == deal_id, DealRecord.user_id == current_user.id
    ).first()
    if not d:
        raise HTTPException(status_code=404, detail="Deal not found")
    if body.company:
        d.company = body.company
    if body.stage:
        d.stage = body.stage
    if body.value is not None:
        d.value = body.value
    if body.probability is not None:
        d.probability = body.probability
    if body.contact is not None:
        d.contact = body.contact
    if body.notes is not None:
        d.notes = body.notes
    db.commit()
    db.refresh(d)
    return _to_response(d)


@router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deal(
    deal_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    d = db.query(DealRecord).filter(
        DealRecord.id == deal_id, DealRecord.user_id == current_user.id
    ).first()
    if not d:
        raise HTTPException(status_code=404, detail="Deal not found")
    db.delete(d)
    db.commit()
