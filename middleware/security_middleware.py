from __future__ import annotations

import logging
import time
import uuid
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("indicare.security")

SENSITIVE_PREFIXES = (
    "/auth",
    "/mfa",
    "/passkeys",
    "/young-people",
    "/assistant",
    "/os",
    "/staff",
    "/admin",
    "/billing",
    "/reports",
    "/documents",
)

SKIP_PATHS = (
    "/health",
    "/css",
    "/js",
    "/assets",
    "/favicon.ico",
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        # Care OS intentionally embeds first-party modules inside the same-origin app shell.
        # DENY breaks the operating-system layout; SAMEORIGIN keeps third-party framing blocked.
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers.setdefault("Content-Security-Policy", "frame-ancestors 'self'")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()")
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")
        response.headers.setdefault("Cache-Control", "no-store")

        if request.url.scheme == "https":
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")

        return response


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        if path.startswith(SKIP_PATHS):
            return await call_next(request)

        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        start = time.perf_counter()
        response: Response | None = None

        try:
            response = await call_next(request)
            return response
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            status_code = getattr(response, "status_code", 500)

            if path.startswith(SENSITIVE_PREFIXES) or status_code >= 400:
                logger.info(
                    "audit_event request_id=%s method=%s path=%s status=%s duration_ms=%s ip=%s user_agent=%s",
                    request_id,
                    request.method,
                    path,
                    status_code,
                    duration_ms,
                    request.client.host if request.client else None,
                    request.headers.get("user-agent", ""),
                )

            if response is not None:
                response.headers.setdefault("X-Request-ID", request_id)
