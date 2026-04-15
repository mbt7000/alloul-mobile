"""
Settings Service — manages integrations and API credentials.
"""
from __future__ import annotations

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from models import APICredential, Company
from services.platform_registry import get_registry, Platform
from services.credential_encryption import get_encryptor
from schemas_settings import (
    IntegrationCredential,
    IntegrationStatus,
    PlatformConfig,
    PlatformStatus,
)


class SettingsService:
    """
    Manages company settings and integrations.
    """

    def __init__(self):
        self.registry = get_registry()

    def get_available_platforms(self) -> List[PlatformConfig]:
        """Get list of all available platforms."""
        result = []
        for platform in self.registry.get_platforms():
            result.append(
                PlatformConfig(
                    id=platform.id,
                    name=platform.name,
                    category=platform.category,
                    description=platform.description,
                    priority=platform.priority,
                )
            )
        return result

    def get_platform_config(self, platform_id: str) -> Optional[PlatformConfig]:
        """Get configuration for a specific platform."""
        platform = self.registry.get_platform(platform_id)
        if not platform:
            return None
        return PlatformConfig(
            id=platform.id,
            name=platform.name,
            category=platform.category,
            description=platform.description,
            priority=platform.priority,
        )

    def get_company_integrations(
        self,
        db: Session,
        company_id: int,
    ) -> List[IntegrationStatus]:
        """Get status of all integrations for a company."""
        credentials = db.query(APICredential).filter(
            APICredential.company_id == company_id
        ).all()

        result = []
        cred_dict = {c.platform_id: c for c in credentials}

        # Check all platforms
        for platform in self.registry.get_platforms():
            cred = cred_dict.get(platform.id)
            is_configured = cred is not None and bool(cred.api_key or cred.custom_params)

            status = IntegrationStatus(
                platform_id=platform.id,
                status=PlatformStatus.AVAILABLE if is_configured else PlatformStatus.UNCONFIGURED,
                is_configured=is_configured,
                is_active=cred.is_active if cred else False,
                error_message=cred.last_error if cred else None,
            )
            result.append(status)

        return result

    def get_integration_credential(
        self,
        db: Session,
        company_id: int,
        platform_id: str,
    ) -> Optional[IntegrationCredential]:
        """Get credentials for a specific integration."""
        cred = db.query(APICredential).filter(
            APICredential.company_id == company_id,
            APICredential.platform_id == platform_id,
        ).first()

        if not cred:
            return None

        encryptor = get_encryptor()
        return IntegrationCredential(
            platform_id=cred.platform_id,
            api_key=encryptor.decrypt(cred.api_key) if cred.api_key else None,
            api_secret=encryptor.decrypt(cred.api_secret) if cred.api_secret else None,
            custom_params=cred.custom_params or {},
            is_active=cred.is_active,
            last_tested_at=cred.last_tested_at.isoformat() if cred.last_tested_at else None,
            last_error=cred.last_error,
        )

    def save_integration_credential(
        self,
        db: Session,
        company_id: int,
        platform_id: str,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        custom_params: Optional[Dict[str, Any]] = None,
    ) -> IntegrationCredential:
        """Save or update credentials for a platform integration."""
        cred = db.query(APICredential).filter(
            APICredential.company_id == company_id,
            APICredential.platform_id == platform_id,
        ).first()

        if not cred:
            cred = APICredential(
                company_id=company_id,
                platform_id=platform_id,
            )
            db.add(cred)

        encryptor = get_encryptor()
        if api_key is not None:
            cred.api_key = encryptor.encrypt(api_key)
        if api_secret is not None:
            cred.api_secret = encryptor.encrypt(api_secret)
        if custom_params is not None:
            cred.custom_params = custom_params
        cred.is_active = True

        db.commit()
        db.refresh(cred)

        return IntegrationCredential(
            platform_id=cred.platform_id,
            api_key=api_key,  # Return unencrypted to client
            api_secret=api_secret,  # Return unencrypted to client
            custom_params=cred.custom_params or {},
            is_active=cred.is_active,
        )

    def remove_integration(
        self,
        db: Session,
        company_id: int,
        platform_id: str,
    ) -> bool:
        """Remove integration for a platform."""
        cred = db.query(APICredential).filter(
            APICredential.company_id == company_id,
            APICredential.platform_id == platform_id,
        ).first()

        if cred:
            db.delete(cred)
            db.commit()
            return True
        return False

    def deactivate_integration(
        self,
        db: Session,
        company_id: int,
        platform_id: str,
    ) -> bool:
        """Deactivate (disable) an integration without deleting it."""
        cred = db.query(APICredential).filter(
            APICredential.company_id == company_id,
            APICredential.platform_id == platform_id,
        ).first()

        if cred:
            cred.is_active = False
            db.commit()
            return True
        return False

    async def test_connection(
        self,
        platform_id: str,
        api_key: Optional[str] = None,
        custom_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Test a platform connection (dry run)."""
        # In real implementation, would make a test API call
        platform = self.registry.get_platform(platform_id)
        if not platform:
            return {
                "success": False,
                "message": f"Platform {platform_id} not found",
            }

        # For now, just validate that minimal credentials exist
        if not api_key:
            return {
                "success": False,
                "message": "API key is required",
            }

        # Mock test (in real impl, would call platform API)
        return {
            "success": True,
            "message": f"Connected to {platform.name}",
            "platform_id": platform_id,
        }


# Singleton instance
_settings_service: Optional[SettingsService] = None


def get_settings_service() -> SettingsService:
    """Get or create the global settings service."""
    global _settings_service
    if _settings_service is None:
        _settings_service = SettingsService()
    return _settings_service
