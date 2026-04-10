"""
AI Confirm-Save Router
=======================
These endpoints accept validated structured payloads (post-review by user)
and save them as official company records in the database.

CRITICAL RULES enforced here:
  ✓ Company membership check on EVERY endpoint — raises 403 if not a member
  ✓ All DB writes carry company_id — strict org isolation, no mixing
  ✓ All queries scoped by company_id before read/write
  ✓ Enum fields validated and sanitized before save
  ✓ Audit log written to activity_logs for every successful save
  ✓ AI does NOT call this layer — only the user's confirmed action triggers a save
  ✓ Permissions checked: employee/manager/admin roles respected

Module isolation:
  confirm-task        → project_tasks
  confirm-handover    → handovers
  confirm-transaction → sales_ledger
"""

from __future__ import annotations

import json
import logging
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
logger = logging.getLogger("alloul.api.ai_confirm")

# ─── Enum sets ────────────────────────────────────────────────────────────────

_PRIORITIES = {"high", "medium", "low"}
_TASK_STATUSES = {"todo", "in_progress", "done"}
_HANDOVER_STATUSES = {"pending", "in_progress", "submitted", "accepted", "closed"}
_RISK_LEVELS = {"low", "medium", "high", "critical"}
_TX_TYPES = {"income", "expense", "invoice", "payment"}
_PAYMENT_STATUSES = {"pending", "paid", "overdue", "cancelled"}

# Roles that can confirm saves (employees and above)
_CONFIRM_ROLES = {"employee", "manager", "admin", "owner"}


