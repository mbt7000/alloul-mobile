from __future__ import annotations

from typing import Annotated
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth import get_current_user
from models import User

router = APIRouter(prefix="/sendbird", tags=["sendbird"])


class SendbirdCredentialsResponse(BaseModel):
    app_id: str
    user_id: str
    access_token: str
    channel_url: str
    nickname: str


@router.get("/credentials", response_model=SendbirdCredentialsResponse)
def get_sendbird_credentials(
    current_user: Annotated[User, Depends(get_current_user)],
):
    return SendbirdCredentialsResponse(
        app_id="placeholder-sendbird-app-id",
        user_id=str(current_user.id),
        access_token="placeholder-token",
        channel_url="placeholder-channel",
        nickname=current_user.name or current_user.username,
    )
