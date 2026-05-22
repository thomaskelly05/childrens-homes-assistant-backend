import os
import re
import secrets
import time
from dataclasses import dataclass
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, field_validator
from psycopg2.extras import RealDictCursor

from auth.mfa_guard import (
    SESSION_MFA_VERIFIED_KEY,
    SESSION_USER_EMAIL_KEY,
    SESSION_USER_ID_KEY,
)
from auth.errors import auth_error_detail, forbidden, unauthorised
from auth.models import staff_user_payload
from auth.passwords import burn_dummy_password_check, verify_password
from auth.rbac import normalise_role, permissions_for_role
from auth.tokens import create_session_token, decode_session_token
from db.billing_db import get_user_billing_by_user_id
from db.connection import db_connection, get_db
from db.mfa_db import get_user_mfa, log_auth_event
from db.passkeys_db import user_has_passkeys
from services.session_security_service import create_session_record, revoke_session

router = APIRouter(prefix="/auth", tags=["Auth"])

FAILED_BY_IP: dict[str, list[float]] = {}
FAILED_BY_EMAIL: dict[str, list[float]] = {}
LOCKED_IPS: dict[str, float] = {}
LOCKED_EMAILS: dict[str, float] = {}

THROTTLE_WINDOW_SECONDS = int(os.getenv("AUTH_THROTTLE_WINDOW_SECONDS", "900"))
MAX_FAILED_ATTEMPTS_PER_IP = int(os.getenv("AUTH_MAX_FAILED_ATTEMPTS_PER_IP", "20"))
MAX_FAILED_ATTEMPTS_PER_EMAIL = int(os.getenv("AUTH_MAX_FAILED_ATTEMPTS_PER_EMAIL", "8"))
LOCKOUT_SECONDS = int(os.getenv("AUTH_LOCKOUT_SECONDS", "900"))
INVALID_CREDENTIALS_MESSAGE = "Invalid email or password"
LOCKOUT_MESSAGE = "Too many failed sign-in attempts. Please try again later."

@dataclass(frozen=True)
class AuthSettings:
    session_cookie_name: str
    csrf_cookie_name: str
    app_env: str
    is_production: bool
    cookie_secure: bool
    cookie_samesite: str
    cookie_max_age_short: int
    cookie_max_age_long: int
    force_mfa_for_sensitive_roles: bool

    @classmethod
    def load(cls) -> "AuthSettings":
        app_env = os.environ.get("APP_ENV", "development").strip().lower()
        if app_env not in {"development", "test", "staging", "production"}:
            app_env = "development"
        is_production = app_env == "production"
        cookie_secure = os.getenv("COOKIE_SECURE", "true" if is_production else "false").strip().lower() == "true"
        cookie_samesite = os.getenv("COOKIE_SAMESITE", "strict").strip().lower()
        if cookie_samesite not in {"lax", "strict", "none"}:
            cookie_samesite = "strict"
        return cls(
            session_cookie_name="__Host-indicare_session" if cookie_secure else "indicare_session",
            csrf_cookie_name="__Host-indicare_csrf" if cookie_secure else "indicare_csrf",
            app_env=app_env,
            is_production=is_production,
            cookie_secure=cookie_secure,
            cookie_samesite=cookie_samesite,
            cookie_max_age_short=60 * 60 * 8,
            cookie_max_age_long=60 * 60 * 24 * 14,
            force_mfa_for_sensitive_roles=os.getenv("FORCE_MFA_FOR_SENSITIVE_ROLES", "true").strip().lower() == "true",
        )

