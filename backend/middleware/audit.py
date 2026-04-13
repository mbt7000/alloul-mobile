"""
ALLOUL&Q — Audit logging middleware.
Logs every API request for compliance (GDPR/PDPL).
"""
from __future__ import annotations

import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

log = logging.getLogger("alloul.audit")

# Endpoints to skip (healthchecks, static, websockets)
SKIP_PREFIXES = ("/health", "/docs", "/openapi", "/static", "/ws/")


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        if any(path.startswith(p) for p in SKIP_PREFIXES):
            return await call_next(request)

        start = time.perf_counter()
        response: Response = await call_next(request)
        duration_ms = int((time.perf_counter() - start) * 1000)

        # Minimal structured log (Sentry will pick up errors separately)
        log.info(
            "audit",
            extra={
                "method": request.method,
                "path": path,
                "status": response.status_code,
                "duration_ms": duration_ms,
                "ip": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent", "")[:80],
            },
        )
        return response
