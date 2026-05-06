from __future__ import annotations

import logging
import os
import secrets
import time
import uuid
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

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
    "/exports",
    "/security",
)

CSRF_EXEMPT_PREFIXES = (
    "/auth/login",
    "/auth/logout",
    "/auth/check",
    "/auth/passkeys/authenticate/options",
    "/auth/passkeys/authenticate/verify",
    "/health",
)

SKIP_PATHS = (
    "/health",
    "/css",
    "/js",
    "/assets",
    "/components",
    "/favicon.ico",
)

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _is_static_path(path: str) -> bool:
    return path.startswith(("/css", "/js", "/assets", "/components")) or path == "/favicon.ico"


class CsrfProtectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        if request.method.upper() not in UNSAFE_METHODS:
            return await call_next(request)
        if any(path.startswith(prefix) for prefix in CSRF_EXEMPT_PREFIXES):
            return await call_next(request)

        expected = str(request.session.get("csrf_token") or "")
        supplied = str(request.headers.get("x-csrf-token") or "")
        if not expected or not supplied or not secrets.compare_digest(expected, supplied):
            logger.warning(
                "csrf_blocked method=%s path=%s ip=%s",
                request.method,
                path,
                request.client.host if request.client else None,
            )
            return JSONResponse(status_code=403, content={"detail": "Invalid CSRF token"})

        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        path = request.url.path

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'; "
            "img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; "
            "script-src 'self' 'unsafe-inline'; connect-src 'self'",
        )
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()")
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")

        if _is_static_path(path):
            response.headers.setdefault("Cache-Control", "public, max-age=3600")
        else:
            response.headers.setdefault("Cache-Control", "no-store")
            response.headers.setdefault("Pragma", "no-cache")

        if request.url.scheme == "https" or os.getenv("FORCE_HSTS", "true").lower() == "true":
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")

        return response


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        if path.startswith(SKIP_PATHS):
            return await call_next(request)

        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = request_id
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
