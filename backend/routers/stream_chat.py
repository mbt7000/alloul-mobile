"""
Stream (getstream.io) — Chat & Video Calling for subscribed companies.
Generates user tokens so the frontend SDK can connect directly to Stream.
"""
from __future__ import annotations

import os
import time
import hashlib
import hmac
import json
import base64
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import User, CompanyMember

router = APIRouter(prefix="/stream", tags=["stream"])

STREAM_API_KEY = os.environ.get("STREAM_API_KEY", "")
STREAM_API_SECRET = os.environ.get("STREAM_API_SECRET", "")


def _generate_stream_token(user_id: str) -> str:
    """Generate a Stream user token (JWT) signed with the API secret."""
    if not STREAM_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stream not configured",
        )
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).rstrip(b"=").decode()
    payload_data = {"user_id": user_id, "iat": int(time.time()), "exp": int(time.time()) + 3600 * 24}
    payload = base64.urlsafe_b64encode(json.dumps(payload_data).encode()).rstrip(b"=").decode()
    signature = base64.urlsafe_b64encode(
        hmac.new(STREAM_API_SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    ).rstrip(b"=").decode()
    return f"{header}.{payload}.{signature}"


class StreamCredentialsResponse(BaseModel):
    api_key: str
    user_id: str
    user_token: str
    user_name: str
    user_image: Optional[str] = None


@router.get("/credentials", response_model=StreamCredentialsResponse)
def get_stream_credentials(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Get Stream credentials. Only available to company members."""
    membership = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Stream is available for company members only. Subscribe to access.",
        )
    if not STREAM_API_KEY or not STREAM_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stream not configured on server",
        )
    user_id = f"user_{current_user.id}"
    token = _generate_stream_token(user_id)
    return StreamCredentialsResponse(
        api_key=STREAM_API_KEY,
        user_id=user_id,
        user_token=token,
        user_name=current_user.name or current_user.username,
        user_image=current_user.avatar_url,
    )
