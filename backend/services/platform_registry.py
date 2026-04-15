"""
Platform Registry — Unified management of all external platform integrations.

This module maintains a centralized registry of all platforms (AI providers,
communication services, CRM, calendar, etc.) that the system can integrate with.
Each platform has:
  - Credentials (encrypted in database)
  - Configuration (endpoints, rate limits)
  - Status (available/unavailable)
  - Health checks
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Dict, Any

from config import settings


class PlatformStatus(Enum):
    """Health status of a platform."""
    AVAILABLE = "available"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"
    UNCONFIGURED = "unconfigured"


@dataclass
class PlatformCredentials:
    """Credentials for a platform integration."""
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    base_url: Optional[str] = None
    custom_params: Dict[str, Any] = field(default_factory=dict)

    def is_configured(self) -> bool:
        """Check if minimum credentials are present."""
        return bool(self.api_key or (self.base_url and self.custom_params))


@dataclass
class Platform:
    """Definition of an external platform."""
    id: str                                    # Unique identifier (e.g., "openai", "deepseek")
    name: str                                  # Display name
    category: str                              # Category (ai, communication, crm, calendar, etc)
    description: str                           # What it does
    credentials: PlatformCredentials           # Auth info
    rate_limit: int = 100                      # Requests per minute
    timeout: int = 30                          # Timeout in seconds
    priority: int = 0                          # Higher = preferred in fallback chain
    status: PlatformStatus = PlatformStatus.UNCONFIGURED

    def health_check(self) -> bool:
        """Quick validation of platform readiness."""
        if not self.credentials.is_configured():
            self.status = PlatformStatus.UNCONFIGURED
            return False
        # In production, also validate connectivity
        self.status = PlatformStatus.AVAILABLE
        return True


class PlatformRegistry:
    """
    Central registry of all platform integrations.

    Usage:
        registry = PlatformRegistry()
        ai_providers = registry.get_platforms(category="ai")
        openai = registry.get_platform("openai")
        openai.health_check()
    """

    def __init__(self):
        self._platforms: Dict[str, Platform] = {}
        self._initialize_platforms()

    def _initialize_platforms(self) -> None:
        """Load all platform definitions from config."""

        # ──── AI Providers ────────────────────────────────────────────────────

        # Claude (Anthropic)
        self._platforms["claude"] = Platform(
            id="claude",
            name="Claude (Anthropic)",
            category="ai",
            description="Claude AI by Anthropic - reasoning, analysis, content generation",
            credentials=PlatformCredentials(
                api_key=settings.ANTHROPIC_API_KEY,
                base_url="https://api.anthropic.com",
            ),
            priority=10,  # First choice for private data
        )

        # DeepSeek (OpenAI-compatible)
        self._platforms["deepseek"] = Platform(
            id="deepseek",
            name="DeepSeek",
            category="ai",
            description="DeepSeek LLM via OpenAI-compatible API - strong on Arabic/Chinese",
            credentials=PlatformCredentials(
                api_key=settings.DEEPSEEK_API_KEY,
                base_url=settings.DEEPSEEK_BASE_URL,
                custom_params={"model": settings.DEEPSEEK_MODEL},
            ),
            priority=8,  # Fallback to Claude
        )

        # Ollama (Local)
        self._platforms["ollama"] = Platform(
            id="ollama",
            name="Ollama (Local)",
            category="ai",
            description="Local LLM via Ollama - fully private, no internet required",
            credentials=PlatformCredentials(
                base_url=settings.OLLAMA_BASE_URL,
                custom_params={"model": settings.OLLAMA_MODEL},
            ),
            priority=12,  # Highest priority for private data
            timeout=settings.OLLAMA_TIMEOUT,
        )

        # Hugging Face
        self._platforms["huggingface"] = Platform(
            id="huggingface",
            name="Hugging Face",
            category="ai",
            description="HF Inference API - embeddings, text generation",
            credentials=PlatformCredentials(
                api_key=settings.HF_API_TOKEN,
                base_url="https://api-inference.huggingface.co",
            ),
            priority=5,
        )

        # ──── Communication Platforms ─────────────────────────────────────────

        # Daily.co (Video)
        self._platforms["daily"] = Platform(
            id="daily",
            name="Daily.co",
            category="communication",
            description="Video conferencing + in-session chat for companies",
            credentials=PlatformCredentials(
                api_key=settings.DAILY_API_KEY,
                custom_params={"subdomain": settings.DAILY_SUBDOMAIN},
            ),
            priority=10,
        )

        # ──── CRM & Business Tools (Stubs for future integration) ────────────

        self._platforms["slack"] = Platform(
            id="slack",
            name="Slack",
            category="communication",
            description="Team messaging and notifications",
            credentials=PlatformCredentials(),
            priority=8,
        )

        self._platforms["gmail"] = Platform(
            id="gmail",
            name="Gmail",
            category="communication",
            description="Email service",
            credentials=PlatformCredentials(),
            priority=8,
        )

        self._platforms["google_calendar"] = Platform(
            id="google_calendar",
            name="Google Calendar",
            category="calendar",
            description="Calendar sync and scheduling",
            credentials=PlatformCredentials(),
            priority=7,
        )

        self._platforms["salesforce"] = Platform(
            id="salesforce",
            name="Salesforce",
            category="crm",
            description="CRM system for deals and customer data",
            credentials=PlatformCredentials(),
            priority=9,
        )

        self._platforms["hubspot"] = Platform(
            id="hubspot",
            name="HubSpot",
            category="crm",
            description="HubSpot CRM",
            credentials=PlatformCredentials(),
            priority=8,
        )

        # ──── Stripe (Payments) ───────────────────────────────────────────────

        self._platforms["stripe"] = Platform(
            id="stripe",
            name="Stripe",
            category="payments",
            description="Payment processing",
            credentials=PlatformCredentials(
                api_key=settings.STRIPE_SECRET_KEY,
                base_url="https://api.stripe.com",
            ),
            priority=10,
        )

    def get_platform(self, platform_id: str) -> Optional[Platform]:
        """Get a single platform by ID."""
        return self._platforms.get(platform_id)

    def get_platforms(self, category: Optional[str] = None) -> list[Platform]:
        """
        Get all platforms, optionally filtered by category.
        Sorted by priority (highest first).
        """
        platforms = list(self._platforms.values())
        if category:
            platforms = [p for p in platforms if p.category == category]
        return sorted(platforms, key=lambda p: p.priority, reverse=True)

    def get_configured_platforms(self, category: Optional[str] = None) -> list[Platform]:
        """Get only configured (has credentials) platforms."""
        platforms = self.get_platforms(category)
        return [p for p in platforms if p.credentials.is_configured()]

    def health_check_all(self) -> Dict[str, bool]:
        """Check health of all platforms. Returns {platform_id: is_healthy}."""
        results = {}
        for platform_id, platform in self._platforms.items():
            results[platform_id] = platform.health_check()
        return results

    def register_platform(self, platform: Platform) -> None:
        """Register a new platform (for custom integrations)."""
        self._platforms[platform.id] = platform

    def update_credentials(self, platform_id: str, credentials: PlatformCredentials) -> bool:
        """Update credentials for a platform. Returns True if successful."""
        if platform_id not in self._platforms:
            return False
        self._platforms[platform_id].credentials = credentials
        self._platforms[platform_id].status = PlatformStatus.UNCONFIGURED  # Reset status
        return True


# Global singleton registry
_registry: Optional[PlatformRegistry] = None


def get_registry() -> PlatformRegistry:
    """Get or create the global platform registry."""
    global _registry
    if _registry is None:
        _registry = PlatformRegistry()
    return _registry


def get_platform(platform_id: str) -> Optional[Platform]:
    """Convenience function to get a platform from the global registry."""
    return get_registry().get_platform(platform_id)


def get_platforms(category: Optional[str] = None) -> list[Platform]:
    """Convenience function to get platforms from the global registry."""
    return get_registry().get_platforms(category)