settings = AuthSettings.load()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember: bool | None = False

    @field_validator("password")
    @classmethod
    def validate_password_present(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Password is required")
        return value

def _normalise_email(email: str) -> str:
    return (email or "").strip().lower()

def _now() -> float:
    return time.time()

def _seconds_remaining(until_timestamp: float | None) -> int | None:
    if not until_timestamp:
        return None
    return max(0, int(until_timestamp - _now()))

def _extract_token(request: Request, authorization: str | None = None) -> str | None:
    cookie_token = (request.cookies.get(settings.session_cookie_name) or "").strip()
    if cookie_token:
        return cookie_token
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip() or None

def _safe_session_reset(request: Request) -> None:
    try:
        request.session.clear()
    except Exception:
        pass

def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None

def _user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")

def _log_auth(*, request: Request, user_id: int | None, email: str | None, event_type: str, detail: str) -> None:
    try:
        log_auth_event(user_id=user_id, email=email, event_type=event_type, ip_address=_client_ip(request), user_agent=_user_agent(request), detail=detail)
    except Exception:
        pass

def _prune_attempts(bag: dict[str, list[float]], key: str) -> list[float]:
    current = _now()
    values = [t for t in bag.get(key, []) if current - t <= THROTTLE_WINDOW_SECONDS]
    bag[key] = values
    return values

def _get_lock_until(lock_map: dict[str, float], key: str | None) -> float | None:
    if not key:
        return None
    until = lock_map.get(key)
    if not until:
        return None
    if until <= _now():
        lock_map.pop(key, None)
        return None
    return until

def _register_failure(ip: str | None, email: str | None) -> None:
    current = _now()
    if ip:
        attempts = _prune_attempts(FAILED_BY_IP, ip)
        attempts.append(current)
        FAILED_BY_IP[ip] = attempts
        if len(attempts) >= MAX_FAILED_ATTEMPTS_PER_IP:
            LOCKED_IPS[ip] = current + LOCKOUT_SECONDS
    if email:
        attempts = _prune_attempts(FAILED_BY_EMAIL, email)
        attempts.append(current)
        FAILED_BY_EMAIL[email] = attempts
        if len(attempts) >= MAX_FAILED_ATTEMPTS_PER_EMAIL:
            LOCKED_EMAILS[email] = current + LOCKOUT_SECONDS

def _clear_failures(ip: str | None, email: str | None) -> None:
    if ip:
        FAILED_BY_IP.pop(ip, None)
        LOCKED_IPS.pop(ip, None)
    if email:
        FAILED_BY_EMAIL.pop(email, None)
        LOCKED_EMAILS.pop(email, None)

def _raise_lockout(until_timestamp: float | None) -> None:
    retry_after_seconds = _seconds_remaining(until_timestamp)
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=auth_error_detail(
            "too_many_login_attempts",
            LOCKOUT_MESSAGE,
            retry_after_seconds=retry_after_seconds,
        ),
    )

def _assert_not_locked(request: Request, email: str | None) -> None:
    ip = _client_ip(request)
    ip_locked_until = _get_lock_until(LOCKED_IPS, ip)
    if ip_locked_until is not None:
        _raise_lockout(ip_locked_until)
    email_locked_until = _get_lock_until(LOCKED_EMAILS, email)
    if email_locked_until is not None:
        _raise_lockout(email_locked_until)

def _mfa_required_for_role(role: str | None) -> bool:
    return settings.force_mfa_for_sensitive_roles and normalise_role(role) in {"admin", "manager"}

def _get_user_by_id(conn: Any, user_id: int) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT u.id, u.email, u.role, u.home_id, COALESCE(u.provider_id, h.provider_id) AS provider_id,
                   u.first_name, u.last_name, u.is_active, u.archived, u.password_hash, u.updated_at, u.created_at
            FROM users u LEFT JOIN homes h ON h.id = u.home_id WHERE u.id = %s LIMIT 1
        """, (user_id,))
        return cur.fetchone()

def _get_user_by_email(conn: Any, email: str) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT u.id, u.email, u.password_hash, u.role, u.home_id, COALESCE(u.provider_id, h.provider_id) AS provider_id,
                   u.first_name, u.last_name, u.is_active, u.archived
            FROM users u LEFT JOIN homes h ON h.id = u.home_id WHERE lower(u.email) = %s LIMIT 1
        """, (email,))
        return cur.fetchone()

def _set_session_cookie(response: Response, token: str, remember: bool = False) -> None:
    response.set_cookie(key=settings.session_cookie_name, value=token, httponly=True, secure=settings.cookie_secure, samesite=settings.cookie_samesite, max_age=settings.cookie_max_age_long if remember else settings.cookie_max_age_short, path="/")

