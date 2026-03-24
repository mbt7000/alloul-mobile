from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from sqlalchemy import or_

from auth import get_current_user
from database import get_db
from models import User, MemoryRecord, Post, Company, DealRecord, HandoverRecord, Community

router = APIRouter(prefix="/search", tags=["search"])


class SearchResultItem(BaseModel):
    type: str
    id: str
    title: str
    description: str = ""
    avatar_url: Optional[str] = None
    relevance_score: float = 1.0


@router.get("", response_model=list[SearchResultItem])
def unified_search(
    q: str = Query(..., min_length=1),
    db: Annotated[Session, Depends(get_db)] = None,
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    results: list[SearchResultItem] = []
    term = f"%{q}%"

    users = db.query(User).filter(
        or_(
            User.name.ilike(term),
            User.username.ilike(term),
            User.i_code == q,
        )
    ).limit(10).all()
    for u in users:
        results.append(SearchResultItem(
            type="user", id=str(u.id), title=u.name or u.username,
            description=f"@{u.username}" + (f" · {u.i_code}" if u.i_code else ""),
            avatar_url=u.avatar_url,
            relevance_score=0.95,
        ))

    memories = db.query(MemoryRecord).filter(
        MemoryRecord.user_id == current_user.id,
        MemoryRecord.title.ilike(term),
    ).limit(10).all()
    for m in memories:
        results.append(SearchResultItem(
            type="memory", id=str(m.id), title=m.title,
            description=m.description or "", relevance_score=0.9,
        ))

    posts = db.query(Post).filter(Post.content.ilike(term)).limit(10).all()
    for p in posts:
        results.append(SearchResultItem(
            type="post", id=str(p.id), title=p.content[:100],
            description=f"by {p.author.name or p.author.username}" if p.author else "",
            relevance_score=0.8,
        ))

    companies = db.query(Company).filter(Company.name.ilike(term)).limit(10).all()
    for c in companies:
        results.append(SearchResultItem(
            type="company", id=str(c.id), title=c.name,
            description=c.description or "", relevance_score=0.85,
        ))

    communities = db.query(Community).filter(Community.name.ilike(term)).limit(10).all()
    for cm in communities:
        results.append(SearchResultItem(
            type="community", id=str(cm.id), title=cm.name,
            description=cm.description or "", avatar_url=cm.avatar_url,
            relevance_score=0.83,
        ))

    deals = db.query(DealRecord).filter(
        DealRecord.user_id == current_user.id,
        DealRecord.company.ilike(term),
    ).limit(10).all()
    for d in deals:
        results.append(SearchResultItem(
            type="deal", id=str(d.id), title=d.company,
            description=d.notes or "", relevance_score=0.75,
        ))

    handovers = db.query(HandoverRecord).filter(
        HandoverRecord.user_id == current_user.id,
        HandoverRecord.title.ilike(term),
    ).limit(10).all()
    for h in handovers:
        results.append(SearchResultItem(
            type="handover", id=str(h.id), title=h.title,
            description=h.content or "", relevance_score=0.8,
        ))

    results.sort(key=lambda x: x.relevance_score, reverse=True)
    return results[:30]
