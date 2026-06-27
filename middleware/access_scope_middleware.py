from __future__ import annotations

import logging
import re
from typing import Any, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from auth.errors import auth_error_detail
from auth.sensitive_assistant_gate import (
    build_sensitive_assistant_gate_response,
    evaluate_sensitive_assistant_gate,
    is_sensitive_assistant_gated_path,
)
from auth.tokens import decode_session_token
from routers.auth_routes import settings as auth_settings
from db.connection import get_db_connection, release_db_connection

logger = logging.getLogger("indicare.access_scope")

CHILD_PATTERNS = (
    re.compile(r"^/young-people/(?P<young_person_id>\d+)(?:/|$)"),
    re.compile(r"^/visibility/young-people/(?P<young_person_id>\d+)(?:/|$)"),
    re.compile(r"^/assistant/os/context/(?P<young_person_id>\d+)(?:/|$)"),
)

HOME_PATTERNS = (
    re.compile(r"^/homes/(?P<home_id>\d+)(?:/|$)"),
    re.compile(r"^/home/(?P<home_id>\d+)(?:/|$)"),
)

PROVIDER_PATTERNS = (
    re.compile(r"^/providers/(?P<provider_id>\d+)(?:/|$)"),
    re.compile(r"^/provider/(?P<provider_id>\d+)(?:/|$)"),
)

PUBLIC_PREFIXES = (
    "/",
    "/health",
    "/security/status",
    "/security/alerts",
    "/auth",
    "/login",
    "/login.html",
    "/oslogin",
    "/oslogin.html",
    "/mfa",
    "/mfa.html",
    "/mfa-setup",
    "/mfa-setup.html",
    "/mfa-recovery",
    "/mfa-recovery.html",
    "/access-denied",
    "/access-denied.html",
    "/forgot-password",
    "/privacy",
    "/support",
    "/terms",
    "/css",
    "/js",
    "/assets",
    "/components",
    "/favicon.ico",
)

SENSITIVE_PREFIXES = (
    "/my-profile",
    "/staff-profile.html",
    "/young-people",
    "/childrens-home-os",
    "/visibility/young-people",
    "/assistant",
    "/assistant/os",
    "/os/intelligence",
    "/reports",
    "/documents",
    "/documents-hub",
    "/exports",
    "/safeguarding-hub",
    "/academy",
    "/quality-hub",
    "/os-dashboard",
    "/staff-dashboard",
    "/manager-dashboard",
    "/ri-dashboard",
    "/provider-dashboard",
    "/rostering",
    "/staff-profiles",
    "/admin-users",
    "/founder-hq",
    "/tasks",
    "/admissions",
    "/command-centre",
    "/automation",
    "/notifications",
)

ADMIN_ROLES = {"admin", "administrator", "super_admin", "superadmin", "founder", "owner"}
PROVIDER_ROLES = ADMIN_ROLES | {"provider", "provider_admin", "director", "responsible_individual", "ri", "regional_manager"}
MANAGER_ROLES = PROVIDER_ROLES | {"registered_manager", "manager", "deputy_manager", "home_manager"}
STAFF_ROLES = MANAGER_ROLES | {"staff", "support_worker", "key_worker", "senior", "senior_staff"}

ROLE_PROTECTED_PREFIXES: tuple[tuple[str, set[str]], ...] = (
    ("/admin-users", PROVIDER_ROLES),
    ("/founder-hq", PROVIDER_ROLES),
    ("/admin", PROVIDER_ROLES),
    ("/founder", PROVIDER_ROLES),
    ("/quality-hub", MANAGER_ROLES),
    ("/os-dashboard", MANAGER_ROLES),
    ("/staff-dashboard", MANAGER_ROLES),
    ("/manager-dashboard", MANAGER_ROLES),
    ("/ri-dashboard", MANAGER_ROLES),
    ("/provider-dashboard", MANAGER_ROLES),
    ("/rostering", MANAGER_ROLES),
    ("/staff-profiles", MANAGER_ROLES),
    ("/qa", MANAGER_ROLES),
    ("/exports", MANAGER_ROLES),
    ("/command-centre", STAFF_ROLES),
    ("/tasks", STAFF_ROLES),
    ("/notifications", STAFF_ROLES),
    ("/admissions", MANAGER_ROLES),
    ("/automation", MANAGER_ROLES),
)


def _safe_int(value: Any) -> int | None:
    try:
        parsed = int(value)
        return parsed if parsed > 0 else None
    except Exception:
        return None


def _normalise_role(value: Any) -> str:
    return str(value or "").strip().lower()


def _public_path(path: str) -> bool:
    if path == "/":
        return True
    return any(path.startswith(prefix) for prefix in PUBLIC_PREFIXES if prefix != "/")


def _extract_token(request: Request) -> str | None:
    cookie_token = (request.cookies.get(auth_settings.session_cookie_name) or "").strip()
    if cookie_token:
        return cookie_token
    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return None


