"""
Plan feature limits and gating helpers for Alloul One.

Plans:
  starter  ($24/mo) — up to 5 members, limited projects/meetings, no CRM/AI
  pro      ($59/mo) — up to 21 members, full workspace, CRM, AI assistant
  pro_plus ($289/mo)— up to 33 members, everything + priority AI
  admin               — internal bypass (no limits)
"""
from __future__ import annotations

from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session


# ─── Feature matrix ──────────────────────────────────────────────────────────

PLAN_FEATURES: dict[str, dict] = {
    "starter": {
        "max_employees":  5,
        "max_projects":   3,
        "max_meetings":   10,
        "max_tasks":      30,
        "crm":            False,
        "ai_chat":        False,
        "ai_analyze":     False,
        "meetings":       True,
    },
    "pro": {
        "max_employees":  21,
        "max_projects":   None,  # unlimited
        "max_meetings":   None,
        "max_tasks":      None,
        "crm":            True,
        "ai_chat":        True,
        "ai_analyze":     True,
        "meetings":       True,
    },
    "pro_plus": {
        "max_employees":  33,
        "max_projects":   None,
        "max_meetings":   None,
        "max_tasks":      None,
        "crm":            True,
        "ai_chat":        True,
        "ai_analyze":     True,
        "meetings":       True,
    },
    # Internal admin bypass — all features, no limits
    "admin": {
        "max_employees":  None,
        "max_projects":   None,
        "max_meetings":   None,
        "max_tasks":      None,
        "crm":            True,
        "ai_chat":        True,
        "ai_analyze":     True,
        "meetings":       True,
    },
}

PLAN_DISPLAY = {
    "starter":  "المبتدئ",
    "pro":      "الاحترافي",
    "pro_plus": "الاحترافي المتقدم",
    "admin":    "المدير",
}

# Pricing (USD/month)
PLAN_PRICING = {
    "starter":  24,
    "pro":      59,
    "pro_plus": 289,
}

UPGRADE_MESSAGES = {
    "crm":         "CRM والصفقات متاحة في خطة Pro فأعلى. رقّ خطتك للوصول.",
    "ai_chat":     "المساعد الذكي متاح في خطة Pro فأعلى. رقّ خطتك للوصول.",
    "ai_analyze":  "تحليل الذكاء الاصطناعي متاح في خطة Pro فأعلى. رقّ خطتك للوصول.",
    "max_projects": "وصلت للحد الأقصى من المشاريع في خطتك الحالية. رقّ لـ Pro للمزيد.",
    "max_meetings": "وصلت للحد الأقصى من الاجتماعات في خطتك الحالية. رقّ لـ Pro للمزيد.",
    "max_tasks":    "وصلت للحد الأقصى من المهام في خطتك الحالية. رقّ لـ Pro للمزيد.",
}


def _get_plan(db: Session, company_id: int) -> str:
    """Return the active plan_id for a company, or None if no subscription."""
    from models import Subscription
    sub = (
        db.query(Subscription)
        .filter(Subscription.company_id == company_id)
        .order_by(Subscription.id.desc())
        .first()
    )
    if sub and sub.status in ("active", "trialing"):
        return sub.plan_id
    return None  # type: ignore[return-value]


def get_plan_features(db: Session, company_id: int) -> dict:
    """Return the feature dict for the company's active plan."""
    plan_id = _get_plan(db, company_id)
    # No subscription → treat as starter (graceful degradation)
    return PLAN_FEATURES.get(plan_id or "starter", PLAN_FEATURES["starter"])


def require_feature(
    db: Session,
    company_id: int,
    feature: str,
    *,
    is_admin: bool = False,
) -> None:
    """Raise HTTP 402 if the company's plan doesn't include `feature`."""
    if is_admin:
        return
    feats = get_plan_features(db, company_id)
    if not feats.get(feature, False):
        msg = UPGRADE_MESSAGES.get(feature, f"الميزة '{feature}' غير متاحة في خطتك الحالية.")
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=msg,
        )


def check_limit(
    db: Session,
    company_id: int,
    limit_key: str,
    current_count: int,
    *,
    is_admin: bool = False,
) -> None:
    """Raise HTTP 402 if current_count >= plan limit (None = unlimited)."""
    if is_admin:
        return
    feats = get_plan_features(db, company_id)
    limit = feats.get(limit_key)
    if limit is not None and current_count >= limit:
        msg = UPGRADE_MESSAGES.get(limit_key, f"وصلت للحد الأقصى ({limit}) في خطتك الحالية.")
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=msg,
        )


def get_plan_info(db: Session, company_id: int) -> dict:
    """Return plan summary for API responses."""
    plan_id = _get_plan(db, company_id)
    feats = PLAN_FEATURES.get(plan_id or "starter", PLAN_FEATURES["starter"])
    return {
        "plan_id": plan_id or "none",
        "plan_name": PLAN_DISPLAY.get(plan_id or "", "Pas de forfait"),
        "features": feats,
    }
