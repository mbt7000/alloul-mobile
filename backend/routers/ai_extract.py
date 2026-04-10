"""
AI Extract Router — Preview-Only Endpoints
==========================================
These endpoints call the local Ollama AI engine and return structured previews.

CRITICAL RULES enforced here:
  ✓ No database writes — these are PREVIEW-ONLY
  ✓ Every request includes org_id (from CompanyMember lookup) for context
  ✓ User context passed to AI prompts (name + company name for relevant extraction)
  ✓ Module isolation — task/handover/transaction/note each handled separately
  ✓ Validation errors return safe fallback, never crash
  ✓ Logging for all failures and malformed outputs

After reviewing the preview, callers should use /ai/confirm-* to save.
"""

from __future__ import annotations

import logging
import time
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Company, CompanyMember, User
from services.ai_engine import (
    engine_health,
    parse_handover,
    parse_task,
    parse_transaction,
    summarize_note,
)

router = APIRouter(prefix="/ai", tags=["ai"])
logger = logging.getLogger("alloul.api.ai_extract")

# ─── Input schema ─────────────────────────────────────────────────────────────

class ParseRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=4000,
                      description="Free-form business text to structure")


# ─── Response schema ──────────────────────────────────────────────────────────

class ParseResponse(BaseModel):
    success: bool
    module: str
    extracted: dict                   # TaskExtraction / HandoverExtraction / etc.
    warnings: List[str] = []
    org_id: Optional[int] = None      # company the user belongs to
    submitted_by_user_id: int = 0
    processing_ms: Optional[int] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_user_context(user: User, company: Company | None) -> dict:
    """
    Build minimal context dict passed to AI prompts.
    Contains only non-sensitive metadata (name, company name).
    Never includes data from other companies.
    """
    return {
        "user_name": user.name or user.username,
        "company_name": company.name if company else None,
    }


def _get_company(db: Session, user: User) -> Company | None:
    """
    Return the company the user belongs to, or None.
    We do not raise here — preview is allowed even without a company membership
    so developers can test the engine directly.
    """
    membership = (
        db.query(CompanyMember)
        .filter(CompanyMember.user_id == user.id)
        .first()
    )
    if not membership:
        return None
    return db.query(Company).filter(Company.id == membership.company_id).first()


def _build_response(result, user: User, company: Company | None, elapsed_ms: int) -> ParseResponse:
    return ParseResponse(
        success=result.success,
        module=result.module,
        extracted=result.data,
        warnings=result.warnings,
        org_id=company.id if company else None,
        submitted_by_user_id=user.id,
        processing_ms=elapsed_ms,
    )


# ─── Health ───────────────────────────────────────────────────────────────────

@router.get(
    "/health",
    summary="Check AI engine (Ollama) health",
    response_model=dict,
)
async def ai_health(
    current_user: Annotated[User, Depends(get_current_user)],
):
    ok = await engine_health()
    return {"ok": ok, "engine": "ollama"}


# ─── Parse Task (preview only) ────────────────────────────────────────────────

@router.post(
    "/parse-task",
    response_model=ParseResponse,
    summary="Extract structured task from free-form text (preview, no save)",
)
async def extract_task(
    body: ParseRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company = _get_company(db, current_user)
    context = _get_user_context(current_user, company)
    logger.info("parse-task user=%d org=%s len=%d", current_user.id,
                company.id if company else "none", len(body.text))
    t0 = time.monotonic()
    result = await parse_task(body.text, context)
    elapsed = int((time.monotonic() - t0) * 1000)
    if not result.success:
        logger.warning("parse-task fallback user=%d warnings=%s", current_user.id, result.warnings)
    return _build_response(result, current_user, company, elapsed)


# ─── Parse Handover (preview only) ────────────────────────────────────────────

@router.post(
    "/parse-handover",
    response_model=ParseResponse,
    summary="Extract structured handover from free-form text (preview, no save)",
)
async def extract_handover(
    body: ParseRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company = _get_company(db, current_user)
    context = _get_user_context(current_user, company)
    logger.info("parse-handover user=%d org=%s len=%d", current_user.id,
                company.id if company else "none", len(body.text))
    t0 = time.monotonic()
    result = await parse_handover(body.text, context)
    elapsed = int((time.monotonic() - t0) * 1000)
    if not result.success:
        logger.warning("parse-handover fallback user=%d warnings=%s", current_user.id, result.warnings)
    return _build_response(result, current_user, company, elapsed)


# ─── Parse Transaction (preview only) ────────────────────────────────────────

@router.post(
    "/parse-transaction",
    response_model=ParseResponse,
    summary="Extract structured sales/purchase record from free-form text (preview, no save)",
)
async def extract_transaction(
    body: ParseRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company = _get_company(db, current_user)
    context = _get_user_context(current_user, company)
    logger.info("parse-transaction user=%d org=%s len=%d", current_user.id,
                company.id if company else "none", len(body.text))
    t0 = time.monotonic()
    result = await parse_transaction(body.text, context)
    elapsed = int((time.monotonic() - t0) * 1000)
    if not result.success:
        logger.warning("parse-transaction fallback user=%d warnings=%s", current_user.id, result.warnings)
    return _build_response(result, current_user, company, elapsed)


# ─── Summarize Note (preview only) ───────────────────────────────────────────

@router.post(
    "/summarize-note",
    response_model=ParseResponse,
    summary="Summarize operational note and extract signals (preview, no save)",
)
async def extract_note_summary(
    body: ParseRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company = _get_company(db, current_user)
    context = _get_user_context(current_user, company)
    logger.info("summarize-note user=%d org=%s len=%d", current_user.id,
                company.id if company else "none", len(body.text))
    t0 = time.monotonic()
    result = await summarize_note(body.text, context)
    elapsed = int((time.monotonic() - t0) * 1000)
    if not result.success:
        logger.warning("summarize-note fallback user=%d warnings=%s", current_user.id, result.warnings)
    return _build_response(result, current_user, company, elapsed)
