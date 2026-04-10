"""
/ai — Confirm-save endpoints for AI-extracted structured data.

Flow:
  1. Mobile calls POST /ai/parse-task   (from ai_extract.py) → gets extracted preview
  2. User reviews the preview in AIComposeSheet
  3. Mobile calls POST /ai/confirm-task → saved to project_tasks (this file)

Isolation:  All saved records are scoped to the current user's company.
Audit:      Every save is logged to activity_logs with submitted_by + confirmed_by + saved_at.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import (
    ActivityLog,
    Company,
    CompanyMember,
    HandoverRecord,
    Project,
    ProjectTask,
    SalesLedger,
    User,
)

router = APIRouter(prefix="/ai", tags=["ai"])

# ─── Helpers ─────────────────────────────────────────────────────────────────


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _require_company(db: Session, user: User) -> Company:
    """Return the user's company or raise 403."""
    membership = (
        db.query(CompanyMember)
        .filter(CompanyMember.user_id == user.id)
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of a company to use AI save features.",
        )
    company = db.query(Company).filter(Company.id == membership.company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")
    return company


def _log(
    db: Session,
    *,
    company_id: int,
    user_id: int,
    action: str,
    details: dict,
) -> None:
    """Write a row to activity_logs for audit trail."""
    log = ActivityLog(
        company_id=company_id,
        user_id=user_id,
        action=action,
        details=json.dumps(details, ensure_ascii=False, default=str),
    )
    db.add(log)


def _get_or_create_ai_project(db: Session, company: Company, user: User) -> Project:
    """
    Return the company's "AI Tasks" catch-all project, creating it if it
    doesn't exist yet.  Only called when the caller doesn't specify a project_id.
    """
    existing = (
        db.query(Project)
        .filter(
            Project.company_id == company.id,
            Project.name == "AI Tasks",
        )
        .first()
    )
    if existing:
        return existing
    proj = Project(
        user_id=user.id,
        company_id=company.id,
        name="AI Tasks",
        description="Auto-created inbox for AI-extracted tasks.",
        status="in_progress",
    )
    db.add(proj)
    db.flush()  # get proj.id without committing yet
    return proj


def _verify_project_belongs_to_company(
    db: Session, project_id: int, company_id: int
) -> Project:
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found.")
    if proj.company_id != company_id:
        raise HTTPException(
            status_code=403,
            detail="Project does not belong to your company.",
        )
    return proj


# ─── Schemas ─────────────────────────────────────────────────────────────────

VALID_PRIORITIES = {"high", "medium", "low"}
VALID_TASK_STATUSES = {"todo", "in_progress", "done"}
VALID_HANDOVER_STATUSES = {"pending", "in_progress", "submitted", "accepted", "closed"}
VALID_RISK_LEVELS = {"low", "medium", "high", "critical"}
VALID_TX_TYPES = {"income", "expense", "invoice", "payment"}
VALID_PAYMENT_STATUSES = {"pending", "paid", "overdue", "cancelled"}


class AITaskExtraction(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    status: Optional[str] = "todo"
    due_date: Optional[str] = None       # YYYY-MM-DD
    assignee_name: Optional[str] = None
    project_name: Optional[str] = None
    related_client: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None

    @field_validator("priority")
    @classmethod
    def _validate_priority(cls, v: Optional[str]) -> str:
        if v and v not in VALID_PRIORITIES:
            return "medium"
        return v or "medium"

    @field_validator("status")
    @classmethod
    def _validate_status(cls, v: Optional[str]) -> str:
        if v and v not in VALID_TASK_STATUSES:
            return "todo"
        return v or "todo"


class ConfirmTaskRequest(BaseModel):
    extraction: AITaskExtraction
    project_id: Optional[int] = None     # if omitted → auto-assign to "AI Tasks"


class ConfirmTaskResponse(BaseModel):
    task_id: int
    project_id: int
    company_id: int
    title: str
    status: str
    priority: str
    due_date: Optional[str]
    saved_at: str


# ── Handover ─────────────────────────────────────────────────────────────────

class AIHandoverExtraction(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    from_person: Optional[str] = None
    to_person: Optional[str] = None
    department: Optional[str] = None
    client_name: Optional[str] = None
    status: Optional[str] = "pending"
    content: Optional[str] = None
    summary: Optional[str] = None
    notes: Optional[str] = None
    risk_level: Optional[str] = None
    flagged_amount: Optional[float] = None
    currency: Optional[str] = None
    deadline: Optional[str] = None
    next_owner_name: Optional[str] = None
    pending_items: Optional[List[str]] = None  # stored as pending_actions_json
    tasks_mentioned: Optional[List[str]] = None

    @field_validator("status")
    @classmethod
    def _validate_status(cls, v: Optional[str]) -> str:
        if v and v not in VALID_HANDOVER_STATUSES:
            return "pending"
        return v or "pending"

    @field_validator("risk_level")
    @classmethod
    def _validate_risk(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in VALID_RISK_LEVELS:
            return None
        return v


class ConfirmHandoverRequest(BaseModel):
    extraction: AIHandoverExtraction


class ConfirmHandoverResponse(BaseModel):
    handover_id: int
    company_id: int
    title: str
    status: str
    risk_level: Optional[str]
    saved_at: str


# ── Transaction ───────────────────────────────────────────────────────────────

class AISalesExtraction(BaseModel):
    amount: float = Field(..., gt=0)
    currency: Optional[str] = "SAR"
    transaction_type: Optional[str] = "income"
    payment_status: Optional[str] = "pending"
    counterparty_name: Optional[str] = None
    item_name: Optional[str] = None
    quantity: Optional[float] = None
    description: Optional[str] = None
    transaction_date: Optional[str] = None  # YYYY-MM-DD
    invoice_number: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("transaction_type")
    @classmethod
    def _validate_type(cls, v: Optional[str]) -> str:
        if v and v not in VALID_TX_TYPES:
            return "income"
        return v or "income"

    @field_validator("payment_status")
    @classmethod
    def _validate_pstatus(cls, v: Optional[str]) -> str:
        if v and v not in VALID_PAYMENT_STATUSES:
            return "pending"
        return v or "pending"


class ConfirmTransactionRequest(BaseModel):
    extraction: AISalesExtraction


class ConfirmTransactionResponse(BaseModel):
    transaction_id: int
    company_id: int
    amount: float
    currency: str
    transaction_type: str
    payment_status: str
    saved_at: str


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.post(
    "/confirm-task",
    response_model=ConfirmTaskResponse,
    summary="Save an AI-extracted task to the correct company project",
)
def confirm_task(
    body: ConfirmTaskRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company = _require_company(db, current_user)
    ext = body.extraction

    # Resolve project — caller may supply one, or we use the catch-all
    if body.project_id is not None:
        project = _verify_project_belongs_to_company(db, body.project_id, company.id)
    else:
        project = _get_or_create_ai_project(db, company, current_user)

    now = _utcnow()
    task = ProjectTask(
        project_id=project.id,
        title=ext.title.strip(),
        description=ext.description,
        status=ext.status,
        priority=ext.priority,
        due_date=ext.due_date,
        created_by_user_id=current_user.id,
        related_client=ext.related_client,
        tags=json.dumps(ext.tags, ensure_ascii=False) if ext.tags else None,
        notes=ext.notes,
        ai_confirmed_at=now,
        ai_confirmed_by=current_user.id,
    )
    db.add(task)
    db.flush()  # populate task.id

    _log(
        db,
        company_id=company.id,
        user_id=current_user.id,
        action="ai_confirm_task",
        details={
            "task_id": task.id,
            "project_id": project.id,
            "title": task.title,
            "priority": task.priority,
            "confirmed_by": current_user.id,
            "confirmed_at": now.isoformat(),
        },
    )

    db.commit()
    db.refresh(task)

    return ConfirmTaskResponse(
        task_id=task.id,
        project_id=task.project_id,
        company_id=company.id,
        title=task.title,
        status=task.status,
        priority=task.priority,
        due_date=task.due_date,
        saved_at=now.isoformat(),
    )


@router.post(
    "/confirm-handover",
    response_model=ConfirmHandoverResponse,
    summary="Save an AI-extracted handover record to the company workspace",
)
def confirm_handover(
    body: ConfirmHandoverRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company = _require_company(db, current_user)
    ext = body.extraction

    now = _utcnow()
    record = HandoverRecord(
        user_id=current_user.id,
        company_id=company.id,
        title=ext.title.strip(),
        from_person=ext.from_person,
        to_person=ext.to_person,
        department=ext.department,
        status=ext.status,
        content=ext.content,
        score=0,
        tasks=0,
        completed_tasks=0,
        # AI-enriched fields
        client_name=ext.client_name,
        next_owner_name=ext.next_owner_name,
        pending_actions_json=(
            json.dumps(ext.pending_items, ensure_ascii=False)
            if ext.pending_items else None
        ),
        flagged_amount=ext.flagged_amount,
        currency=ext.currency,
        deadline=ext.deadline,
        risk_level=ext.risk_level,
        summary=ext.summary,
        notes=ext.notes,
        ai_confirmed_at=now,
        ai_confirmed_by=current_user.id,
    )
    db.add(record)
    db.flush()

    _log(
        db,
        company_id=company.id,
        user_id=current_user.id,
        action="ai_confirm_handover",
        details={
            "handover_id": record.id,
            "title": record.title,
            "risk_level": record.risk_level,
            "confirmed_by": current_user.id,
            "confirmed_at": now.isoformat(),
        },
    )

    db.commit()
    db.refresh(record)

    return ConfirmHandoverResponse(
        handover_id=record.id,
        company_id=company.id,
        title=record.title,
        status=record.status,
        risk_level=record.risk_level,
        saved_at=now.isoformat(),
    )


@router.post(
    "/confirm-transaction",
    response_model=ConfirmTransactionResponse,
    summary="Save an AI-extracted sales / financial transaction to the company ledger",
)
def confirm_transaction(
    body: ConfirmTransactionRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company = _require_company(db, current_user)
    ext = body.extraction

    now = _utcnow()
    ledger_row = SalesLedger(
        company_id=company.id,
        created_by_user_id=current_user.id,
        transaction_type=ext.transaction_type,
        counterparty_name=ext.counterparty_name,
        item_name=ext.item_name or ext.description,
        quantity=ext.quantity,
        amount=ext.amount,
        currency=(ext.currency or "SAR").upper()[:8],
        transaction_date=ext.transaction_date,
        payment_status=ext.payment_status,
        category=ext.category,
        notes=ext.notes,
        invoice_number=ext.invoice_number,
        ai_confirmed_at=now,
        ai_confirmed_by=current_user.id,
    )
    db.add(ledger_row)
    db.flush()

    _log(
        db,
        company_id=company.id,
        user_id=current_user.id,
        action="ai_confirm_transaction",
        details={
            "transaction_id": ledger_row.id,
            "type": ledger_row.transaction_type,
            "amount": ledger_row.amount,
            "currency": ledger_row.currency,
            "payment_status": ledger_row.payment_status,
            "confirmed_by": current_user.id,
            "confirmed_at": now.isoformat(),
        },
    )

    db.commit()
    db.refresh(ledger_row)

    return ConfirmTransactionResponse(
        transaction_id=ledger_row.id,
        company_id=company.id,
        amount=ledger_row.amount,
        currency=ledger_row.currency,
        transaction_type=ledger_row.transaction_type,
        payment_status=ledger_row.payment_status,
        saved_at=now.isoformat(),
    )
