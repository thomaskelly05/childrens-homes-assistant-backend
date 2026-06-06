from __future__ import annotations

import logging
import os
import secrets
import time
import uuid
from typing import Callable
from urllib.parse import urlparse

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
    "/orb/standalone/auth/signup",
    "/orb/standalone/analytics/event",
    "/orb/standalone/billing/webhook",
    "/orb/standalone/auth/oauth/",
)

TRUSTED_ORIGIN_ORB_BOOTSTRAP_PATHS = (
    "/orb/realtime/session",
    "/orb/session/start",
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


def _is_probe_path(path: str) -> bool:
    return path.lower().startswith("/.env")


def _is_public_cross_origin_asset(path: str) -> bool:
    """Assets are intentionally read by the separate Next.js frontend domain.

    The backend and frontend are hosted on different Render origins in production.
    A global `Cross-Origin-Resource-Policy: same-origin` blocks images such as
    `/assets/uploads/young_people/young_person_1.png` when they are embedded by
    the frontend. Static UI assets are public/read-only, so they can safely be
    marked cross-origin while sensitive API routes stay same-origin/no-store.
    """

    return path.startswith(("/assets", "/css", "/js", "/components")) or path == "/favicon.ico"


def _normalise_origin(value: str | None) -> str:
    if not value:
        return ""
    parsed = urlparse(value.strip())
    if not parsed.scheme or not parsed.netloc:
        return ""
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"


def _trusted_frontend_origins(request: Request) -> set[str]:
    origins = {
        _normalise_origin(os.getenv("FRONTEND_APP_URL")),
        _normalise_origin(os.getenv("APP_BASE_URL")),
        _normalise_origin(os.getenv("NEXT_PUBLIC_APP_URL")),
        _normalise_origin(str(request.base_url)),
    }
    extra = os.getenv("TRUSTED_FRONTEND_ORIGINS", "")
    for origin in extra.split(","):
        origins.add(_normalise_origin(origin))
    return {origin for origin in origins if origin}


def _request_origin(request: Request) -> str:
    return _normalise_origin(request.headers.get("origin") or request.headers.get("referer"))


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


def _has_authenticated_session(request: Request) -> bool:
    return bool(_safe_actor_from_request(request))


def _trusted_orb_bootstrap_request(request: Request) -> bool:
    path = request.url.path
    if request.method.upper() != "POST":
        return False
    if path not in TRUSTED_ORIGIN_ORB_BOOTSTRAP_PATHS:
        return False
    if not _has_authenticated_session(request):
        return False
    origin = _request_origin(request)
    if not origin:
        return False
    return origin in _trusted_frontend_origins(request)


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
        if expected and supplied and secrets.compare_digest(expected, supplied):
            return await call_next(request)
        if _trusted_orb_bootstrap_request(request):
            record_audit_event(
                event_type="security.csrf_trusted_orb_bootstrap",
                action="csrf_trusted_orb_bootstrap",
                outcome="allowed",
                request=request,
                actor=_safe_actor_from_request(request),
                metadata={"path": path, "method": request.method, "origin": _request_origin(request)},
            )
            return await call_next(request)

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
            content={
                "detail": "csrf_failed",
                "message": "Session security check failed. Please refresh and try again.",
            },
        )


def _csp_mode() -> str:
    return os.getenv("ORB_CSP_MODE", "report-only").strip().lower()


def _build_content_security_policy() -> str:
    report_uri = os.getenv("ORB_CSP_REPORT_URI", "").strip()
    directives = [
        "default-src 'self'",
        "base-uri 'self'",
        "frame-ancestors 'self'",
        "object-src 'none'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self' 'unsafe-inline'",
        (
            "connect-src 'self' https://api.openai.com wss://api.openai.com "
            "https://api.stripe.com https://checkout.stripe.com https://billing.stripe.com"
        ),
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
        "form-action 'self'",
    ]
    if report_uri:
        directives.append(f"report-uri {report_uri}")
    return "; ".join(directives) + ";"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        if _is_probe_path(path):
            return Response(status_code=404)

        response = await call_next(request)

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        csp_value = _build_content_security_policy()
        csp_header = (
            "Content-Security-Policy-Report-Only"
            if _csp_mode() == "report-only"
            else "Content-Security-Policy"
        )
        response.headers.setdefault(csp_header, csp_value)
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()")
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")

        if _is_public_cross_origin_asset(path):
            response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"
            origin = request.headers.get("origin")
            if origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers.setdefault("Vary", "Origin")
        else:
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
        if _is_probe_path(path):
            return Response(status_code=404)
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