def _set_csrf_cookie(response: Response, csrf_token: str, remember: bool = False) -> None:
    response.set_cookie(key=settings.csrf_cookie_name, value=csrf_token, httponly=False, secure=settings.cookie_secure, samesite=settings.cookie_samesite, max_age=settings.cookie_max_age_long if remember else settings.cookie_max_age_short, path="/")

def _ensure_csrf_cookie(request: Request, response: Response) -> None:
    csrf_token = str(request.session.get("csrf_token") or "")
    cookie_token = str(request.cookies.get(settings.csrf_cookie_name) or "")
    if not csrf_token:
        csrf_token = cookie_token or secrets.token_urlsafe(32)
        request.session["csrf_token"] = csrf_token
    if not cookie_token or not secrets.compare_digest(cookie_token, csrf_token):
        _set_csrf_cookie(response, csrf_token, remember=bool(request.session.get("remember")))

def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(key=settings.session_cookie_name, path="/", secure=settings.cookie_secure, samesite=settings.cookie_samesite)
    response.delete_cookie(key=settings.csrf_cookie_name, path="/", secure=settings.cookie_secure, samesite=settings.cookie_samesite)

def _get_billing_safe(conn: Any, user_id: int) -> dict[str, Any] | None:
    try:
        return get_user_billing_by_user_id(conn, user_id)
    except Exception:
        return None

def _get_mfa_safe(user_id: int, conn: Any | None = None) -> dict[str, Any] | None:
    try:
        return get_user_mfa(user_id, conn=conn)
    except TypeError:
        try:
            return get_user_mfa(user_id)
        except Exception:
            return None
    except Exception:
        return None


def _user_has_passkeys_safe(user_id: int, conn: Any | None = None) -> bool:
    try:
        return user_has_passkeys(user_id, conn=conn)
    except TypeError:
        try:
            return user_has_passkeys(user_id)
        except Exception:
            return False
    except Exception:
        return False

def _session_user_payload(user: dict[str, Any], billing: dict[str, Any] | None) -> dict[str, Any]:
    return staff_user_payload(user, billing=billing)

def _full_user_payload(user: dict[str, Any], billing: dict[str, Any] | None, *, mfa_enabled: bool, mfa_verified: bool, has_passkeys: bool) -> dict[str, Any]:
    return staff_user_payload(
        user,
        billing=billing,
        mfa_enabled=mfa_enabled,
        mfa_verified=mfa_verified,
        has_passkeys=has_passkeys,
        include_audit_fields=True,
    )

def _validate_active_user(user: dict[str, Any] | None) -> dict[str, Any]:
    if not user:
        raise unauthorised("user_not_found", "User not found")
    if user.get("archived") is True:
        raise forbidden("user_archived", "User is archived")
    if user.get("is_active") is False:
        raise forbidden("user_inactive", "User account is inactive")
    return user

def _get_session_user_from_request(request: Request, conn: Any, authorization: str | None, *, raise_on_missing: bool) -> tuple[dict[str, Any] | None, int | None]:
    token = _extract_token(request, authorization)
    payload = decode_session_token(token) if token else None
    if not payload:
        if raise_on_missing:
            raise unauthorised("not_authenticated", "Not authenticated")
        return None, None
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        if raise_on_missing:
            raise unauthorised("session_invalid", "Invalid session")
        return None, None
    return _get_user_by_id(conn, user_id), user_id

def _set_authenticated_session_state(request: Request, *, user_id: int, email: str, csrf_token: str, remember: bool, mfa_pending: bool) -> None:
    request.session[SESSION_USER_ID_KEY] = int(user_id)
    request.session[SESSION_USER_EMAIL_KEY] = email
    request.session[SESSION_MFA_VERIFIED_KEY] = not mfa_pending
    request.session["csrf_token"] = csrf_token
    request.session["remember"] = remember
    request.session["login_at"] = int(_now())
    request.session["preauth_pending"] = mfa_pending
    request.session["mfa_pending"] = mfa_pending
    if mfa_pending:
        request.session["pending_mfa_user_id"] = int(user_id)
        request.session["pending_mfa_email"] = email
        request.session["mfa_user_id"] = int(user_id)
        request.session["mfa_email"] = email
    else:
        request.session.pop("pending_mfa_user_id", None)
        request.session.pop("pending_mfa_email", None)
        request.session.pop("mfa_user_id", None)
        request.session.pop("mfa_email", None)

