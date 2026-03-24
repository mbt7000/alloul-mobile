from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import User, Story, StoryView

router = APIRouter(prefix="/stories", tags=["stories"])

STORY_DURATION_HOURS = 24


class StoryCreate(BaseModel):
    media_url: Optional[str] = None
    media_type: str = "image"
    caption: Optional[str] = None


class StoryResponse(BaseModel):
    id: int
    user_id: int
    media_url: Optional[str] = None
    media_type: str
    caption: Optional[str] = None
    author_name: Optional[str] = None
    author_username: Optional[str] = None
    author_avatar: Optional[str] = None
    views_count: int = 0
    viewed_by_me: bool = False
    created_at: Optional[str] = None
    expires_at: Optional[str] = None


def _to_response(s: Story, viewer_id: int, db: Session) -> StoryResponse:
    views_count = db.query(StoryView).filter(StoryView.story_id == s.id).count()
    viewed = db.query(StoryView).filter(
        StoryView.story_id == s.id, StoryView.user_id == viewer_id
    ).first() is not None
    return StoryResponse(
        id=s.id,
        user_id=s.user_id,
        media_url=s.media_url,
        media_type=s.media_type or "image",
        caption=s.caption,
        author_name=s.author.name if s.author else None,
        author_username=s.author.username if s.author else None,
        author_avatar=s.author.avatar_url if s.author else None,
        views_count=views_count,
        viewed_by_me=viewed,
        created_at=s.created_at.isoformat() if s.created_at else None,
        expires_at=s.expires_at.isoformat() if s.expires_at else None,
    )


@router.get("/", response_model=list[StoryResponse])
def list_stories(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    now = datetime.now(timezone.utc)
    stories = db.query(Story).filter(
        Story.expires_at > now
    ).order_by(Story.created_at.desc()).limit(50).all()
    return [_to_response(s, current_user.id, db) for s in stories]


@router.post("/", response_model=StoryResponse, status_code=status.HTTP_201_CREATED)
def create_story(
    body: StoryCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    expires = datetime.now(timezone.utc) + timedelta(hours=STORY_DURATION_HOURS)
    story = Story(
        user_id=current_user.id,
        media_url=body.media_url,
        media_type=body.media_type or "image",
        caption=body.caption,
        expires_at=expires,
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    return _to_response(story, current_user.id, db)


@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_story(
    story_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your story")
    db.delete(story)
    db.commit()


@router.post("/{story_id}/view", status_code=status.HTTP_204_NO_CONTENT)
def view_story(
    story_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    existing = db.query(StoryView).filter(
        StoryView.story_id == story_id, StoryView.user_id == current_user.id
    ).first()
    if not existing:
        db.add(StoryView(story_id=story_id, user_id=current_user.id))
        db.commit()