# ─── Shared helpers ───────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _require_company_member(db: Session, user: User) -> tuple[Company, CompanyMember]:
    """
    Verify the user is an active company member.
    Returns (Company, CompanyMember) or raises 403.
    Enforces org isolation — all subsequent writes use company.id.
    """
    membership = (
        db.query(CompanyMember)
        .filter(CompanyMember.user_id == user.id)
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of a company workspace to save AI records.",
        )
    if membership.role not in _CONFIRM_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your role '{membership.role}' does not have permission to confirm AI saves.",
        )
    company = db.query(Company).filter(Company.id == membership.company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")
    return company, membership


def _log_audit(
    db: Session,
    *,
    company_id: int,
    user_id: int,
    action: str,
    details: dict,
) -> None:
    """Write one row to activity_logs. Called inside the same transaction as the save."""
    entry = ActivityLog(
        company_id=company_id,
        user_id=user_id,
        action=action,
        details=json.dumps(details, ensure_ascii=False, default=str),
    )
    db.add(entry)


def _get_or_create_ai_inbox(db: Session, company: Company, user: User) -> Project:
    """
    Return the company's "AI Inbox" catch-all project for tasks that arrive
    without an explicit project_id. Creates it on first use.
    """
    existing = (
        db.query(Project)
        .filter(Project.company_id == company.id, Project.name == "AI Inbox")
        .first()
    )
    if existing:
        return existing
    inbox = Project(
        user_id=user.id,
        company_id=company.id,
        name="AI Inbox",
        description="Auto-created inbox for AI-confirmed tasks without an assigned project.",
        status="active",
    )
    db.add(inbox)
    db.flush()
    logger.info("Created AI Inbox project for company_id=%d", company.id)
    return inbox


# ─── Task confirm ─────────────────────────────────────────────────────────────

class ConfirmTaskPayload(BaseModel):
    """Validated task payload after user review of AI preview."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    status: Optional[str] = "todo"
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None    # free text; resolved to assignee_id by client if known
    assignee_id: Optional[int] = None    # resolved user ID if available
    related_client: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    project_id: Optional[int] = None     # if None → auto-assign to AI Inbox

    @field_validator("priority", mode="before")
    @classmethod
    def _priority(cls, v: object) -> str:
        s = str(v or "").lower().strip()
        return s if s in _PRIORITIES else "medium"

    @field_validator("status", mode="before")
    @classmethod
    def _status(cls, v: object) -> str:
        s = str(v or "").lower().strip()
        return s if s in _TASK_STATUSES else "todo"


class ConfirmTaskRequest(BaseModel):
    extraction: ConfirmTaskPayload


class ConfirmTaskResponse(BaseModel):
    task_id: int
    project_id: int
    company_id: int
    title: str
    status: str
    priority: str
    due_date: Optional[str]
    saved_at: str


@router.post(
    "/confirm-task",
    response_model=ConfirmTaskResponse,
    summary="Save AI-confirmed task to company workspace",
    status_code=status.HTTP_201_CREATED,
)
def confirm_task(
    body: ConfirmTaskRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company, membership = _require_company_member(db, current_user)
    ext = body.extraction

    # Resolve project — verify it belongs to this company
    if ext.project_id is not None:
        proj = db.query(Project).filter(
            Project.id == ext.project_id,
            Project.company_id == company.id,  # org isolation
        ).first()
        if not proj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found in your company workspace.",
            )
    else:
        proj = _get_or_create_ai_inbox(db, company, current_user)

    now = _utcnow()
    task = ProjectTask(
        project_id=proj.id,
        title=ext.title.strip(),
        description=ext.description,
        assignee_id=ext.assignee_id,
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
    db.flush()

    _log_audit(
        db,
        company_id=company.id,
        user_id=current_user.id,
        action="ai_confirm_task",
        details={
            "task_id": task.id,
            "project_id": proj.id,
            "title": task.title,
            "priority": task.priority,
            "role": membership.role,
            "saved_at": now.isoformat(),
        },
    )
    db.commit()
    db.refresh(task)
    logger.info("Task confirmed: id=%d company=%d user=%d", task.id, company.id, current_user.id)

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


# ─── Handover confirm ─────────────────────────────────────────────────────────

class ConfirmHandoverPayload(BaseModel):
    """Validated handover payload after user review."""
    handover_title: str = Field(..., min_length=1, max_length=255)
    client_name: Optional[str] = None
    current_status: Optional[str] = "pending"
    from_person: Optional[str] = None
    to_person: Optional[str] = None
    department: Optional[str] = None
    pending_actions: Optional[List[str]] = None
    important_contacts: Optional[List[str]] = None
    referenced_files: Optional[List[str]] = None
    flagged_amount: Optional[float] = None
    currency: Optional[str] = None
    deadline: Optional[str] = None
    risk_level: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None      # full content / notes body
    notes: Optional[str] = None

    @field_validator("current_status", mode="before")
    @classmethod
    def _status(cls, v: object) -> str:
        s = str(v or "").lower().strip()
        return s if s in _HANDOVER_STATUSES else "pending"

    @field_validator("risk_level", mode="before")
    @classmethod
    def _risk(cls, v: object) -> Optional[str]:
        if not v:
            return None
        s = str(v).lower().strip()
        return s if s in _RISK_LEVELS else None


class ConfirmHandoverRequest(BaseModel):
    extraction: ConfirmHandoverPayload


class ConfirmHandoverResponse(BaseModel):
    handover_id: int
    company_id: int
    title: str
    status: str
    risk_level: Optional[str]
    saved_at: str


@router.post(
    "/confirm-handover",
    response_model=ConfirmHandoverResponse,
    summary="Save AI-confirmed handover to company workspace",
    status_code=status.HTTP_201_CREATED,
)
def confirm_handover(
    body: ConfirmHandoverRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company, membership = _require_company_member(db, current_user)
    ext = body.extraction

    now = _utcnow()
    record = HandoverRecord(
        user_id=current_user.id,
        company_id=company.id,
        title=ext.handover_title.strip(),
        from_person=ext.from_person,
        to_person=ext.to_person,
        department=ext.department,
        status=ext.current_status,
        content=ext.content,
        score=0,
        tasks=len(ext.pending_actions or []),
        completed_tasks=0,
        # AI-enriched
        client_name=ext.client_name,
        next_owner_name=ext.to_person,
        pending_actions_json=(
            json.dumps(ext.pending_actions, ensure_ascii=False)
            if ext.pending_actions else None
        ),
        important_contacts_json=(
            json.dumps(ext.important_contacts, ensure_ascii=False)
            if ext.important_contacts else None
        ),
        referenced_files_json=(
            json.dumps(ext.referenced_files, ensure_ascii=False)
            if ext.referenced_files else None
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

    _log_audit(
        db,
        company_id=company.id,
        user_id=current_user.id,
        action="ai_confirm_handover",
        details={
            "handover_id": record.id,
            "title": record.title,
            "risk_level": record.risk_level,
            "flagged_amount": record.flagged_amount,
            "role": membership.role,
            "saved_at": now.isoformat(),
        },
    )
    db.commit()
    db.refresh(record)
    logger.info("Handover confirmed: id=%d company=%d user=%d", record.id, company.id, current_user.id)

    return ConfirmHandoverResponse(
        handover_id=record.id,
        company_id=company.id,
        title=record.title,
        status=record.status,
        risk_level=record.risk_level,
        saved_at=now.isoformat(),
    )


# ─── Transaction confirm ──────────────────────────────────────────────────────

class ConfirmTransactionPayload(BaseModel):
    """Validated transaction payload after user review."""
    amount: float = Field(..., gt=0)
    currency: Optional[str] = "SAR"
    transaction_type: Optional[str] = "income"
    payment_status: Optional[str] = "pending"
    counterparty_name: Optional[str] = None
    item_name: Optional[str] = None
    quantity: Optional[float] = None
    transaction_date: Optional[str] = None
    invoice_number: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("transaction_type", mode="before")
    @classmethod
    def _type(cls, v: object) -> str:
        s = str(v or "").lower().strip()
        return s if s in _TX_TYPES else "income"

    @field_validator("payment_status", mode="before")
    @classmethod
    def _pstatus(cls, v: object) -> str:
        s = str(v or "").lower().strip()
        return s if s in _PAYMENT_STATUSES else "pending"

    @field_validator("currency", mode="before")
    @classmethod
    def _currency(cls, v: object) -> str:
        if not v:
            return "SAR"
        return str(v).upper().strip()[:8]


class ConfirmTransactionRequest(BaseModel):
    extraction: ConfirmTransactionPayload


class ConfirmTransactionResponse(BaseModel):
    transaction_id: int
    company_id: int
    amount: float
    currency: str
    transaction_type: str
    payment_status: str
    saved_at: str


@router.post(
    "/confirm-transaction",
    response_model=ConfirmTransactionResponse,
    summary="Save AI-confirmed transaction to company sales ledger",
    status_code=status.HTTP_201_CREATED,
)
def confirm_transaction(
    body: ConfirmTransactionRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company, membership = _require_company_member(db, current_user)
    ext = body.extraction

    now = _utcnow()
    row = SalesLedger(
        company_id=company.id,
        created_by_user_id=current_user.id,
        transaction_type=ext.transaction_type,
        counterparty_name=ext.counterparty_name,
        item_name=ext.item_name,
        quantity=ext.quantity,
        amount=ext.amount,
        currency=ext.currency or "SAR",
        transaction_date=ext.transaction_date,
        payment_status=ext.payment_status,
        category=ext.category,
        invoice_number=ext.invoice_number,
        notes=ext.notes,
        ai_confirmed_at=now,
        ai_confirmed_by=current_user.id,
    )
    db.add(row)
    db.flush()

    _log_audit(
        db,
        company_id=company.id,
        user_id=current_user.id,
        action="ai_confirm_transaction",
        details={
            "transaction_id": row.id,
            "type": row.transaction_type,
            "amount": row.amount,
            "currency": row.currency,
            "counterparty": row.counterparty_name,
            "role": membership.role,
            "saved_at": now.isoformat(),
        },
    )
    db.commit()
    db.refresh(row)
    logger.info("Transaction confirmed: id=%d company=%d user=%d amount=%s%s",
                row.id, company.id, current_user.id, row.amount, row.currency)

    return ConfirmTransactionResponse(
        transaction_id=row.id,
        company_id=company.id,
        amount=row.amount,
        currency=row.currency,
        transaction_type=row.transaction_type,
        payment_status=row.payment_status,
        saved_at=now.isoformat(),
    )
