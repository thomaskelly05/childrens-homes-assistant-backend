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
    "/legal",
    "/terms",
    "/privacy",
)


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
    return {"user_id": int(user_id), "role": payload.get("role")}


class OrbResidentialGuardMiddleware(BaseHTTPMiddleware):
    """Block operational routes for ORB Residential scoped sessions."""

    async def dispatch(self, request: Request, call_next):
        path = str(request.url.path or "")
        lower = path.lower()

        if any(lower.startswith(prefix) for prefix in PUBLIC_PREFIXES):
            return await call_next(request)

        scoped_request = is_orb_residential_scoped_request(request)
        user = _session_user(request)
        residential_only = bool(user and is_orb_residential_only_user(user))

        if not scoped_request and not residential_only:
            return await call_next(request)

        guard = orb_runtime_guard_service.check_route_access(route=path, surface="orb_residential")
        if not guard.allowed:
            logger.info(
                "orb_residential_guard blocked path=%s reason=%s",
                path,
                guard.reason,
            )
            return JSONResponse(
                status_code=403,
                content=orb_runtime_guard_service.build_boundary_response(),
            )

        return await call_next(request)
