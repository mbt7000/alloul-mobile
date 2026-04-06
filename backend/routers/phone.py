from __future__ import annotations

import secrets
from datetime import datetime, timezone, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from config import settings
from models import User, OtpCode
from schemas import PhoneRequest, OtpVerifyRequest, PhoneResponse

router = APIRouter(prefix="/phone", tags=["phone"])


def _generate_otp() -> str:
    """Generate a cryptographically secure 6-digit OTP code."""
    return f"{secrets.randbelow(900000) + 100000}"


def _send_sms(phone: str, code: str) -> None:
    """Send OTP via Twilio Verify API. No-op if Twilio is not configured."""
    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_VERIFY_SERVICE_SID):
        return
    from twilio.rest import Client  # type: ignore

    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    client.verify.v2.services(settings.TWILIO_VERIFY_SERVICE_SID).verifications.create(
        to=phone,
        channel="sms",
        custom_code=code,
    )


@router.post("/send-otp", response_model=PhoneResponse)
def send_otp(
    body: PhoneRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    phone = body.phone.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")

    # Rate limit: max 3 active (unexpired, unverified) codes per phone in the last 10 minutes
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
    recent_count = (
        db.query(OtpCode)
        .filter(
            OtpCode.phone == phone,
            OtpCode.created_at >= cutoff,
            OtpCode.verified == False,  # noqa: E712
        )
        .count()
    )
    if recent_count >= 3:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Please try again later.")

    code = _generate_otp()
    otp = OtpCode(
        phone=phone,
        code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db.add(otp)
    db.commit()

    # Send SMS via Twilio (if configured)
    twilio_configured = bool(
        settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_VERIFY_SERVICE_SID
    )
    try:
        _send_sms(phone, code)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to send SMS. Please try again later.")

    if twilio_configured:
        return PhoneResponse(success=True, message="OTP sent successfully")
    else:
        # Dev mode: return code in response for testing
        return PhoneResponse(success=True, message=f"OTP code (dev mode): {code}")


@router.post("/verify-otp", response_model=PhoneResponse)
def verify_otp(
    body: OtpVerifyRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    phone = body.phone.strip()
    code = body.code.strip()

    if not phone or not code:
        raise HTTPException(status_code=400, detail="Phone and code are required")

    # Find the most recent unverified OTP for this phone
    otp = (
        db.query(OtpCode)
        .filter(
            OtpCode.phone == phone,
            OtpCode.verified == False,  # noqa: E712
        )
        .order_by(OtpCode.created_at.desc())
        .first()
    )

    if not otp:
        raise HTTPException(status_code=400, detail="No OTP found for this phone number")

    # Check max attempts
    if otp.attempts >= 5:
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new code.")

    # Increment attempts
    otp.attempts = (otp.attempts or 0) + 1
    db.flush()

    # Check expiry
    now = datetime.now(timezone.utc)
    expires = otp.expires_at.replace(tzinfo=timezone.utc) if otp.expires_at.tzinfo is None else otp.expires_at
    if now > expires:
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new code.")

    # Check code
    if otp.code != code:
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    # Mark as verified and update user phone
    otp.verified = True
    current_user.phone = phone
    db.commit()

    return PhoneResponse(success=True, message="Phone number verified successfully")


@router.get("/status", response_model=PhoneResponse)
def phone_status(
    current_user: Annotated[User, Depends(get_current_user)],
):
    has_phone = bool(current_user.phone)
    return PhoneResponse(
        success=has_phone,
        message="Phone number is verified" if has_phone else "No phone number on file",
    )
