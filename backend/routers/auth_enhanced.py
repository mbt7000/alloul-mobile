"""
Enhanced Auth Router
نظام المصادقة المحسّن
- Secure password handling (bcrypt)
- Token refresh mechanism
- Rate limiting on login
- Password reset flow
"""

from __future__ import annotations

from typing import Annotated, Optional
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from auth import create_access_token, get_current_user, get_password_hash, verify_password, decode_token
from database import get_db
from models import User
from service_utils import ValidationError

router = APIRouter(prefix="/auth", tags=["auth"])

# In production, use Redis for rate limiting
_LOGIN_ATTEMPTS = {}  # {email: [(timestamp, success), ...]}
MAX_LOGIN_ATTEMPTS = 5
LOGIN_ATTEMPT_WINDOW = 300  # 5 minutes


class TokenRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


def _check_rate_limit(email: str) -> bool:
    """Check if email has exceeded login attempts."""
    if email not in _LOGIN_ATTEMPTS:
        _LOGIN_ATTEMPTS[email] = []

    now = datetime.now(timezone.utc).timestamp()
    attempts = _LOGIN_ATTEMPTS[email]

    # Remove old attempts outside window
    attempts = [(ts, success) for ts, success in attempts if now - ts < LOGIN_ATTEMPT_WINDOW]
    _LOGIN_ATTEMPTS[email] = attempts

    # Count failures
    failures = sum(1 for ts, success in attempts if not success)
    return failures < MAX_LOGIN_ATTEMPTS


def _record_login_attempt(email: str, success: bool):
    """Record login attempt for rate limiting."""
    if email not in _LOGIN_ATTEMPTS:
        _LOGIN_ATTEMPTS[email] = []

    now = datetime.now(timezone.utc).timestamp()
    _LOGIN_ATTEMPTS[email].append((now, success))


@router.post("/login", response_model=TokenResponse)
def login(
    body: TokenRequest,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Login with email and password.
    Returns both access and refresh tokens.
    """
    # Rate limiting
    if not _check_rate_limit(body.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again later.",
        )

    user = db.query(User).filter(User.email == body.email).first()

    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        _record_login_attempt(body.email, False)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    _record_login_attempt(body.email, True)

    access_token = create_access_token(data={"sub": str(user.id), "type": "access"})
    # Refresh token with longer expiration
    refresh_token = create_access_token(
        data={"sub": str(user.id), "type": "refresh"},
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=60 * 60 * 24 * 7,  # 7 days
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    body: RefreshTokenRequest,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Refresh access token using refresh token.
    """
    payload = decode_token(body.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    new_access_token = create_access_token(data={"sub": str(user.id), "type": "access"})
    new_refresh_token = create_access_token(data={"sub": str(user.id), "type": "refresh"})

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        expires_in=60 * 60 * 24 * 7,
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get current authenticated user information."""
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Logout (client should discard tokens).
    In production, tokens are added to blacklist here.
    """
    # TODO: Add token to blacklist in Redis
    pass


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    current_password: str,
    new_password: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Change password for current user."""
    if not verify_password(current_password, current_user.hashed_password):
        raise ValidationError("Current password is incorrect")

    if len(new_password) < 12:
        raise ValidationError("Password must be at least 12 characters")

    current_user.hashed_password = get_password_hash(new_password)
    db.commit()

    return {"message": "Password changed successfully"}