def _deny_login(*, request: Request, email: str, user_id: int | None, log_detail: str, event_type: str = "login_failed", status_code_value: int = status.HTTP_401_UNAUTHORIZED) -> None:
    _register_failure(_client_ip(request), email)
    _log_auth(request=request, user_id=user_id, email=email, event_type=event_type, detail=log_detail)
    code = "invalid_credentials" if status_code_value == status.HTTP_401_UNAUTHORIZED else "login_blocked"
    message = INVALID_CREDENTIALS_MESSAGE if status_code_value == status.HTTP_401_UNAUTHORIZED else log_detail
    raise HTTPException(status_code=status_code_value, detail=auth_error_detail(code, message))

@router.post("/login")
def login(payload: LoginRequest, request: Request, response: Response, conn=Depends(get_db)):
    email = _normalise_email(payload.email)
    password = payload.password or ""
    remember = bool(payload.remember)
    _assert_not_locked(request, email)
    if not email or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email and password are required")
    user = _get_user_by_email(conn, email)
    if not user:
        burn_dummy_password_check(password)
        _deny_login(request=request, email=email, user_id=None, log_detail="Invalid credentials")
    if user.get("archived") is True:
        _deny_login(request=request, email=email, user_id=user["id"], log_detail="Archived user", event_type="login_blocked", status_code_value=status.HTTP_403_FORBIDDEN)
    if user.get("is_active") is False:
        _deny_login(request=request, email=email, user_id=user["id"], log_detail="Inactive user", event_type="login_blocked", status_code_value=status.HTTP_403_FORBIDDEN)
    password_ok = verify_password(password, user.get("password_hash"))
    if not password_ok:
        _deny_login(request=request, email=email, user_id=user["id"], log_detail="Invalid credentials")

    csrf_token = secrets.token_urlsafe(32)
    mfa_row = _get_mfa_safe(int(user["id"]), conn)
    mfa_enabled = bool(mfa_row and bool(mfa_row.get("is_enabled")))
    force_mfa = _mfa_required_for_role(user.get("role"))
    mfa_pending = bool(mfa_enabled or force_mfa)

    try:
        _safe_session_reset(request)
        _set_authenticated_session_state(request, user_id=int(user["id"]), email=user["email"], csrf_token=csrf_token, remember=remember, mfa_pending=mfa_pending)
    except Exception:
        _safe_session_reset(request)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Session could not be created")

    session_id = create_session_record(user_id=int(user["id"]), request=request, mfa_verified=not mfa_pending, conn=conn)
    token = create_session_token(
        user["id"],
        email=user.get("email"),
        role=normalise_role(user.get("role")),
        home_id=user.get("home_id"),
        provider_id=user.get("provider_id"),
        permissions=sorted(permissions_for_role(user.get("role"))),
        mfa_verified=not mfa_pending,
        remember=remember,
        session_id=session_id,
    )
    _set_session_cookie(response, token, remember=remember)
    _set_csrf_cookie(response, csrf_token, remember=remember)
    _clear_failures(_client_ip(request), email)
    billing = _get_billing_safe(conn, user["id"])

    _log_auth(request=request, user_id=user["id"], email=user["email"], event_type="login_password_passed", detail="Primary credential check passed")

    if mfa_pending:
        return {"ok": True, "authenticated": False, "message": "Password accepted. MFA required." if mfa_enabled else "Password accepted. MFA setup required.", "mfa_required": True, "mfa_enabled": mfa_enabled, "mfa_setup_required": not mfa_enabled, "mfa_mandatory": force_mfa, "mfa_pending": True, "user": _session_user_payload(user, billing)}

    return {"ok": True, "authenticated": True, "message": "Signed in", "mfa_required": False, "mfa_enabled": mfa_enabled, "mfa_mandatory": False, "mfa_pending": False, "user": _session_user_payload(user, billing)}

@router.post("/logout")
def logout(request: Request, response: Response):
    token = _extract_token(request)
    payload = decode_session_token(token) if token else None
    if payload and payload.get("sid"):
        revoke_session(str(payload["sid"]), reason="logout")
    _clear_auth_cookies(response)
    _safe_session_reset(request)
    return {"ok": True, "message": "Logged out"}

