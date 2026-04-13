"""
ALLOUL&Q — Sentry backend initialization.
Safe no-op when SENTRY_DSN is not configured.
"""
from __future__ import annotations
import os


_initialized = False


def init_sentry() -> None:
    """Initialize Sentry SDK for FastAPI + SQLAlchemy integrations."""
    global _initialized
    if _initialized:
        return
    dsn = os.getenv("SENTRY_DSN", "").strip()
    if not dsn:
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
        import logging

        env = os.getenv("ENVIRONMENT", "production")
        release = os.getenv("APP_RELEASE", "alloul-q-backend@1.0.0")

        sentry_sdk.init(
            dsn=dsn,
            environment=env,
            release=release,
            traces_sample_rate=0.2 if env == "production" else 1.0,
            profiles_sample_rate=0.1 if env == "production" else 0.5,
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
                LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
            ],
            send_default_pii=False,
            before_send=_scrub_pii,
        )
        _initialized = True
    except Exception as e:
        # Never let Sentry init crash the app
        print(f"[Sentry] init failed: {e}")


def _scrub_pii(event, hint):
    """Remove Authorization headers from captured events."""
    try:
        headers = event.get("request", {}).get("headers", {})
        if "Authorization" in headers:
            headers["Authorization"] = "[redacted]"
        if "authorization" in headers:
            headers["authorization"] = "[redacted]"
    except Exception:
        pass
    return event
