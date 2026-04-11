from __future__ import annotations

import json
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from config import settings
from models import User, AgentMessage as AgentMessageModel, CompanyMember
from plan_limits import require_feature
from admin_access import user_is_admin

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
        "You are Alloul One AI — an intelligent business assistant embedded inside the Alloul One platform. "
        "You help users manage their work: tasks, projects, deals, meetings, handovers, and team collaboration. "
        "Be concise, insightful, and professional. Respond in the same language the user writes in (Arabic or English). "
        "When analyzing data, give specific actionable recommendations, not generic advice."
    )

    if mode == "company":
        from models import (
            Company, CompanyMember, HandoverRecord, MemoryRecord,
            Meeting, Project, ProjectTask, Deal,
        )
        member = db.query(CompanyMember).filter(CompanyMember.user_id == user.id).first()
        if not member:
            return base + "\n\nUser is not part of a company yet."

        company = db.query(Company).filter(Company.id == member.company_id).first()
        company_name = company.name if company else "N/A"
        ctx = f"\n\n=== WORKSPACE CONTEXT ===\nCompany: {company_name} | Role: {member.role}"

        # Projects
        projects = db.query(Project).filter(Project.company_id == member.company_id).limit(20).all()
        if projects:
            proj_lines = []
            for p in projects:
                proj_lines.append(f"  - [{p.status}] {p.name} (due: {p.due_date or 'N/A'})")
            ctx += "\n\nProjects:\n" + "\n".join(proj_lines)

        # Tasks
        tasks = (
            db.query(ProjectTask)
            .join(Project, ProjectTask.project_id == Project.id)
            .filter(Project.company_id == member.company_id)
            .limit(30).all()
        )
        if tasks:
            todo = [t for t in tasks if t.status == "todo"]
            in_prog = [t for t in tasks if t.status == "in_progress"]
            done = [t for t in tasks if t.status == "done"]
            high = [t for t in tasks if t.priority == "high"]
            ctx += f"\n\nTasks: {len(tasks)} total | {len(todo)} todo | {len(in_prog)} in-progress | {len(done)} done | {len(high)} high-priority"
            if high:
                ctx += "\nHigh-priority: " + ", ".join(t.title for t in high[:5])

        # Deals
        deals = db.query(Deal).filter(Deal.user_id == user.id).limit(20).all()
        if deals:
            active = [d for d in deals if d.stage not in ("won", "lost")]
            won = [d for d in deals if d.stage == "won"]
            pipeline = sum(d.value or 0 for d in active)
            ctx += f"\n\nDeals: {len(active)} active | {len(won)} won | Pipeline: {pipeline:,}"

        # Meetings
        meetings = (
            db.query(Meeting)
            .filter(Meeting.company_id == member.company_id, Meeting.status == "scheduled")
            .limit(5).all()
        )
        if meetings:
            ctx += "\n\nUpcoming meetings: " + ", ".join(
                f"{m.title} ({m.meeting_date})" for m in meetings
            )

        # Handovers
        handovers = db.query(HandoverRecord).filter(HandoverRecord.user_id == user.id).limit(5).all()
        if handovers:
            ctx += "\n\nRecent handovers: " + ", ".join(h.title for h in handovers)

        # Memories / knowledge
        memories = db.query(MemoryRecord).filter(MemoryRecord.user_id == user.id).limit(5).all()
        if memories:
            ctx += "\n\nKnowledge base items: " + ", ".join(m.title for m in memories)

        ctx += "\n=========================\n"
        return base + ctx

    elif mode == "media":
        return (
            base +
            "\n\nYou are in Social Media mode. Help users create engaging posts, captions, content ideas, "
            "and social media strategy. Be creative and adapt to different platforms (LinkedIn, Twitter, Instagram)."
        )

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
    # Gate company-mode AI behind Pro plan
    if body.mode == "company":
        mem = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
        if mem:
            require_feature(db, mem.company_id, "ai_chat", is_admin=user_is_admin(current_user))

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
        reply = (
            "⚠️ خدمة الذكاء الاصطناعي غير مفعّلة حالياً. "
            "يرجى إعداد ANTHROPIC_API_KEY على الخادم لتفعيل المساعد الذكي.\n\n"
            f"رسالتك: \"{user_msg[:200]}\""
        )
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
        api_messages = [{"role": "user", "content": user_msg or "مرحباً"}]

    async def stream():
        full_reply: list[str] = []
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
            error_text = f"خطأ: {str(e)}"
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


# ─── Specialized Analysis Endpoints ─────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    topic: str  # "dashboard" | "tasks" | "deals" | "meetings"
    extra: Optional[str] = None


