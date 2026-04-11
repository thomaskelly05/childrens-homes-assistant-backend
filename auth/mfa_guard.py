from __future__ import annotations

from fastapi import Request
from fastapi.responses import RedirectResponse
from starlette.responses import JSONResponse

from db.mfa_db import get_user_mfa

PUBLIC_PATH_PREFIXES = (
    "/login",
    "/login.html",
    "/mfa",
    "/mfa.html",
    "/mfa-setup",
    "/mfa-setup.html",
    "/mfa-recovery",
    "/mfa-recovery.html",
    "/favicon",
    "/assets",
    "/frontend",
    "/css",
    "/js",
    "/static",
    "/openapi",
    "/docs",
    "/redoc",
    "/health",
)

PUBLIC_EXACT_PATHS = {
    "/",
}

MFA_ALLOWED_PATH_PREFIXES = (
    "/auth/login",
    "/auth/logout",
    "/auth/mfa",
)

SESSION_USER_ID_KEY = "user_id"
SESSION_USER_EMAIL_KEY = "user_email"
SESSION_MFA_VERIFIED_KEY = "mfa_verified"

PREAUTH_USER_ID_KEY = "preauth_user_id"
PREAUTH_EMAIL_KEY = "preauth_email"
PREAUTH_STARTED_AT_KEY = "preauth_started_at"
PREAUTH_REMEMBER_KEY = "preauth_remember"
PREAUTH_PENDING_KEY = "preauth_pending"


def path_is_public(path: str) -> bool:
    if path in PUBLIC_EXACT_PATHS:
        return True
    return any(path.startswith(prefix) for prefix in PUBLIC_PATH_PREFIXES)


def path_allowed_during_mfa(path: str) -> bool:
    return any(path.startswith(prefix) for prefix in MFA_ALLOWED_PATH_PREFIXES)


def get_session_user_id(request: Request) -> int | None:
    try:
        value = request.session.get(SESSION_USER_ID_KEY)
    except Exception:
        return None

    try:
        return int(value) if value is not None else None
    except Exception:
        return None


def get_session_user_email(request: Request) -> str | None:
    try:
        value = request.session.get(SESSION_USER_EMAIL_KEY)
        return str(value) if value else None
    except Exception:
        return None


def is_mfa_verified_in_session(request: Request) -> bool:
    try:
        return request.session.get(SESSION_MFA_VERIFIED_KEY) is True
    except Exception:
        return False


def set_mfa_verified_in_session(request: Request, verified: bool) -> None:
    request.session[SESSION_MFA_VERIFIED_KEY] = bool(verified)


def clear_auth_session(request: Request) -> None:
    try:
        request.session.pop(SESSION_MFA_VERIFIED_KEY, None)
        request.session.pop(SESSION_USER_ID_KEY, None)
        request.session.pop(SESSION_USER_EMAIL_KEY, None)
    except Exception:
        pass


def user_has_enabled_mfa(user_id: int) -> bool:
    row = get_user_mfa(user_id)
    return bool(row and bool(row.get("is_enabled")))


def wants_html(request: Request) -> bool:
    accept = (request.headers.get("accept") or "").lower()
    return "text/html" in accept


def is_preauth_pending(request: Request) -> bool:
    try:
        return request.session.get(PREAUTH_PENDING_KEY) is True
    except Exception:
        return False


def get_preauth_user_id(request: Request) -> int | None:
    try:
        value = request.session.get(PREAUTH_USER_ID_KEY)
        return int(value) if value is not None else None
    except Exception:
        return None


def get_preauth_email(request: Request) -> str | None:
    try:
        value = request.session.get(PREAUTH_EMAIL_KEY)
        return str(value) if value else None
    except Exception:
        return None


def clear_preauth_session(request: Request) -> None:
    try:
        request.session.pop(PREAUTH_USER_ID_KEY, None)
        request.session.pop(PREAUTH_EMAIL_KEY, None)
        request.session.pop(PREAUTH_STARTED_AT_KEY, None)
        request.session.pop(PREAUTH_REMEMBER_KEY, None)
        request.session.pop(PREAUTH_PENDING_KEY, None)
    except Exception:
        pass


async def enforce_mfa_middleware(request: Request, call_next=None):
    path = request.url.path

    if path_is_public(path):
        return None

    user_id = get_session_user_id(request)

    if not user_id:
        return None

    if path_allowed_during_mfa(path):
        return None

    mfa_enabled = user_has_enabled_mfa(user_id)
    mfa_verified = is_mfa_verified_in_session(request)

    if not mfa_enabled:
        if wants_html(request):
            return RedirectResponse(url="/mfa-setup", status_code=302)
        return JSONResponse(
            status_code=403,
            content={
                "detail": "MFA setup is required before using the platform.",
                "code": "mfa_setup_required",
            },
        )

    if not mfa_verified:
        if wants_html(request):
            return RedirectResponse(url="/mfa", status_code=302)
        return JSONResponse(
            status_code=403,
            content={
                "detail": "MFA verification is required before using the platform.",
                "code": "mfa_verification_required",
            },
        )

    return None
