"""
Settings Router — API endpoints for managing integrations and configurations.
"""
from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import User, CompanyMember, APICredential
from services.settings_service import get_settings_service
from services.credential_encryption import get_encryptor
from schemas_settings import (
    IntegrationStatus,
    IntegrationCredential,
    TestConnectionRequest,
    TestConnectionResponse,
    SettingsResponse,
    PlatformConfig,
)

router = APIRouter(prefix="/settings", tags=["settings"])


def _get_user_company_id(
    db: Session,
    user: User,
) -> int:
    """Get company_id for current user. Raise 403 if not in a company."""
    member = db.query(CompanyMember).filter(CompanyMember.user_id == user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a company member")
    return member.company_id


# ─── Integrations ────────────────────────────────────────────────────────────

@router.get("/integrations", response_model=SettingsResponse)
def get_integrations(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get all integrations and their status for the user's company."""
    company_id = _get_user_company_id(db, current_user)
    service = get_settings_service()

    integrations = service.get_company_integrations(db, company_id)
    available_platforms = service.get_available_platforms()

    return SettingsResponse(
        integrations=integrations,
        configured_count=sum(1 for i in integrations if i.is_configured),
        available_platforms=available_platforms,
    )


@router.get("/integrations/{platform_id}", response_model=PlatformConfig)
def get_integration_config(
    platform_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get configuration details for a specific platform."""
    _get_user_company_id(db, current_user)  # Validate membership
    service = get_settings_service()

    config = service.get_platform_config(platform_id)
    if not config:
        raise HTTPException(status_code=404, detail="Platform not found")
    return config


@router.post("/integrations/{platform_id}", response_model=IntegrationCredential)
def save_integration(
    platform_id: str,
    body: IntegrationCredential,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Save or update credentials for a platform integration."""
    company_id = _get_user_company_id(db, current_user)
    service = get_settings_service()

    # Validate platform exists
    if not service.get_platform_config(platform_id):
        raise HTTPException(status_code=404, detail="Platform not found")

    # Require at least an API key
    if not body.api_key and not body.custom_params:
        raise HTTPException(
            status_code=400,
            detail="API key or custom parameters required",
        )

    credential = service.save_integration_credential(
        db=db,
        company_id=company_id,
        platform_id=platform_id,
        api_key=body.api_key,
        api_secret=body.api_secret,
        custom_params=body.custom_params,
    )

    # Mask sensitive data in response
    encryptor = get_encryptor()
    return IntegrationCredential(
        platform_id=credential.platform_id,
        api_key=encryptor.mask_key(credential.api_key) if credential.api_key else None,
        api_secret=encryptor.mask_key(credential.api_secret) if credential.api_secret else None,
        custom_params=credential.custom_params,
        is_active=credential.is_active,
        last_tested_at=credential.last_tested_at,
        last_error=credential.last_error,
    )


@router.delete("/integrations/{platform_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_integration(
    platform_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Delete integration credentials for a platform."""
    company_id = _get_user_company_id(db, current_user)
    service = get_settings_service()

    service.remove_integration(db, company_id, platform_id)


@router.post("/integrations/{platform_id}/deactivate", status_code=status.HTTP_200_OK)
def deactivate_integration(
    platform_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Deactivate (disable) an integration without deleting it."""
    company_id = _get_user_company_id(db, current_user)
    service = get_settings_service()

    success = service.deactivate_integration(db, company_id, platform_id)
    if not success:
        raise HTTPException(status_code=404, detail="Integration not found")

    return {"status": "deactivated", "platform_id": platform_id}


# ─── Connection Testing ───────────────────────────────────────────────────────

@router.post("/integrations/{platform_id}/test", response_model=TestConnectionResponse)
async def test_connection(
    platform_id: str,
    body: TestConnectionRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Test a platform connection (dry run)."""
    _get_user_company_id(db, current_user)  # Validate membership
    service = get_settings_service()

    result = await service.test_connection(
        platform_id=platform_id,
        api_key=body.api_key,
        custom_params=body.custom_params,
    )

    return TestConnectionResponse(
        success=result.get("success", False),
        platform_id=platform_id,
        message=result.get("message", "Unknown error"),
        status="available" if result.get("success") else "unavailable",
    )


# ─── Settings Summary ─────────────────────────────────────────────────────────

@router.get("/summary")
def get_settings_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get a summary of all settings and integrations."""
    company_id = _get_user_company_id(db, current_user)
    service = get_settings_service()

    integrations = service.get_company_integrations(db, company_id)
    configured = [i for i in integrations if i.is_configured]
    active = [i for i in configured if i.is_active]

    return {
        "total_platforms": len(integrations),
        "configured": len(configured),
        "active": len(active),
        "unconfigured": len(integrations) - len(configured),
        "integrations": integrations,
    }
