from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import User, Meeting, MeetingAttendee, CompanyMember, Project, ProjectTask, Notification
from plan_limits import check_limit
from admin_access import user_is_admin

router = APIRouter(prefix="/meetings", tags=["meetings"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    meeting_date: str          # YYYY-MM-DD
    meeting_time: Optional[str] = None   # HH:MM
    duration_minutes: int = 30
    location: Optional[str] = None
    project_id: Optional[int] = None
    attendee_ids: list[int] = []


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    meeting_date: Optional[str] = None
    meeting_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    action_items: Optional[str] = None
    project_id: Optional[int] = None


class AttendeeResponse(BaseModel):
    user_id: int
    status: str


class MeetingResponse(BaseModel):
    id: int
    company_id: int
    created_by: int
    title: str
    description: Optional[str] = None
    meeting_date: str
    meeting_time: Optional[str] = None
    duration_minutes: int
    location: Optional[str] = None
    status: str
    notes: Optional[str] = None
    action_items: Optional[str] = None
    project_id: Optional[int] = None
    attendees: list[AttendeeResponse] = []
    created_at: Optional[str] = None


def _to_response(m: Meeting, db: Session) -> MeetingResponse:
    attendees = db.query(MeetingAttendee).filter(MeetingAttendee.meeting_id == m.id).all()
    return MeetingResponse(
        id=m.id,
        company_id=m.company_id,
        created_by=m.created_by,
        title=m.title,
        description=m.description,
        meeting_date=m.meeting_date,
        meeting_time=m.meeting_time,
        duration_minutes=m.duration_minutes or 30,
        location=m.location,
        status=m.status or "scheduled",
        notes=m.notes,
        action_items=m.action_items,
        project_id=m.project_id,
        attendees=[AttendeeResponse(user_id=a.user_id, status=a.status) for a in attendees],
        created_at=m.created_at.isoformat() if m.created_at else None,
    )


def _get_company_id(db: Session, user_id: int) -> int:
    mem = db.query(CompanyMember).filter(CompanyMember.user_id == user_id).first()
    if not mem:
        raise HTTPException(status_code=403, detail="Not a company member")
    return mem.company_id


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/", response_model=list[MeetingResponse])
def list_meetings(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status: Optional[str] = Query(None),
    upcoming: bool = Query(False),
):
    company_id = _get_company_id(db, current_user.id)
    q = db.query(Meeting).filter(Meeting.company_id == company_id)
    if status:
        q = q.filter(Meeting.status == status)
    if upcoming:
        from datetime import date
        today = date.today().isoformat()
        q = q.filter(Meeting.meeting_date >= today, Meeting.status == "scheduled")
    meetings = q.order_by(Meeting.meeting_date.asc(), Meeting.meeting_time.asc()).all()
    return [_to_response(m, db) for m in meetings]


@router.post("/", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_meeting(
    body: MeetingCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company_id = _get_company_id(db, current_user.id)

    # Plan limit: max meetings
    meeting_count = db.query(Meeting).filter(Meeting.company_id == company_id).count()
    check_limit(db, company_id, "max_meetings", meeting_count, is_admin=user_is_admin(current_user))

    meeting = Meeting(
        company_id=company_id,
        created_by=current_user.id,
        title=body.title.strip(),
        description=body.description,
        meeting_date=body.meeting_date,
        meeting_time=body.meeting_time,
        duration_minutes=body.duration_minutes,
        location=body.location,
        project_id=body.project_id,
        status="scheduled",
    )
    db.add(meeting)
    db.flush()

    # Add organizer as attendee
    db.add(MeetingAttendee(meeting_id=meeting.id, user_id=current_user.id, status="accepted"))

    # Add other attendees
    for uid in body.attendee_ids:
        if uid != current_user.id:
            db.add(MeetingAttendee(meeting_id=meeting.id, user_id=uid, status="invited"))
            # Notify attendee
            db.add(Notification(
                user_id=uid,
                type="meeting_invite",
                title="دعوة اجتماع",
                body=f"دُعيت لاجتماع: {meeting.title} بتاريخ {meeting.meeting_date}",
                actor_id=current_user.id,
                reference_id=str(meeting.id),
            ))

    db.commit()
    db.refresh(meeting)
    return _to_response(meeting, db)


@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(
    meeting_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company_id = _get_company_id(db, current_user.id)
    m = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.company_id == company_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return _to_response(m, db)


@router.patch("/{meeting_id}", response_model=MeetingResponse)
def update_meeting(
    meeting_id: int,
    body: MeetingUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company_id = _get_company_id(db, current_user.id)
    m = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.company_id == company_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if body.title is not None: m.title = body.title
    if body.description is not None: m.description = body.description
    if body.meeting_date is not None: m.meeting_date = body.meeting_date
    if body.meeting_time is not None: m.meeting_time = body.meeting_time
    if body.duration_minutes is not None: m.duration_minutes = body.duration_minutes
    if body.location is not None: m.location = body.location
    if body.notes is not None: m.notes = body.notes
    if body.action_items is not None: m.action_items = body.action_items
    if body.project_id is not None: m.project_id = body.project_id

    was_done = m.status == "done"
    if body.status is not None:
        m.status = body.status
        # Auto-create follow-up task when meeting is marked done
        if body.status == "done" and not was_done and m.project_id:
            task = ProjectTask(
                project_id=m.project_id,
                title=f"متابعة اجتماع: {m.title}",
                description=m.action_items or m.notes or "بنود الاجتماع",
                priority="medium",
                status="todo",
            )
            db.add(task)

    db.commit()
    db.refresh(m)
    return _to_response(m, db)


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(
    meeting_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company_id = _get_company_id(db, current_user.id)
    m = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.company_id == company_id,
        Meeting.created_by == current_user.id,
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Not found or no permission")
    db.delete(m)
    db.commit()


@router.post("/{meeting_id}/done", response_model=MeetingResponse)
def mark_done(
    meeting_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    notes: Optional[str] = Query(None),
    action_items: Optional[str] = Query(None),
):
    """Mark meeting as done and optionally save notes + auto-create follow-up task."""
    company_id = _get_company_id(db, current_user.id)
    m = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.company_id == company_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")

    m.status = "done"
    if notes: m.notes = notes
    if action_items: m.action_items = action_items

    # Auto-generate AI summary if no notes provided
    if not m.notes and not m.action_items:
        try:
            import os
            import anthropic as _anthropic
            api_key = os.environ.get("ANTHROPIC_API_KEY", "")
            if api_key:
                client = _anthropic.Anthropic(api_key=api_key)
                prompt = (
                    f"أنت مساعد ذكي لتلخيص الاجتماعات.\n\n"
                    f"اجتماع: {m.title}\n"
                    f"التاريخ: {m.meeting_date} {m.meeting_time or ''}\n"
                    f"المدة: {m.duration_minutes} دقيقة\n"
                    f"الوصف: {m.description or 'لا يوجد'}\n\n"
                    f"اكتب ملخصاً موجزاً للاجتماع ونقاط العمل المقترحة (بالعربية)."
                )
                msg = client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=512,
                    messages=[{"role": "user", "content": prompt}],
                )
                ai_summary = msg.content[0].text if msg.content else None
                if ai_summary:
                    m.notes = ai_summary
        except Exception:
            pass  # AI summary is best-effort — don't fail the request

    # Auto-create follow-up task if linked to a project
    if m.project_id:
        task = ProjectTask(
            project_id=m.project_id,
            title=f"متابعة اجتماع: {m.title}",
            description=m.action_items or m.notes or "بنود الاجتماع",
            priority="medium",
            status="todo",
        )
        db.add(task)

    db.commit()
    db.refresh(m)
    return _to_response(m, db)
