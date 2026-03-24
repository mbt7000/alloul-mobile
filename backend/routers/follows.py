from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import User, Follow, Notification

router = APIRouter(prefix="/follows", tags=["follows"])


class UserMini(BaseModel):
    id: int
    username: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    i_code: Optional[str] = None
    is_following: bool = False


class ProfileResponse(BaseModel):
    id: int
    username: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    bio: Optional[str] = None
    i_code: Optional[str] = None
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    is_following: bool = False
    is_self: bool = False
    created_at: Optional[str] = None


@router.get("/users/{user_id}/profile", response_model=ProfileResponse)
def get_user_profile(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    is_following = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id,
    ).first() is not None
    return ProfileResponse(
        id=user.id,
        username=user.username,
        name=user.name,
        avatar_url=user.avatar_url,
        cover_url=user.cover_url,
        bio=user.bio,
        i_code=user.i_code,
        followers_count=user.followers_count or 0,
        following_count=user.following_count or 0,
        posts_count=user.posts_count or 0,
        is_following=is_following,
        is_self=(user.id == current_user.id),
        created_at=user.created_at.isoformat() if user.created_at else None,
    )


@router.post("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def follow_user(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id,
    ).first()
    if existing:
        return
    db.add(Follow(follower_id=current_user.id, following_id=user_id))
    current_user.following_count = (current_user.following_count or 0) + 1
    target.followers_count = (target.followers_count or 0) + 1
    db.add(Notification(
        user_id=user_id,
        type="follow",
        title="New follower",
        body=f"{current_user.name or current_user.username} started following you",
        actor_id=current_user.id,
    ))
    db.commit()


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def unfollow_user(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id,
    ).first()
    if not existing:
        return
    db.delete(existing)
    current_user.following_count = max((current_user.following_count or 1) - 1, 0)
    target.followers_count = max((target.followers_count or 1) - 1, 0)
    db.commit()


@router.get("/{user_id}/followers", response_model=list[UserMini])
def list_followers(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    follows = db.query(Follow).filter(Follow.following_id == user_id).all()
    result = []
    for f in follows:
        u = f.follower
        i_am_following = db.query(Follow).filter(
            Follow.follower_id == current_user.id,
            Follow.following_id == u.id,
        ).first() is not None
        result.append(UserMini(
            id=u.id, username=u.username, name=u.name,
            avatar_url=u.avatar_url, i_code=u.i_code,
            is_following=i_am_following,
        ))
    return result


@router.get("/{user_id}/following", response_model=list[UserMini])
def list_following(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    follows = db.query(Follow).filter(Follow.follower_id == user_id).all()
    result = []
    for f in follows:
        u = f.following
        i_am_following = db.query(Follow).filter(
            Follow.follower_id == current_user.id,
            Follow.following_id == u.id,
        ).first() is not None
        result.append(UserMini(
            id=u.id, username=u.username, name=u.name,
            avatar_url=u.avatar_url, i_code=u.i_code,
            is_following=i_am_following,
        ))
    return result