def _load_user(user_id: int) -> dict[str, Any] | None:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, email, role, home_id, provider_id, is_active, archived
                FROM users
                WHERE id = %s
                LIMIT 1
            """, (user_id,))
            row = cur.fetchone()
            if not row:
                return None
            if isinstance(row, dict):
                return dict(row)
            columns = [column[0] for column in cur.description or []]
            return {columns[index]: value for index, value in enumerate(row) if index < len(columns)}
    finally:
        if conn is not None:
            release_db_connection(conn)


def _current_user_from_request(request: Request) -> dict[str, Any] | None:
    token = _extract_token(request)
    if not token:
        return None
    payload = decode_session_token(token)
    if not payload:
        return None
    user_id = _safe_int(payload.get("sub"))
    if not user_id:
        return None
    user = _load_user(user_id)
    if not user or user.get("archived") is True or user.get("is_active") is False:
        return None
    return user


def _allowed_home_ids(user: dict[str, Any]) -> set[int]:
    home_id = _safe_int(user.get("home_id"))
    return {home_id} if home_id else set()


def _child_home_provider(young_person_id: int) -> tuple[int | None, int | None]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            for table in ("young_people", "children", "young_persons"):
                try:
                    cur.execute(f'SELECT home_id, provider_id FROM public."{table}" WHERE id = %s LIMIT 1', (young_person_id,))
                    row = cur.fetchone()
                    if row:
                        if isinstance(row, dict):
                            return _safe_int(row.get("home_id")), _safe_int(row.get("provider_id"))
                        return _safe_int(row[0]), _safe_int(row[1] if len(row) > 1 else None)
                except Exception:
                    continue
    finally:
        if conn is not None:
            release_db_connection(conn)
    return None, None


def _matching_role_protection(path: str) -> tuple[str, set[str]] | None:
    for prefix, allowed_roles in ROLE_PROTECTED_PREFIXES:
        if path == prefix or path.startswith(f"{prefix}/") or path.startswith(f"{prefix}."):
            return prefix, allowed_roles
    return None


def _deny(request: Request, user: dict[str, Any] | None, reason: str, resource: str, resource_id: Any) -> JSONResponse:
    logger.warning(
        "access_denied reason=%s user_id=%s role=%s resource=%s resource_id=%s path=%s ip=%s",
        reason,
        user.get("id") if user else None,
        _normalise_role(user.get("role") if user else None),
        resource,
        resource_id,
        request.url.path,
        request.client.host if request.client else None,
    )
    return JSONResponse(
        status_code=403,
        content={"detail": auth_error_detail("access_denied", "Access denied", reason=reason)},
    )


def _log_sensitive(request: Request, user: dict[str, Any], resource: str, resource_id: Any) -> None:
    logger.info(
        "sensitive_access user_id=%s role=%s resource=%s resource_id=%s path=%s ip=%s",
        user.get("id"),
        _normalise_role(user.get("role")),
        resource,
        resource_id,
        request.url.path,
        request.client.host if request.client else None,
    )


class AccessScopeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        if request.method == "OPTIONS" or _public_path(path):
            return await call_next(request)

        needs_user = path.startswith(SENSITIVE_PREFIXES)
        matched_resource: tuple[str, int] | None = None
        role_protection = _matching_role_protection(path)
        if role_protection:
            needs_user = True

        for pattern in CHILD_PATTERNS:
            match = pattern.match(path)
            if match:
                matched_resource = ("child", int(match.group("young_person_id")))
                needs_user = True
                break

        if not matched_resource:
            for pattern in HOME_PATTERNS:
                match = pattern.match(path)
                if match:
                    matched_resource = ("home", int(match.group("home_id")))
                    needs_user = True
                    break

        if not matched_resource:
            for pattern in PROVIDER_PATTERNS:
                match = pattern.match(path)
                if match:
                    matched_resource = ("provider", int(match.group("provider_id")))
                    needs_user = True
                    break

        if not needs_user:
            return await call_next(request)

        user = _current_user_from_request(request)
        if not user:
            return JSONResponse(
                status_code=401,
                content={"detail": auth_error_detail("not_authenticated", "Not authenticated")},
            )

        role = _normalise_role(user.get("role"))
        user_home_id = _safe_int(user.get("home_id"))
        user_provider_id = _safe_int(user.get("provider_id"))

        if role_protection:
            protected_prefix, allowed_roles = role_protection
            if role not in allowed_roles:
                return _deny(request, user, "role_not_allowed", protected_prefix, role)
            _log_sensitive(request, user, "role_area", protected_prefix)

        if matched_resource:
            resource, resource_id = matched_resource
            if resource == "child":
                child_home_id, child_provider_id = _child_home_provider(resource_id)
                if role not in PROVIDER_ROLES and child_home_id not in _allowed_home_ids(user):
                    return _deny(request, user, "child_home_mismatch", resource, resource_id)
                if role in PROVIDER_ROLES and child_provider_id and user_provider_id and child_provider_id != user_provider_id and role not in ADMIN_ROLES:
                    return _deny(request, user, "child_provider_mismatch", resource, resource_id)
                _log_sensitive(request, user, resource, resource_id)
            if resource == "home":
                if role not in PROVIDER_ROLES and resource_id != user_home_id:
                    return _deny(request, user, "home_mismatch", resource, resource_id)
                _log_sensitive(request, user, resource, resource_id)
            if resource == "provider":
                if role not in ADMIN_ROLES and resource_id != user_provider_id:
                    return _deny(request, user, "provider_mismatch", resource, resource_id)
                _log_sensitive(request, user, resource, resource_id)

        if is_sensitive_assistant_gated_path(path, request.method):
            gate_block = evaluate_sensitive_assistant_gate(request, user)
            if gate_block is not None:
                return build_sensitive_assistant_gate_response(request, gate_block)

        return await call_next(request)