@router.post("/analyze")
async def analyze(
    body: AnalyzeRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Generate a focused AI analysis for a specific workspace topic."""
    from models import Company, CompanyMember, Project, ProjectTask, Deal, Meeting, HandoverRecord

    member = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a company member")

    require_feature(db, member.company_id, "ai_analyze", is_admin=user_is_admin(current_user))

    client = _get_anthropic_client()

    # Build topic-specific data snapshot
    topic_ctx = ""
    prompt_instruction = ""

    if body.topic == "dashboard":
        projects = db.query(Project).filter(Project.company_id == member.company_id).limit(20).all()
        tasks = (
            db.query(ProjectTask)
            .join(Project, ProjectTask.project_id == Project.id)
            .filter(Project.company_id == member.company_id).limit(50).all()
        )
        deals = db.query(Deal).filter(Deal.user_id == current_user.id).limit(20).all()
        meetings = db.query(Meeting).filter(
            Meeting.company_id == member.company_id, Meeting.status == "scheduled"
        ).limit(5).all()

        todo_tasks = [t for t in tasks if t.status == "todo"]
        high_tasks = [t for t in tasks if t.priority == "high"]
        active_deals = [d for d in deals if d.stage not in ("won", "lost")]
        pipeline = sum(d.value or 0 for d in active_deals)

        topic_ctx = (
            f"Projects: {len(projects)} total\n"
            f"Tasks: {len(tasks)} total | {len(todo_tasks)} pending | {len(high_tasks)} high-priority\n"
            f"Deals: {len(active_deals)} active | Pipeline: {pipeline:,}\n"
            f"Upcoming meetings: {len(meetings)}\n"
        )
        prompt_instruction = (
            "Analyze this workspace dashboard snapshot. "
            "Give 3-5 key insights and prioritized action items for this week. "
            "Be specific and actionable. Use bullet points."
        )

    elif body.topic == "tasks":
        tasks = (
            db.query(ProjectTask)
            .join(Project, ProjectTask.project_id == Project.id)
            .filter(Project.company_id == member.company_id).limit(50).all()
        )
        high = [t for t in tasks if t.priority == "high" and t.status != "done"]
        overdue = [t for t in tasks if t.due_date and t.status != "done"]

        topic_ctx = (
            f"Total tasks: {len(tasks)}\n"
            f"High priority pending: {', '.join(t.title for t in high[:10])}\n"
            f"Tasks with due dates: {len(overdue)}\n"
        )
        prompt_instruction = (
            "Analyze these tasks. Suggest a prioritization strategy, identify bottlenecks, "
            "and recommend which tasks to tackle first today. Be specific."
        )

    elif body.topic == "deals":
        deals = db.query(Deal).filter(Deal.user_id == current_user.id).limit(30).all()
        active = [d for d in deals if d.stage not in ("won", "lost")]
        stale = [d for d in active if (d.probability or 0) < 30]

        topic_ctx = (
            f"Active deals: {len(active)}\n"
            f"Low-probability deals (<30%): {len(stale)}\n"
            f"Deal stages: " + ", ".join(f"{d.company}@{d.stage}({d.probability}%)" for d in active[:10]) + "\n"
        )
        prompt_instruction = (
            "Analyze the sales pipeline. Identify at-risk deals, suggest follow-up actions, "
            "and recommend which deals to prioritize to maximize revenue this month."
        )

    elif body.topic == "meetings":
        meetings = db.query(Meeting).filter(
            Meeting.company_id == member.company_id
        ).order_by(Meeting.meeting_date.desc()).limit(10).all()
        upcoming = [m for m in meetings if m.status == "scheduled"]
        with_no_notes = [m for m in meetings if m.status == "done" and not m.notes]

        topic_ctx = (
            f"Upcoming meetings: {len(upcoming)}\n"
            f"Meetings done without notes: {len(with_no_notes)}\n"
            f"Next meetings: " + ", ".join(f"{m.title} ({m.meeting_date})" for m in upcoming[:5]) + "\n"
        )
        prompt_instruction = (
            "Analyze meeting patterns. Suggest preparation tips for upcoming meetings, "
            "flag meetings that need follow-up, and recommend best practices."
        )

    else:
        topic_ctx = body.extra or ""
        prompt_instruction = "Analyze the provided information and give actionable insights."

    full_prompt = f"{prompt_instruction}\n\nData:\n{topic_ctx}"
    if body.extra:
        full_prompt += f"\nAdditional context: {body.extra}"

    if not client:
        summary = f"تحليل {body.topic}:\n\n{topic_ctx}\n\n⚠️ AI غير مفعّل — يرجى إعداد ANTHROPIC_API_KEY."
        return {"summary": summary, "topic": body.topic}

    system = _build_system_prompt("company", current_user, db)

    try:
        msg = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": full_prompt}],
        )
        summary = msg.content[0].text if msg.content else "No analysis generated."
    except Exception as e:
        summary = f"خطأ في التحليل: {str(e)}"

    # Save as agent message
    db.add(AgentMessageModel(
        user_id=current_user.id,
        role="assistant",
        content=f"📊 تحليل {body.topic}:\n\n{summary}",
        mode="company",
    ))
    db.commit()

    return {"summary": summary, "topic": body.topic}
