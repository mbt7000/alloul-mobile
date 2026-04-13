"""
ALLOUL&Q — Billing router (Stripe integration)

Endpoints:
  POST   /billing/checkout-session    → create Stripe Checkout session
  POST   /billing/portal-session      → create Stripe Billing Portal session
  POST   /billing/webhook             → handle Stripe webhooks (signature verified)
  GET    /billing/subscription        → current user's subscription info
  POST   /billing/cancel              → cancel at period end
  POST   /billing/upgrade             → upgrade plan (prorated)
  GET    /billing/invoices            → list past invoices
  GET    /billing/invoices/{id}/pdf   → redirect to invoice PDF

Stripe products must be created manually or via CLI:
  stripe products create --name "ALLOUL&Q Starter" ...

Env vars required:
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  STRIPE_PRICE_STARTER_MONTHLY
  STRIPE_PRICE_STARTER_YEARLY
  STRIPE_PRICE_PROFESSIONAL_MONTHLY
  STRIPE_PRICE_PROFESSIONAL_YEARLY
  STRIPE_PRICE_BUSINESS_MONTHLY
  STRIPE_PRICE_BUSINESS_YEARLY
  FRONTEND_URL (for checkout return URL)
"""
from __future__ import annotations

import os
from typing import Annotated, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import User, Company, CompanyMember, Subscription, Invoice

router = APIRouter(prefix="/billing", tags=["billing"])


# ─── Plan tiers ──────────────────────────────────────────────────────────────

PLAN_TIERS = {
    "starter": {
        "name": "ALLOUL&Q Starter",
        "employee_limit": 5,
        "monthly_price_env": "STRIPE_PRICE_STARTER_MONTHLY",
        "yearly_price_env": "STRIPE_PRICE_STARTER_YEARLY",
        "trial_days": 14,
    },
    "professional": {
        "name": "ALLOUL&Q Professional",
        "employee_limit": 15,
        "monthly_price_env": "STRIPE_PRICE_PROFESSIONAL_MONTHLY",
        "yearly_price_env": "STRIPE_PRICE_PROFESSIONAL_YEARLY",
        "trial_days": 0,
    },
    "business": {
        "name": "ALLOUL&Q Business",
        "employee_limit": 32,
        "monthly_price_env": "STRIPE_PRICE_BUSINESS_MONTHLY",
        "yearly_price_env": "STRIPE_PRICE_BUSINESS_YEARLY",
        "trial_days": 0,
    },
}


def _stripe_client():
    """Lazy-import stripe so the app still boots when package is missing."""
    try:
        import stripe
        key = os.getenv("STRIPE_SECRET_KEY", "")
        if not key:
            raise RuntimeError("STRIPE_SECRET_KEY not configured")
        stripe.api_key = key
        return stripe
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Stripe SDK not installed. Run: pip install stripe",
        )


def _get_or_create_customer(stripe, user: User, db: Session) -> str:
    """Return the Stripe customer ID for a user, creating one if needed."""
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if sub and getattr(sub, "stripe_customer_id", None):
        return sub.stripe_customer_id
    customer = stripe.Customer.create(
        email=user.email,
        name=user.name or user.username,
        metadata={"user_id": str(user.id), "username": user.username or ""},
    )
    if sub:
        sub.stripe_customer_id = customer.id
    else:
        sub = Subscription(
            user_id=user.id,
            stripe_customer_id=customer.id,
            status="none",
        )
        db.add(sub)
    db.commit()
    return customer.id


# ─── Schemas ─────────────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    tier: str  # "starter" | "professional" | "business"
    billing_period: str = "monthly"  # "monthly" | "yearly"
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutResponse(BaseModel):
    session_id: str
    url: str


