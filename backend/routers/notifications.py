from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import User, Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    body: Optional[str] = None
    read: bool = False
    reference_id: Optional[str] = None
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_avatar: Optional[str] = None
    created_at: Optional[str] = None


class UnreadCount(BaseModel):
    count: int


@router.get("/", response_model=list[NotificationResponse])
def list_notifications(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(50, ge=1, le=100),
):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        NotificationResponse(
            id=n.id,
            type=n.type,
            title=n.title,
            body=n.body,
            read=bool(n.read),
            reference_id=n.reference_id,
            actor_id=n.actor_id,
            actor_name=n.actor.name if n.actor else None,
            actor_avatar=n.actor.avatar_url if n.actor else None,
            created_at=n.created_at.isoformat() if n.created_at else None,
        )
        for n in notifs
    ]


@router.get("/unread-count", response_model=UnreadCount)
def unread_count(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.read == 0)
        .count()
    )
    return UnreadCount(count=count)


@router.patch("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(
    notification_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.read = 1
    db.commit()


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == 0,
    ).update({"read": 1})
    db.commit()


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
