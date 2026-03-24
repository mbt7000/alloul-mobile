from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import User, MemoryRecord

router = APIRouter(prefix="/memory", tags=["memory"])


class MemoryCreate(BaseModel):
    type: Optional[str] = "task"
    title: str
    description: Optional[str] = None
    project: Optional[str] = None
    department: Optional[str] = None
    tags: Optional[str] = None
    importance: Optional[str] = "medium"


class MemoryResponse(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    description: Optional[str] = None
    project: Optional[str] = None
    department: Optional[str] = None
    tags: list[str] = []
    importance: str
    owner: Optional[str] = None
    date: Optional[str] = None
    linkedItems: list[str] = []
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


def _to_response(m: MemoryRecord, owner_name: Optional[str] = None) -> MemoryResponse:
    tags_list = [t.strip() for t in (m.tags or "").split(",") if t.strip()]
    return MemoryResponse(
        id=m.id,
        user_id=m.user_id,
        type=m.type or "task",
        title=m.title,
        description=m.description,
        project=m.project,
        department=m.department,
        tags=tags_list,
        importance=m.importance or "medium",
        owner=owner_name,
        date=m.created_at.isoformat() if m.created_at else None,
        linkedItems=[],
        created_at=m.created_at.isoformat() if m.created_at else None,
    )


@router.get("/", response_model=list[MemoryResponse])
def list_memories(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    project: Optional[str] = None,
):
    q = db.query(MemoryRecord).filter(MemoryRecord.user_id == current_user.id)
    if project:
        q = q.filter(MemoryRecord.project == project)
    items = q.order_by(MemoryRecord.created_at.desc()).all()
    return [_to_response(m, current_user.name) for m in items]


@router.post("/", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
def create_memory(
    body: MemoryCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    m = MemoryRecord(
        user_id=current_user.id,
        type=body.type or "task",
        title=body.title,
        description=body.description,
        project=body.project,
        department=body.department,
        tags=body.tags,
        importance=body.importance or "medium",
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return _to_response(m, current_user.name)


@router.get("/{memory_id}", response_model=MemoryResponse)
def get_memory(
    memory_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    m = db.query(MemoryRecord).filter(
        MemoryRecord.id == memory_id, MemoryRecord.user_id == current_user.id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Memory item not found")
    return _to_response(m, current_user.name)


@router.patch("/{memory_id}", response_model=MemoryResponse)
def update_memory(
    memory_id: int,
    body: MemoryCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    m = db.query(MemoryRecord).filter(
        MemoryRecord.id == memory_id, MemoryRecord.user_id == current_user.id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Memory item not found")
    if body.title:
        m.title = body.title
    if body.description is not None:
        m.description = body.description
    if body.type:
        m.type = body.type
    if body.project is not None:
        m.project = body.project
    if body.tags is not None:
        m.tags = body.tags
    if body.importance:
        m.importance = body.importance
    db.commit()
    db.refresh(m)
    return _to_response(m, current_user.name)


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_memory(
    memory_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    m = db.query(MemoryRecord).filter(
        MemoryRecord.id == memory_id, MemoryRecord.user_id == current_user.id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Memory item not found")
    db.delete(m)
    db.commit()
