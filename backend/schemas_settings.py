"""
Settings schemas for integrations and API configuration.
"""
from __future__ import annotations

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class PlatformStatus(str, Enum):
    """Status of a platform integration."""
    AVAILABLE = "available"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"
    UNCONFIGURED = "unconfigured"


class IntegrationCredential(BaseModel):
    """Credentials for a single platform integration."""
    platform_id: str                           # e.g., "openai", "slack", "gmail"
    api_key: Optional[str] = None              # Encrypted
    api_secret: Optional[str] = None           # Encrypted
    custom_params: Dict[str, Any] = {}
    is_active: bool = True
    last_tested_at: Optional[str] = None
    last_error: Optional[str] = None


class IntegrationStatus(BaseModel):
    """Current status of an integration."""
    platform_id: str
    status: PlatformStatus
    is_configured: bool
    is_active: bool
    error_message: Optional[str] = None


class PlatformConfig(BaseModel):
    """Configuration for a platform."""
    id: str
    name: str
    category: str                              # ai, communication, crm, calendar, payments
    description: str
    requires_api_key: bool = True
    requires_api_secret: bool = False
    custom_fields: List[str] = []              # e.g., ["subdomain", "region"]
    priority: int = 0


class SettingsResponse(BaseModel):
    """Response for settings queries."""
    integrations: List[IntegrationStatus]
    configured_count: int
    available_platforms: List[PlatformConfig]


class TestConnectionRequest(BaseModel):
    """Request to test a platform connection."""
    platform_id: str
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    custom_params: Dict[str, Any] = {}


class TestConnectionResponse(BaseModel):
    """Response from testing a connection."""
    success: bool
    platform_id: str
    message: str
    status: PlatformStatus
