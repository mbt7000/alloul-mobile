from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import User, Community, CommunityMember, CommunityPost, Post

router = APIRouter(prefix="/communities", tags=["communities"])


class CommunityCreate(BaseModel):
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None


class CommunityResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    creator_id: int
    creator_name: Optional[str] = None
    members_count: int = 0
    is_member: bool = False
    created_at: Optional[str] = None


class CommunityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None


def _community_response(c: Community, current_user_id: int, db: Session) -> CommunityResponse:
    is_member = db.query(CommunityMember).filter(
        CommunityMember.community_id == c.id,
        CommunityMember.user_id == current_user_id,
    ).first() is not None
    return CommunityResponse(
        id=c.id,
        name=c.name,
        description=c.description,
        avatar_url=c.avatar_url,
        cover_url=c.cover_url,
        creator_id=c.creator_id,
        creator_name=c.creator.name if c.creator else None,
        members_count=c.members_count or 0,
        is_member=is_member,
        created_at=c.created_at.isoformat() if c.created_at else None,
    )


@router.get("/", response_model=list[CommunityResponse])
def list_communities(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    communities = (
        db.query(Community)
        .order_by(Community.members_count.desc())
        .offset(offset).limit(limit)
        .all()
    )
    return [_community_response(c, current_user.id, db) for c in communities]


@router.post("/", response_model=CommunityResponse, status_code=status.HTTP_201_CREATED)
def create_community(
    body: CommunityCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    if not body.name or not body.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    community = Community(
        name=body.name.strip(),
        description=body.description,
        avatar_url=body.avatar_url,
        cover_url=body.cover_url,
        creator_id=current_user.id,
        members_count=1,
    )
    db.add(community)
    db.commit()
    db.refresh(community)
    db.add(CommunityMember(
        community_id=community.id,
        user_id=current_user.id,
        role="admin",
    ))
    db.commit()
    return _community_response(community, current_user.id, db)


@router.get("/{community_id}", response_model=CommunityResponse)
def get_community(
    community_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    return _community_response(community, current_user.id, db)


@router.patch("/{community_id}", response_model=CommunityResponse)
def update_community(
    community_id: int,
    body: CommunityUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    if community.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can update")
    if body.name is not None:
        community.name = body.name
    if body.description is not None:
        community.description = body.description
    if body.avatar_url is not None:
        community.avatar_url = body.avatar_url
    if body.cover_url is not None:
        community.cover_url = body.cover_url
    db.commit()
    db.refresh(community)
    return _community_response(community, current_user.id, db)


@router.post("/{community_id}/join", status_code=status.HTTP_204_NO_CONTENT)
def join_community(
    community_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    existing = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id,
    ).first()
    if existing:
        return
    db.add(CommunityMember(
        community_id=community_id,
        user_id=current_user.id,
        role="member",
    ))
    community.members_count = (community.members_count or 0) + 1
    db.commit()


@router.delete("/{community_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_community(
    community_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    existing = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id,
    ).first()
    if not existing:
        return
    if existing.role == "admin":
        raise HTTPException(status_code=400, detail="Admin cannot leave. Transfer ownership first.")
    db.delete(existing)
    community.members_count = max((community.members_count or 1) - 1, 0)
    db.commit()


@router.get("/{community_id}/posts")
def list_community_posts(
    community_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    from routers.posts import _post_to_response
    cp_ids = (
        db.query(CommunityPost.post_id)
        .filter(CommunityPost.community_id == community_id)
        .order_by(CommunityPost.created_at.desc())
        .offset(offset).limit(limit)
        .all()
    )
    ids = [c[0] for c in cp_ids]
    if not ids:
        return []
    posts = db.query(Post).filter(Post.id.in_(ids)).all()
    post_map = {p.id: p for p in posts}
    return [_post_to_response(post_map[pid], current_user.id, db) for pid in ids if pid in post_map]


@router.post("/{community_id}/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def add_post_to_community(
    community_id: int,
    post_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    mem = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id,
    ).first()
    if not mem:
        raise HTTPException(status_code=403, detail="Must be a member to post")
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = db.query(CommunityPost).filter(
        CommunityPost.community_id == community_id,
        CommunityPost.post_id == post_id,
    ).first()
    if not existing:
        db.add(CommunityPost(community_id=community_id, post_id=post_id))
        db.commit()
