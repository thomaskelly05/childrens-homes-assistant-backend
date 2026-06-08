from __future__ import annotations

import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from auth.orb_residential_dependencies import (
    is_orb_residential_only_user,
    is_orb_residential_scoped_request,
)
from auth.tokens import decode_session_token
from routers.auth_routes import settings as auth_settings
from services.orb_runtime_guard_service import orb_runtime_guard_service

logger = logging.getLogger("indicare.orb_residential_guard")

PUBLIC_PREFIXES = (
    "/health",
    "/auth",
    "/login",
    "/billing",
    "/orb/residential/health",
    "/orb/residential/product",
    "/orb/standalone/access",
    "/orb/standalone/auth/signup",
    "/orb/standalone/analytics/event",
    "/orb/standalone/billing/webhook",
    "/orb/subscription/webhook",
    "/orb/standalone/auth/oauth",
    "/orb/login",
    "/orb/signup",
    "/orb/access",
    "/orb/onboarding",
    "/orb/billing",
    "/legal",
    "/terms",
    "/privacy",
)

OS_ADMIN_ROLES = {
    "admin",
    "founder",
    "owner",
    "super_admin",
    "superadmin",
    "provider_admin",
}


def _session_user(request: Request) -> dict | None:
    token = (request.cookies.get(auth_settings.session_cookie_name) or "").strip()
    if not token:
        auth = request.headers.get("authorization") or ""
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
    if not token:
        return None
    payload = decode_session_token(token)
    if not payload:
        return None
    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        return None
    role = str(payload.get("role") or "").strip().lower()
    permissions = payload.get("permissions") if isinstance(payload.get("permissions"), list) else []
    return {
        "user_id": int(user_id),
        "role": role,
        "permissions": permissions,
    }


class OrbResidentialGuardMiddleware(BaseHTTPMiddleware):
    """Block operational routes for ORB Residential scoped sessions.

    Important: do not infer that a session is ORB Residential-only when the JWT
    lacks a role claim. Older/admin sessions may omit role in the token even
    though the database user has OS access. In that case, let the normal OS auth
    and RBAC layers decide access instead of blocking at this middleware layer.
    """

    async def dispatch(self, request: Request, call_next):
        path = str(request.url.path or "")
        lower = path.lower()

        if any(lower.startswith(prefix) for prefix in PUBLIC_PREFIXES):
            return await call_next(request)

        scoped_request = is_orb_residential_scoped_request(request)
        user = _session_user(request)
        role = str((user or {}).get("role") or "").strip().lower()

        if role in OS_ADMIN_ROLES:
            return await call_next(request)

        # Only infer residential-only status when the session explicitly carries
        # a role/permissions payload. Unknown-role sessions should not be blocked
        # here because the downstream OS auth/RBAC layer has the database-backed
        # truth and will enforce OS access safely.
        has_session_scope_claims = bool(role or (user or {}).get("permissions"))
        residential_only = bool(
            user
            and has_session_scope_claims
            and is_orb_residential_only_user(user)
        )

        if not scoped_request and not residential_only:
            return await call_next(request)

        guard = orb_runtime_guard_service.check_route_access(route=path, surface="orb_residential")
        if not guard.allowed:
            logger.info(
                "orb_residential_guard blocked path=%s reason=%s role=%s scoped_request=%s residential_only=%s",
                path,
                guard.reason,
                role or "unknown",
                scoped_request,
                residential_only,
            )
            return JSONResponse(
                status_code=403,
                content=orb_runtime_guard_service.build_boundary_response(),
            )

        return await call_next(request)
