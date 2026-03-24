from __future__ import annotations

import json
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from config import settings
from models import User, AgentMessage as AgentMessageModel

router = APIRouter(prefix="/agent", tags=["agent"])


class AgentMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: Optional[str] = None


class ChatRequest(BaseModel):
    messages: list[dict]
    mode: str = "media"


def _get_anthropic_client():
    if not settings.ANTHROPIC_API_KEY:
        return None
    try:
        import anthropic
        return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    except Exception:
        return None


def _build_system_prompt(mode: str, user: User, db: Session) -> str:
    base = (
        "You are Alloul One AI assistant. You help users with their work on the Alloul One platform. "
        "Be concise, helpful, and professional. Respond in the same language the user writes in."
    )
    if mode == "company":
        from models import Company, CompanyMember, HandoverRecord, MemoryRecord
        member = db.query(CompanyMember).filter(CompanyMember.user_id == user.id).first()
        if member:
            company = db.query(Company).filter(Company.id == member.company_id).first()
            handovers = db.query(HandoverRecord).filter(HandoverRecord.user_id == user.id).limit(10).all()
            memories = db.query(MemoryRecord).filter(MemoryRecord.user_id == user.id).limit(10).all()
            ctx = f"\n\nCompany: {company.name if company else 'N/A'}, Role: {member.role}"
            if handovers:
                ctx += "\nRecent handovers: " + ", ".join(h.title for h in handovers)
            if memories:
                ctx += "\nRecent memories: " + ", ".join(m.title for m in memories)
            return base + ctx
    elif mode == "media":
        return base + "\n\nYou are in media/content mode. Help users create engaging social media content, posts, captions, and ideas."
    return base


@router.get("/history", response_model=list[AgentMessageResponse])
def get_history(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    mode: Optional[str] = None,
):
    q = db.query(AgentMessageModel).filter(AgentMessageModel.user_id == current_user.id)
    if mode:
        q = q.filter(AgentMessageModel.mode == mode)
    msgs = q.order_by(AgentMessageModel.created_at.asc()).limit(200).all()
    return [
        AgentMessageResponse(
            id=str(m.id), role=m.role, content=m.content,
            created_at=m.created_at.isoformat() if m.created_at else None,
        )
        for m in msgs
    ]


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
def delete_history(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    db.query(AgentMessageModel).filter(AgentMessageModel.user_id == current_user.id).delete()
    db.commit()


@router.post("/chat")
async def chat(
    body: ChatRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    user_msg = ""
    for m in body.messages:
        if m.get("role") == "user":
            user_msg = m.get("content", "")

    if user_msg:
        db.add(AgentMessageModel(
            user_id=current_user.id, role="user", content=user_msg, mode=body.mode,
        ))
        db.commit()

    client = _get_anthropic_client()
    if not client:
        reply = f"AI service is not configured. Please set ANTHROPIC_API_KEY. You said: \"{user_msg[:200]}\""
        db.add(AgentMessageModel(
            user_id=current_user.id, role="assistant", content=reply, mode=body.mode,
        ))
        db.commit()

        async def fallback_stream():
            yield f"data: {json.dumps({'text': reply})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(fallback_stream(), media_type="text/event-stream")

    system_prompt = _build_system_prompt(body.mode, current_user, db)
    api_messages = []
    for m in body.messages:
        role = m.get("role", "user")
        if role in ("user", "assistant"):
            api_messages.append({"role": role, "content": m.get("content", "")})
    if not api_messages:
        api_messages = [{"role": "user", "content": user_msg or "Hello"}]

    async def stream():
        full_reply = []
        try:
            with client.messages.stream(
                model="claude-3-5-haiku-20241022",
                max_tokens=2048,
                system=system_prompt,
                messages=api_messages,
            ) as s:
                for text in s.text_stream:
                    full_reply.append(text)
                    yield f"data: {json.dumps({'text': text})}\n\n"
        except Exception as e:
            error_text = f"Error: {str(e)}"
            yield f"data: {json.dumps({'text': error_text})}\n\n"
            full_reply.append(error_text)

        final_text = "".join(full_reply)
        if final_text:
            db.add(AgentMessageModel(
                user_id=current_user.id, role="assistant", content=final_text, mode=body.mode,
            ))
            db.commit()
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.post("/voice-to-text")
async def voice_to_text(
    current_user: User = Depends(get_current_user),
):
    return {"text": "Voice-to-text integration coming soon. Please type your message for now."}


@router.post("/text-to-voice")
async def text_to_voice(
    current_user: User = Depends(get_current_user),
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Text-to-voice coming soon",
    )


@router.post("/analyze-image")
async def analyze_image(
    current_user: User = Depends(get_current_user),
):
    return {"result": "Image analysis integration coming soon."}
