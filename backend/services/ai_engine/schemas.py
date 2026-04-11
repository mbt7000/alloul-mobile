"""
AI Extraction Output Schemas
=============================
Pydantic v2 models for validated structured output from each parser module.

Rules:
- All fields are Optional so partial extractions are always valid.
- Enum fields are validated and silently corrected to safe defaults.
- These schemas are the contract between the AI engine and the API layer.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, field_validator


# ─── Shared enums ─────────────────────────────────────────────────────────────

VALID_PRIORITIES = {"high", "medium", "low"}
VALID_TASK_STATUSES = {"todo", "in_progress", "done"}
VALID_HANDOVER_STATUSES = {"pending", "in_progress", "submitted", "accepted", "closed"}
VALID_RISK_LEVELS = {"low", "medium", "high", "critical"}
VALID_TX_TYPES = {"income", "expense", "invoice", "payment"}
VALID_PAYMENT_STATUSES = {"pending", "paid", "overdue", "cancelled"}


# ─── Task Extraction ──────────────────────────────────────────────────────────

class TaskExtraction(BaseModel):
    """Structured output from the task parser module."""
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None       # name, resolved to user_id at confirm time
    due_date: Optional[str] = None          # YYYY-MM-DD
    priority: Optional[str] = "medium"
    status: Optional[str] = "todo"
    related_client: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None

    @field_validator("priority", mode="before")
    @classmethod
    def _priority(cls, v: object) -> str:
        s = str(v).lower().strip() if v else ""
        return s if s in VALID_PRIORITIES else "medium"

    @field_validator("status", mode="before")
    @classmethod
    def _status(cls, v: object) -> str:
        s = str(v).lower().strip() if v else ""
        return s if s in VALID_TASK_STATUSES else "todo"


# ─── Handover Extraction ──────────────────────────────────────────────────────

class HandoverExtraction(BaseModel):
    """Structured output from the handover parser module."""
    handover_title: Optional[str] = None
    client_name: Optional[str] = None
    current_status: Optional[str] = "pending"
    from_person: Optional[str] = None
    to_person: Optional[str] = None          # next_owner
    department: Optional[str] = None
    pending_actions: Optional[List[str]] = None
    important_contacts: Optional[List[str]] = None
    referenced_files: Optional[List[str]] = None
    flagged_amount: Optional[float] = None
    currency: Optional[str] = None
    deadline: Optional[str] = None          # YYYY-MM-DD or natural language
    risk_level: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None           # full handover body / detailed notes
    notes: Optional[str] = None

    @field_validator("current_status", mode="before")
    @classmethod
    def _status(cls, v: object) -> str:
        s = str(v).lower().strip() if v else ""
        return s if s in VALID_HANDOVER_STATUSES else "pending"

    @field_validator("risk_level", mode="before")
    @classmethod
    def _risk(cls, v: object) -> Optional[str]:
        if not v:
            return None
        s = str(v).lower().strip()
        return s if s in VALID_RISK_LEVELS else None


# ─── Transaction Extraction ───────────────────────────────────────────────────

class TransactionExtraction(BaseModel):
    """Structured output from the sales/purchase parser module."""
    transaction_type: Optional[str] = "income"
    counterparty_name: Optional[str] = None
    item_name: Optional[str] = None
    quantity: Optional[float] = None
    amount: Optional[float] = None
    currency: Optional[str] = "SAR"
    transaction_date: Optional[str] = None  # YYYY-MM-DD
    payment_status: Optional[str] = "pending"
    category: Optional[str] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("transaction_type", mode="before")
    @classmethod
    def _type(cls, v: object) -> str:
        s = str(v).lower().strip() if v else ""
        return s if s in VALID_TX_TYPES else "income"

    @field_validator("payment_status", mode="before")
    @classmethod
    def _pstatus(cls, v: object) -> str:
        s = str(v).lower().strip() if v else ""
        return s if s in VALID_PAYMENT_STATUSES else "pending"

    @field_validator("amount", mode="before")
    @classmethod
    def _amount(cls, v: object) -> Optional[float]:
        if v is None:
            return None
        try:
            return float(str(v).replace(",", "").strip())
        except (ValueError, TypeError):
            return None


# ─── Note Summary ─────────────────────────────────────────────────────────────

class NoteSummary(BaseModel):
    """Structured output from the note summarizer module."""
    summary: Optional[str] = None
    action_items: Optional[List[str]] = None
    key_entities: Optional[List[str]] = None
    deadlines: Optional[List[str]] = None
    risk_flags: Optional[List[str]] = None


# ─── Wrapper with metadata ────────────────────────────────────────────────────

class ExtractionResult(BaseModel):
    """
    Envelope returned by every extractor function.
    The 'data' field contains the module-specific extraction.
    """
    success: bool
    module: str                          # "task" | "handover" | "transaction" | "note"
    data: dict                           # TaskExtraction.model_dump() etc.
    warnings: List[str] = []
    raw_text: str = ""
    org_id: Optional[int] = None        # always set by the API layer, never by AI
    submitted_by_user_id: Optional[int] = None
