from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import User, MemoryRecord, CompanyMember, HandoverRecord

router = APIRouter(prefix="/memory", tags=["memory"])

KNOWLEDGE_TYPES = ("process", "policy", "person", "project", "tool", "task", "other")


class MemoryCreate(BaseModel):
    type: Optional[str] = "other"
    title: str
    description: Optional[str] = None
    project: Optional[str] = None
    department: Optional[str] = None
    tags: Optional[str] = None
    importance: Optional[str] = "medium"


class MemoryResponse(BaseModel):
    id: int
    user_id: int
    company_id: Optional[int] = None
    type: str
    title: str
    description: Optional[str] = None
    project: Optional[str] = None
    department: Optional[str] = None
    tags: list[str] = []
    importance: str
    owner: Optional[str] = None
    date: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


def _to_response(m: MemoryRecord, owner_name: Optional[str] = None) -> MemoryResponse:
    tags_list = [t.strip() for t in (m.tags or "").split(",") if t.strip()]
    return MemoryResponse(
        id=m.id,
        user_id=m.user_id,
        company_id=m.company_id,
        type=m.type or "other",
        title=m.title,
        description=m.description,
        project=m.project,
        department=m.department,
        tags=tags_list,
        importance=m.importance or "medium",
        owner=owner_name,
        date=m.created_at.isoformat() if m.created_at else None,
        created_at=m.created_at.isoformat() if m.created_at else None,
    )


def _company_id(db: Session, user_id: int) -> Optional[int]:
    mem = db.query(CompanyMember).filter(CompanyMember.user_id == user_id).first()
    return mem.company_id if mem else None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[MemoryResponse])
def list_memories(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    type: Optional[str] = Query(None),
    project: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    company: bool = Query(False, description="Include all company members' knowledge"),
):
    company_id = _company_id(db, current_user.id)

    if company and company_id:
        # Return all knowledge visible to this company
        query = db.query(MemoryRecord).filter(MemoryRecord.company_id == company_id)
    else:
        query = db.query(MemoryRecord).filter(MemoryRecord.user_id == current_user.id)

    if type:
        query = query.filter(MemoryRecord.type == type)
    if project:
        query = query.filter(MemoryRecord.project == project)
    if q:
        like = f"%{q}%"
        query = query.filter(
            MemoryRecord.title.ilike(like) | MemoryRecord.description.ilike(like) | MemoryRecord.tags.ilike(like)
        )

    items = query.order_by(MemoryRecord.created_at.desc()).limit(100).all()

    # Attach owner names
    user_ids = list({m.user_id for m in items})
    from models import User as UserModel
    users = {u.id: (u.name or u.username) for u in db.query(UserModel).filter(UserModel.id.in_(user_ids)).all()}

    return [_to_response(m, users.get(m.user_id)) for m in items]


@router.post("/", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
def create_memory(
    body: MemoryCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company_id = _company_id(db, current_user.id)
    m = MemoryRecord(
        user_id=current_user.id,
        company_id=company_id,
        type=body.type or "other",
        title=body.title.strip(),
        description=body.description,
        project=body.project,
        department=body.department,
        tags=body.tags,
        importance=body.importance or "medium",
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return _to_response(m, current_user.name or current_user.username)


@router.post("/import-handovers", status_code=status.HTTP_200_OK)
def import_from_handovers(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Auto-create knowledge base entries from the user's handover records.
    Skips entries already imported (de-duplicates by title).
    """
    company_id = _company_id(db, current_user.id)
    handovers = db.query(HandoverRecord).filter(HandoverRecord.user_id == current_user.id).all()

    existing_titles = {
        m.title for m in db.query(MemoryRecord.title).filter(
            MemoryRecord.user_id == current_user.id
        ).all()
    }

    created = 0
    for h in handovers:
        title = f"تسليم: {h.title}"
        if title in existing_titles:
            continue

        # Determine type from handover data
        kb_type = "process"
        tags_parts = []
        if h.department:
            tags_parts.append(h.department)
        if h.from_person:
            tags_parts.append(h.from_person)
        if h.to_person:
            tags_parts.append(h.to_person)

        importance = "high" if (h.score or 0) >= 80 else "medium" if (h.score or 0) >= 50 else "low"

        m = MemoryRecord(
            user_id=current_user.id,
            company_id=company_id,
            type=kb_type,
            title=title,
            description=h.content or f"تسليم من {h.from_person or '—'} إلى {h.to_person or '—'}",
            department=h.department,
            tags=", ".join(tags_parts) if tags_parts else None,
            importance=importance,
        )
        db.add(m)
        existing_titles.add(title)
        created += 1

    db.commit()
    return {"imported": created, "total_handovers": len(handovers)}


@router.get("/stats")
def knowledge_stats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Return counts by type for the current company."""
    company_id = _company_id(db, current_user.id)
    q = db.query(MemoryRecord)
    if company_id:
        q = q.filter(MemoryRecord.company_id == company_id)
    else:
        q = q.filter(MemoryRecord.user_id == current_user.id)

    items = q.all()
    counts: dict[str, int] = {}
    for item in items:
        t = item.type or "other"
        counts[t] = counts.get(t, 0) + 1

    return {
        "total": len(items),
        "by_type": counts,
        "high_importance": sum(1 for i in items if i.importance == "high"),
    }


@router.get("/{memory_id}", response_model=MemoryResponse)
def get_memory(
    memory_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company_id = _company_id(db, current_user.id)
    q = db.query(MemoryRecord).filter(MemoryRecord.id == memory_id)
    if company_id:
        q = q.filter(MemoryRecord.company_id == company_id)
    else:
        q = q.filter(MemoryRecord.user_id == current_user.id)
    m = q.first()
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
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
        raise HTTPException(status_code=404, detail="Not found")
    if body.title:
        m.title = body.title
    if body.description is not None:
        m.description = body.description
    if body.type:
        m.type = body.type
    if body.project is not None:
        m.project = body.project
    if body.department is not None:
        m.department = body.department
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
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(m)
    db.commit()
