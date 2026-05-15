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

from auth.errors import auth_error_detail
from auth.tokens import decode_session_token
from routers.auth_routes import settings as auth_settings
from services.audit_event_service import record_audit_event
from services.operational_metrics_service import operational_metrics_service
from services.safe_logging import safe_log_dict

logger = logging.getLogger("indicare.security")

SENSITIVE_PREFIXES = (
    "/auth",
    "/mfa",
    "/passkeys",
    "/young-people",
    "/assistant",
    "/orb",
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


def _safe_actor_from_request(request: Request) -> dict:
    token = (request.cookies.get(auth_settings.session_cookie_name) or "").strip()
    if not token:
        auth = request.headers.get("authorization") or ""
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
    payload = decode_session_token(token) if token else None
    if not payload:
        return {}
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        return {}
    return {"id": user_id}


class CsrfProtectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        if request.method.upper() not in UNSAFE_METHODS:
            return await call_next(request)
        if any(path.startswith(prefix) for prefix in CSRF_EXEMPT_PREFIXES):
            return await call_next(request)

        expected = str(request.session.get("csrf_token") or "")
        cookie_token = str(request.cookies.get(auth_settings.csrf_cookie_name) or "")
        supplied = str(request.headers.get("x-csrf-token") or "")
        if supplied and cookie_token and secrets.compare_digest(supplied, cookie_token):
            if not expected:
                request.session["csrf_token"] = cookie_token
            return await call_next(request)
        if not expected or not supplied or not secrets.compare_digest(expected, supplied):
            logger.warning(
                "csrf_blocked method=%s path=%s ip=%s",
                request.method,
                path,
                request.client.host if request.client else None,
            )
            record_audit_event(
                event_type="security.csrf_blocked",
                action="csrf_blocked",
                outcome="blocked",
                request=request,
                actor=_safe_actor_from_request(request),
                metadata={"path": path, "method": request.method},
            )
            return JSONResponse(
                status_code=403,
                content={"detail": auth_error_detail("csrf_invalid", "Invalid CSRF token")},
            )

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
            "script-src 'self' 'unsafe-inline'; connect-src 'self' https://api.openai.com wss://api.openai.com",
        )
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()")
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
            should_audit = path.startswith(SENSITIVE_PREFIXES) or status_code >= 400
            if path.startswith(SENSITIVE_PREFIXES) or duration_ms >= 1000:
                operational_metrics_service.observe_latency(
                    "http.request",
                    duration_ms,
                    dimensions={"path": path, "method": request.method, "status_code": status_code},
                    request_id=request_id,
                )

            if should_audit:
                log = logger.debug if status_code in {401, 403} else logger.info
                log(
                    "audit_event request_id=%s method=%s path=%s status=%s duration_ms=%s ip=%s user_agent=%s",
                    request_id,
                    request.method,
                    path,
                    status_code,
                    duration_ms,
                    request.client.host if request.client else None,
                    safe_log_dict({"user_agent": request.headers.get("user-agent", "")}).get("user_agent", ""),
                )
                record_audit_event(
                    event_type="http.request",
                    action=f"{request.method} {path}",
                    outcome="success" if status_code < 400 else "failure",
                    request=request,
                    actor=_safe_actor_from_request(request),
                    resource_type="http_path",
                    resource_id=path,
                    metadata={"status_code": status_code, "duration_ms": duration_ms},
                )

            if response is not None:
                response.headers.setdefault("X-Request-ID", request_id)
