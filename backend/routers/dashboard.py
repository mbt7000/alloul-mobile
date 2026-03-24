from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import (
    User, Company, CompanyMember, Subscription,
    HandoverRecord, MemoryRecord, DealRecord, Post,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardStatsResponse(BaseModel):
    total_memory_items: int = 0
    total_handovers: int = 0
    pending_tasks: int = 0
    critical_risks: int = 0
    team_size: int = 0
    knowledge_health_score: int = 70
    handover_completion_rate: int = 0
    documentation_rate: int = 70
    team_stability_score: int = 80


class DashboardActivityItem(BaseModel):
    type: str
    title: str
    time: Optional[str] = None


@router.get("/stats", response_model=DashboardStatsResponse)
def dashboard_stats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    total_memory = db.query(MemoryRecord).filter(MemoryRecord.user_id == current_user.id).count()
    total_handovers = db.query(HandoverRecord).filter(HandoverRecord.user_id == current_user.id).count()
    pending = db.query(HandoverRecord).filter(
        HandoverRecord.user_id == current_user.id, HandoverRecord.status == "pending"
    ).count()
    critical = db.query(MemoryRecord).filter(
        MemoryRecord.user_id == current_user.id, MemoryRecord.importance == "critical"
    ).count()

    team_size = 0
    member = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if member:
        team_size = db.query(CompanyMember).filter(CompanyMember.company_id == member.company_id).count()

    completed = db.query(HandoverRecord).filter(
        HandoverRecord.user_id == current_user.id, HandoverRecord.status == "completed"
    ).count()
    rate = int((completed / total_handovers * 100)) if total_handovers > 0 else 0

    return DashboardStatsResponse(
        total_memory_items=total_memory,
        total_handovers=total_handovers,
        pending_tasks=pending,
        critical_risks=critical,
        team_size=team_size,
        knowledge_health_score=min(100, 50 + total_memory * 2),
        handover_completion_rate=rate,
        documentation_rate=min(100, 50 + total_memory),
        team_stability_score=80,
    )


@router.get("/activity", response_model=list[DashboardActivityItem])
def dashboard_activity(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(20, ge=1, le=100),
):
    items: list[DashboardActivityItem] = []

    recent_posts = db.query(Post).filter(Post.user_id == current_user.id).order_by(
        Post.created_at.desc()
    ).limit(5).all()
    for p in recent_posts:
        items.append(DashboardActivityItem(
            type="post",
            title=p.content[:80] if p.content else "New post",
            time=p.created_at.isoformat() if p.created_at else None,
        ))

    recent_handovers = db.query(HandoverRecord).filter(
        HandoverRecord.user_id == current_user.id
    ).order_by(HandoverRecord.created_at.desc()).limit(5).all()
    for h in recent_handovers:
        items.append(DashboardActivityItem(
            type="handover",
            title=h.title,
            time=h.created_at.isoformat() if h.created_at else None,
        ))

    recent_memories = db.query(MemoryRecord).filter(
        MemoryRecord.user_id == current_user.id
    ).order_by(MemoryRecord.created_at.desc()).limit(5).all()
    for m in recent_memories:
        items.append(DashboardActivityItem(
            type="memory",
            title=m.title,
            time=m.created_at.isoformat() if m.created_at else None,
        ))

    items.sort(key=lambda x: x.time or "", reverse=True)
    return items[:limit]