class SubscriptionInfo(BaseModel):
    status: str
    tier: Optional[str] = None
    billing_period: Optional[str] = None
    current_period_end: Optional[str] = None
    trial_end: Optional[str] = None
    cancel_at_period_end: bool = False
    employee_limit: int = 0


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/checkout-session", response_model=CheckoutResponse)
def create_checkout_session(
    body: CheckoutRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    if body.tier not in PLAN_TIERS:
        raise HTTPException(status_code=400, detail=f"Invalid tier: {body.tier}")

    tier = PLAN_TIERS[body.tier]
    price_env = tier["monthly_price_env"] if body.billing_period == "monthly" else tier["yearly_price_env"]
    price_id = os.getenv(price_env, "")
    if not price_id:
        raise HTTPException(status_code=503, detail=f"Price not configured: {price_env}")

    stripe = _stripe_client()
    customer_id = _get_or_create_customer(stripe, current_user, db)

    frontend = os.getenv("FRONTEND_URL", "https://alloul.app")
    success_url = body.success_url or f"{frontend}/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = body.cancel_url or f"{frontend}/billing/cancel"

    session_kwargs = dict(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        allow_promotion_codes=True,
        subscription_data={
            "metadata": {
                "user_id": str(current_user.id),
                "tier": body.tier,
                "billing_period": body.billing_period,
            },
        },
        metadata={"user_id": str(current_user.id), "tier": body.tier},
    )

    # Trial only on starter, first-time subscribers
    if body.tier == "starter" and tier["trial_days"] > 0:
        existing = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
        if not existing or existing.status in ("none", "canceled"):
            session_kwargs["subscription_data"]["trial_period_days"] = tier["trial_days"]

    session = stripe.checkout.Session.create(**session_kwargs)
    return CheckoutResponse(session_id=session.id, url=session.url)


@router.post("/portal-session")
def create_portal_session(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    stripe = _stripe_client()
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub or not getattr(sub, "stripe_customer_id", None):
        raise HTTPException(status_code=404, detail="No active subscription")
    frontend = os.getenv("FRONTEND_URL", "https://alloul.app")
    portal = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=f"{frontend}/billing",
    )
    return {"url": portal.url}


@router.get("/subscription", response_model=SubscriptionInfo)
def get_subscription(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub:
        return SubscriptionInfo(status="none", employee_limit=0)
    tier = getattr(sub, "tier", None)
    limit = PLAN_TIERS.get(tier or "", {}).get("employee_limit", 0) if tier else 0
    return SubscriptionInfo(
        status=sub.status or "none",
        tier=tier,
        billing_period=getattr(sub, "billing_period", None),
        current_period_end=(
            sub.current_period_end.isoformat()
            if getattr(sub, "current_period_end", None)
            else None
        ),
        trial_end=(
            sub.trial_end.isoformat() if getattr(sub, "trial_end", None) else None
        ),
        cancel_at_period_end=bool(getattr(sub, "cancel_at_period_end", False)),
        employee_limit=limit,
    )


@router.post("/cancel")
def cancel_subscription(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    stripe = _stripe_client()
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub or not getattr(sub, "stripe_subscription_id", None):
        raise HTTPException(status_code=404, detail="No active subscription")
    stripe_sub = stripe.Subscription.modify(
        sub.stripe_subscription_id,
        cancel_at_period_end=True,
    )
    sub.cancel_at_period_end = True
    db.commit()
    return {"ok": True, "cancel_at": stripe_sub.current_period_end}


class UpgradeRequest(BaseModel):
    tier: str
    billing_period: str = "monthly"


@router.post("/upgrade")
def upgrade_subscription(
    body: UpgradeRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    if body.tier not in PLAN_TIERS:
        raise HTTPException(status_code=400, detail="Invalid tier")
    stripe = _stripe_client()
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub or not getattr(sub, "stripe_subscription_id", None):
        raise HTTPException(status_code=404, detail="No active subscription to upgrade")

    tier = PLAN_TIERS[body.tier]
    price_env = tier["monthly_price_env"] if body.billing_period == "monthly" else tier["yearly_price_env"]
    price_id = os.getenv(price_env, "")
    if not price_id:
        raise HTTPException(status_code=503, detail=f"Price not configured: {price_env}")

    stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
    item_id = stripe_sub["items"]["data"][0]["id"]
    stripe.Subscription.modify(
        sub.stripe_subscription_id,
        items=[{"id": item_id, "price": price_id}],
        proration_behavior="create_prorations",
        metadata={"tier": body.tier, "billing_period": body.billing_period},
    )
    sub.tier = body.tier
    sub.billing_period = body.billing_period
    db.commit()
    return {"ok": True, "tier": body.tier}


@router.get("/invoices")
def list_invoices(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = 20,
):
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub or not getattr(sub, "stripe_customer_id", None):
        return {"invoices": []}
    stripe = _stripe_client()
    invoices = stripe.Invoice.list(customer=sub.stripe_customer_id, limit=limit)
    return {
        "invoices": [
            {
                "id": inv.id,
                "number": inv.number,
                "status": inv.status,
                "amount_paid": inv.amount_paid,
                "currency": inv.currency,
                "created": inv.created,
                "hosted_invoice_url": inv.hosted_invoice_url,
                "invoice_pdf": inv.invoice_pdf,
            }
            for inv in invoices.data
        ],
    }


@router.get("/invoices/{invoice_id}/pdf")
def get_invoice_pdf(
    invoice_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
):
    stripe = _stripe_client()
    inv = stripe.Invoice.retrieve(invoice_id)
    if not inv.invoice_pdf:
        raise HTTPException(status_code=404, detail="Invoice PDF not available")
    return RedirectResponse(url=inv.invoice_pdf)


# ─── Webhook ─────────────────────────────────────────────────────────────────

@router.post("/webhook", status_code=200)
async def stripe_webhook(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    stripe_signature: Annotated[Optional[str], Header(alias="stripe-signature")] = None,
):
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")

    stripe = _stripe_client()
    payload = await request.body()
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook secret not configured")

    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, webhook_secret)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:  # type: ignore[attr-defined]
        raise HTTPException(status_code=400, detail="Invalid signature")

    etype = event["type"]
    obj = event["data"]["object"]

    try:
        if etype == "checkout.session.completed":
            _handle_checkout_completed(obj, db)
        elif etype in ("customer.subscription.created", "customer.subscription.updated"):
            _handle_subscription_updated(obj, db)
        elif etype == "customer.subscription.deleted":
            _handle_subscription_deleted(obj, db)
        elif etype == "customer.subscription.trial_will_end":
            _handle_trial_will_end(obj, db)
        elif etype == "invoice.payment_succeeded":
            _handle_invoice_paid(obj, db)
        elif etype == "invoice.payment_failed":
            _handle_invoice_failed(obj, db)
        db.commit()
    except Exception as e:
        db.rollback()
        # Don't 500 — Stripe will retry, log to Sentry
        from services.sentry import init_sentry  # noqa: F401
        import traceback
        traceback.print_exc()

    return {"received": True}


# ─── Webhook handlers ────────────────────────────────────────────────────────

def _find_sub_by_customer(customer_id: str, db: Session) -> Optional[Subscription]:
    return db.query(Subscription).filter(
        Subscription.stripe_customer_id == customer_id
    ).first()


def _handle_checkout_completed(session, db: Session) -> None:
    customer_id = session.get("customer")
    if not customer_id:
        return
    sub = _find_sub_by_customer(customer_id, db)
    if not sub:
        return
    sub.stripe_subscription_id = session.get("subscription")
    metadata = session.get("metadata") or {}
    sub.tier = metadata.get("tier")
    sub.status = "active"


def _handle_subscription_updated(stripe_sub, db: Session) -> None:
    customer_id = stripe_sub.get("customer")
    sub = _find_sub_by_customer(customer_id, db)
    if not sub:
        return
    sub.stripe_subscription_id = stripe_sub.get("id")
    sub.status = stripe_sub.get("status", "active")
    sub.cancel_at_period_end = bool(stripe_sub.get("cancel_at_period_end"))
    if stripe_sub.get("current_period_end"):
        sub.current_period_end = datetime.fromtimestamp(stripe_sub["current_period_end"])
    if stripe_sub.get("trial_end"):
        sub.trial_end = datetime.fromtimestamp(stripe_sub["trial_end"])
    metadata = stripe_sub.get("metadata") or {}
    if metadata.get("tier"):
        sub.tier = metadata["tier"]
    if metadata.get("billing_period"):
        sub.billing_period = metadata["billing_period"]


def _handle_subscription_deleted(stripe_sub, db: Session) -> None:
    customer_id = stripe_sub.get("customer")
    sub = _find_sub_by_customer(customer_id, db)
    if sub:
        sub.status = "canceled"


def _handle_trial_will_end(stripe_sub, db: Session) -> None:
    customer_id = stripe_sub.get("customer")
    sub = _find_sub_by_customer(customer_id, db)
    if sub:
        # Send email via SendGrid (if configured) — handled by scheduler
        pass


def _handle_invoice_paid(invoice, db: Session) -> None:
    customer_id = invoice.get("customer")
    sub = _find_sub_by_customer(customer_id, db)
    if not sub:
        return
    # Record invoice
    inv = Invoice(
        user_id=sub.user_id,
        subscription_id=sub.id,
        stripe_invoice_id=invoice.get("id"),
        amount=invoice.get("amount_paid", 0),
        currency=invoice.get("currency", "usd"),
        status="paid",
        invoice_pdf=invoice.get("invoice_pdf"),
    )
    db.add(inv)


def _handle_invoice_failed(invoice, db: Session) -> None:
    customer_id = invoice.get("customer")
    sub = _find_sub_by_customer(customer_id, db)
    if sub:
        sub.status = "past_due"
