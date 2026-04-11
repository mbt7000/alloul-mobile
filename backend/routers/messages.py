from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import User, DirectConversation, DirectMessage, UserBlock

router = APIRouter(prefix="/messages", tags=["messages"])


class ConversationResponse(BaseModel):
    id: int
    other_user_id: int
    other_user_name: Optional[str] = None
    other_user_username: Optional[str] = None
    other_user_avatar: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None
    unread_count: int = 0

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender_name: Optional[str] = None
    sender_avatar: Optional[str] = None
    content: str
    read_at: Optional[str] = None
    created_at: Optional[str] = None
    is_mine: bool = False

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    content: str


def _get_or_create_conversation(db: Session, user1_id: int, user2_id: int) -> DirectConversation:
    """Get or create a conversation between two users (always store smaller id as user1)."""
    u1, u2 = min(user1_id, user2_id), max(user1_id, user2_id)
    conv = db.query(DirectConversation).filter(
        DirectConversation.user1_id == u1,
        DirectConversation.user2_id == u2,
    ).first()
    if not conv:
        conv = DirectConversation(user1_id=u1, user2_id=u2)
        db.add(conv)
        db.commit()
        db.refresh(conv)
    return conv


def _other_user(conv: DirectConversation, my_id: int) -> User:
    return conv.user2 if conv.user1_id == my_id else conv.user1


def _conv_to_response(conv: DirectConversation, my_id: int, db: Session) -> ConversationResponse:
    other = _other_user(conv, my_id)
    last_msg = (
        db.query(DirectMessage)
        .filter(DirectMessage.conversation_id == conv.id)
        .order_by(DirectMessage.created_at.desc())
        .first()
    )
    unread = (
        db.query(DirectMessage)
        .filter(
            DirectMessage.conversation_id == conv.id,
            DirectMessage.sender_id != my_id,
            DirectMessage.read_at.is_(None),
        )
        .count()
    )
    return ConversationResponse(
        id=conv.id,
        other_user_id=other.id,
        other_user_name=other.name or other.username,
        other_user_username=other.username,
        other_user_avatar=other.avatar_url,
        last_message=last_msg.content if last_msg else None,
        last_message_at=last_msg.created_at.isoformat() if last_msg and last_msg.created_at else None,
        unread_count=unread,
    )


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/", response_model=list[ConversationResponse])
def list_conversations(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """List all conversations for the current user."""
    convs = db.query(DirectConversation).filter(
        (DirectConversation.user1_id == current_user.id) |
        (DirectConversation.user2_id == current_user.id)
    ).order_by(DirectConversation.last_message_at.desc()).all()
    return [_conv_to_response(c, current_user.id, db) for c in convs]


@router.post("/{user_id}", response_model=ConversationResponse)
def start_conversation(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Start or get a conversation with a user."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    # Check if blocked
    blocked = db.query(UserBlock).filter(
        ((UserBlock.blocker_id == current_user.id) & (UserBlock.blocked_id == user_id)) |
        ((UserBlock.blocker_id == user_id) & (UserBlock.blocked_id == current_user.id))
    ).first()
    if blocked:
        raise HTTPException(status_code=403, detail="Cannot message this user")
    conv = _get_or_create_conversation(db, current_user.id, user_id)
    return _conv_to_response(conv, current_user.id, db)


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def list_messages(
    conversation_id: int,
    after_id: int = Query(0),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get messages in a conversation."""
    conv = db.query(DirectConversation).filter(DirectConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.user1_id != current_user.id and conv.user2_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your conversation")

    q = db.query(DirectMessage).filter(DirectMessage.conversation_id == conversation_id)
    if after_id:
        q = q.filter(DirectMessage.id > after_id)
    messages = q.order_by(DirectMessage.created_at.asc()).limit(limit).all()

    # Mark incoming messages as read
    for m in messages:
        if m.sender_id != current_user.id and m.read_at is None:
            from sqlalchemy.sql import func as sqlfunc
            m.read_at = sqlfunc.now()
    db.commit()

    return [
        MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            sender_name=m.sender.name or m.sender.username if m.sender else None,
            sender_avatar=m.sender.avatar_url if m.sender else None,
            content=m.content,
            read_at=m.read_at.isoformat() if m.read_at and hasattr(m.read_at, 'isoformat') else None,
            created_at=m.created_at.isoformat() if m.created_at else None,
            is_mine=(m.sender_id == current_user.id),
        )
        for m in messages
    ]


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: int,
    body: SendMessageRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    conv = db.query(DirectConversation).filter(DirectConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.user1_id != current_user.id and conv.user2_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your conversation")
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Empty message")

    msg = DirectMessage(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=body.content.strip(),
    )
    db.add(msg)
    conv.last_message_at = msg.created_at
    db.commit()
    db.refresh(msg)

    # Notification to other user
    other = _other_user(conv, current_user.id)
    try:
        from models import Notification
        db.add(Notification(
            user_id=other.id,
            type="message",
            title="رسالة جديدة",
            body=f"{current_user.name or current_user.username}: {body.content[:50]}",
            actor_id=current_user.id,
        ))
        db.commit()
    except Exception:
        pass

    return MessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender_name=current_user.name or current_user.username,
        sender_avatar=current_user.avatar_url,
        content=msg.content,
        created_at=msg.created_at.isoformat() if msg.created_at else None,
        is_mine=True,
    )


@router.delete("/{conversation_id}/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    conversation_id: int,
    message_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    msg = db.query(DirectMessage).filter(
        DirectMessage.id == message_id,
        DirectMessage.conversation_id == conversation_id,
        DirectMessage.sender_id == current_user.id,
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    db.delete(msg)
    db.commit()