@router.post("/dev/clear-lockout")
def clear_lockout(request: Request):
    if settings.is_production and os.getenv("ALLOW_AUTH_LOCKOUT_RESET", "false").lower() != "true":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    ip = _client_ip(request)
    if ip:
        FAILED_BY_IP.pop(ip, None)
        LOCKED_IPS.pop(ip, None)
    return {"ok": True, "message": "Lockout cleared for current IP in non-production/dev mode."}

@router.get("/check")
def check_auth(request: Request, authorization: str | None = Header(default=None), conn=Depends(get_db)):
    if request.session.get("preauth_pending") is True:
        pending_user_id = request.session.get("pending_mfa_user_id")
        try:
            pending_user_id = int(pending_user_id) if pending_user_id is not None else None
        except (TypeError, ValueError):
            pending_user_id = None

        mfa_enabled = False
        role = None
        email = request.session.get("pending_mfa_email")
        if pending_user_id is not None:
            try:
                pending_user = _get_user_by_id(conn, pending_user_id)
                role = pending_user.get("role") if pending_user else None
                email = pending_user.get("email") if pending_user else email
                mfa_row = _get_mfa_safe(pending_user_id, conn)
                mfa_enabled = bool(mfa_row and bool(mfa_row.get("is_enabled")))
            except Exception:
                mfa_enabled = False

        expires_in_seconds = None
        try:
            login_at = int(request.session.get("login_at") or 0)
            if login_at > 0:
                expires_in_seconds = max(0, settings.cookie_max_age_short - int(_now() - login_at))
        except Exception:
            expires_in_seconds = None
        return {
            "authenticated": False,
            "mfa_pending": True,
            "mfa_required": True,
            "mfa_enabled": mfa_enabled,
            "mfa_setup_required": not mfa_enabled,
            "mfa_mandatory": _mfa_required_for_role(role),
            "mfa_verified": False,
            "user_id": pending_user_id,
            "email": email,
            "expires_in_seconds": expires_in_seconds,
        }

    user, user_id = _get_session_user_from_request(request, conn, authorization, raise_on_missing=False)
    if not user or user_id is None or user.get("archived") is True or user.get("is_active") is False:
        return {"authenticated": False, "mfa_pending": False}
    billing = _get_billing_safe(conn, user_id)
    mfa_row = _get_mfa_safe(user_id, conn)
    mfa_enabled = bool(mfa_row and bool(mfa_row.get("is_enabled")))
    mfa_verified = request.session.get(SESSION_MFA_VERIFIED_KEY) is True
    user_payload = _session_user_payload(user, billing)
    return {"authenticated": True, "user_id": user["id"], "email": user["email"], **user_payload, "mfa_enabled": mfa_enabled, "mfa_verified": mfa_verified, "mfa_mandatory": _mfa_required_for_role(user.get("role")), "mfa_pending": False}

@router.get("/me")
def get_me(request: Request, response: Response, authorization: str | None = Header(default=None)):
    with db_connection() as conn:
        user, user_id = _get_session_user_from_request(request, conn, authorization, raise_on_missing=True)
        if user_id is None:
            raise unauthorised("session_invalid", "Invalid session")
        user = _validate_active_user(user)
        billing = _get_billing_safe(conn, user_id)
        mfa_row = _get_mfa_safe(user_id, conn)
        mfa_enabled = bool(mfa_row and bool(mfa_row.get("is_enabled")))
        has_passkeys = _user_has_passkeys_safe(user_id, conn)
    _ensure_csrf_cookie(request, response)
    mfa_verified = request.session.get(SESSION_MFA_VERIFIED_KEY) is True
    return {"ok": True, "user": _full_user_payload(user, billing, mfa_enabled=mfa_enabled, mfa_verified=mfa_verified, has_passkeys=has_passkeys), "mfa_mandatory": _mfa_required_for_role(user.get("role"))}

@router.get("/auth-policy")
def auth_policy():
    return {"password_min_length": 12, "mfa_required_for_sensitive_roles": settings.force_mfa_for_sensitive_roles, "cookie_samesite": settings.cookie_samesite, "cookie_secure": settings.cookie_secure}
