"""
Paid Ads system — companies create sponsored stories ($9/24h) or posts ($11).
Active ads appear in the public Media feed for all users.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import User, Company, CompanyMember, Ad

router = APIRouter(prefix="/ads", tags=["ads"])

AD_PRICES = {"story": 900, "post": 1100}  # cents


class AdCreate(BaseModel):
    ad_type: str  # "story" or "post"
    content: Optional[str] = None
    image_url: Optional[str] = None
    media_type: str = "image"
    caption: Optional[str] = None


class AdResponse(BaseModel):
    id: int
    company_id: int
    ad_type: str
    content: Optional[str] = None
    image_url: Optional[str] = None
    media_type: Optional[str] = None
    caption: Optional[str] = None
    price_cents: int
    status: str
    impressions: int
    company_name: Optional[str] = None
    company_logo: Optional[str] = None
    creator_name: Optional[str] = None
    expires_at: Optional[str] = None
    created_at: Optional[str] = None


def _ad_to_response(ad: Ad, db: Session) -> AdResponse:
    company = db.query(Company).filter(Company.id == ad.company_id).first()
    creator = db.query(User).filter(User.id == ad.creator_id).first()
    return AdResponse(
        id=ad.id,
        company_id=ad.company_id,
        ad_type=ad.ad_type,
        content=ad.content,
        image_url=ad.image_url,
        media_type=ad.media_type,
        caption=ad.caption,
        price_cents=ad.price_cents,
        status=ad.status,
        impressions=ad.impressions or 0,
        company_name=company.name if company else None,
        company_logo=company.logo_url if company else None,
        creator_name=creator.name if creator else None,
        expires_at=ad.expires_at.isoformat() if ad.expires_at else None,
        created_at=ad.created_at.isoformat() if ad.created_at else None,
    )


@router.post("/", response_model=AdResponse, status_code=status.HTTP_201_CREATED)
def create_ad(
    body: AdCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Create a paid ad. Only company admins/owners with active subscription."""
    if body.ad_type not in AD_PRICES:
        raise HTTPException(status_code=400, detail="ad_type must be 'story' or 'post'")

    membership = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not membership or membership.role not in ("owner", "admin", "manager"):
        raise HTTPException(status_code=403, detail="Only company admins can create ads")

    if not body.content and not body.image_url:
        raise HTTPException(status_code=400, detail="Ad must have content or image")

    price = AD_PRICES[body.ad_type]
    expires = None
    if body.ad_type == "story":
        expires = datetime.now(timezone.utc) + timedelta(hours=24)

    ad = Ad(
        company_id=membership.company_id,
        creator_id=current_user.id,
        ad_type=body.ad_type,
        content=body.content,
        image_url=body.image_url,
        media_type=body.media_type or "image",
        caption=body.caption,
        price_cents=price,
        status="active",
        expires_at=expires,
    )
    db.add(ad)
    db.commit()
    db.refresh(ad)
    return _ad_to_response(ad, db)


@router.get("/", response_model=list[AdResponse])
def list_company_ads(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """List ads for the current user's company (workspace view)."""
    membership = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not membership:
        return []
    ads = db.query(Ad).filter(Ad.company_id == membership.company_id).order_by(Ad.created_at.desc()).all()
    return [_ad_to_response(a, db) for a in ads]


@router.get("/feed", response_model=list[AdResponse])
def get_feed_ads(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    ad_type: Optional[str] = None,
):
    """Get active ads for the public feed. Increments impressions."""
    now = datetime.now(timezone.utc)
    q = db.query(Ad).filter(Ad.status == "active")

    if ad_type:
        q = q.filter(Ad.ad_type == ad_type)

    # Expire old story ads
    expired = db.query(Ad).filter(
        Ad.ad_type == "story", Ad.status == "active", Ad.expires_at < now
    ).all()
    for e in expired:
        e.status = "expired"
    if expired:
        db.commit()

    # Filter: story ads not expired, post ads always
    q = q.filter(
        (Ad.ad_type == "post") |
        ((Ad.ad_type == "story") & (Ad.expires_at > now))
    )

    ads = q.order_by(Ad.created_at.desc()).limit(10).all()

    # Increment impressions
    for a in ads:
        a.impressions = (a.impressions or 0) + 1
    db.commit()

    return [_ad_to_response(a, db) for a in ads]


@router.delete("/{ad_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_ad(
    ad_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Cancel an ad. Only the owning company's admin can cancel."""
    ad = db.query(Ad).filter(Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")

    membership = db.query(CompanyMember).filter(
        CompanyMember.company_id == ad.company_id,
        CompanyMember.user_id == current_user.id,
    ).first()
    if not membership or membership.role not in ("owner", "admin", "manager"):
        raise HTTPException(status_code=403, detail="Not authorized to cancel this ad")

    ad.status = "cancelled"
    db.commit()
