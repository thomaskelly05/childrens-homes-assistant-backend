import os
import re
import secrets
import time
from dataclasses import dataclass
from typing import Any

import bcrypt
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, field_validator
from psycopg2.extras import RealDictCursor

from auth.mfa_guard import (
    SESSION_MFA_VERIFIED_KEY,
    SESSION_USER_EMAIL_KEY,
    SESSION_USER_ID_KEY,
)
from auth.tokens import create_session_token, decode_session_token
from db.billing_db import get_user_billing_by_user_id
from db.connection import get_db
from db.mfa_db import get_user_mfa, log_auth_event
from db.passkeys_db import user_has_passkeys

router = APIRouter(prefix="/auth", tags=["Auth"])


FAILED_BY_IP: dict[str, list[float]] = {}
FAILED_BY_EMAIL: dict[str, list[float]] = {}
LOCKED_IPS: dict[str, float] = {}
LOCKED_EMAILS: dict[str, float] = {}

THROTTLE_WINDOW_SECONDS = int(os.getenv("AUTH_THROTTLE_WINDOW_SECONDS", "900"))
MAX_FAILED_ATTEMPTS_PER_IP = int(os.getenv("AUTH_MAX_FAILED_ATTEMPTS_PER_IP", "20"))
MAX_FAILED_ATTEMPTS_PER_EMAIL = int(os.getenv("AUTH_MAX_FAILED_ATTEMPTS_PER_EMAIL", "8"))
LOCKOUT_SECONDS = int(os.getenv("AUTH_LOCKOUT_SECONDS", "900"))

DUMMY_BCRYPT_HASH = b"$2b$12$yAc2mW0pYv4B4xXj3H3oJ.5XQmsx3M3uVJfY0jQnR8iW0VtT1hN3K"


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
        app_env = os.environ.get("APP_ENV", "development").lower()
        is_production = app_env == "production"

        cookie_secure = os.getenv(
            "COOKIE_SECURE",
            "true" if is_production else "false",
        ).lower() == "true"

        cookie_samesite = os.getenv("COOKIE_SAMESITE", "strict").strip().lower()
        if cookie_samesite not in {"lax", "strict", "none"}:
            cookie_samesite = "strict"

        session_cookie_name = "__Host-indicare_session" if cookie_secure else "indicare_session"
        csrf_cookie_name = "__Host-indicare_csrf" if cookie_secure else "indicare_csrf"

        return cls(
            session_cookie_name=session_cookie_name,
            csrf_cookie_name=csrf_cookie_name,
            app_env=app_env,
            is_production=is_production,
            cookie_secure=cookie_secure,
            cookie_samesite=cookie_samesite,
            cookie_max_age_short=60 * 60 * 8,
            cookie_max_age_long=60 * 60 * 24 * 14,
            force_mfa_for_sensitive_roles=True,
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


def _extract_token(request: Request, authorization: str | None = None) -> str | None:
    cookie_token = (request.cookies.get(settings.session_cookie_name) or "").strip()
    if cookie_token:
        return cookie_token

    if not authorization:
        return None

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    token = parts[1].strip()
    return token or None


def _safe_session_reset(request: Request) -> None:
    try:
        request.session.clear()
    except Exception:
        pass


def _ensure_password_hash_bytes(password_hash: str | bytes | None) -> bytes:
    if password_hash is None:
        return b""
    if isinstance(password_hash, bytes):
        return password_hash
    return password_hash.encode("utf-8")


def _dummy_bcrypt_check(password: str) -> None:
    try:
        bcrypt.checkpw(password.encode("utf-8"), DUMMY_BCRYPT_HASH)
    except Exception:
        pass


def _check_password_policy(password: str) -> str | None:
    if len(password) < 12:
        return "Password must be at least 12 characters long."
    if not re.search(r"[A-Z]", password):
        return "Password must include at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return "Password must include at least one lowercase letter."
    if not re.search(r"\d", password):
        return "Password must include at least one number."
    return None


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def _user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")


def _log_auth(
    *,
    request: Request,
    user_id: int | None,
    email: str | None,
    event_type: str,
    detail: str,
) -> None:
    try:
        log_auth_event(
            user_id=user_id,
            email=email,
            event_type=event_type,
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
            detail=detail,
        )
    except Exception:
        pass


def _prune_attempts(bag: dict[str, list[float]], key: str) -> list[float]:
    current = _now()
    values = [t for t in bag.get(key, []) if current - t <= THROTTLE_WINDOW_SECONDS]
    bag[key] = values
    return values


def _is_locked(lock_map: dict[str, float], key: str) -> bool:
    if not key:
        return False
    until = lock_map.get(key)
    if not until:
        return False
    if until <= _now():
        lock_map.pop(key, None)
        return False
    return True


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


def _assert_not_locked(request: Request, email: str | None) -> None:
    ip = _client_ip(request)

    if ip and _is_locked(LOCKED_IPS, ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed sign-in attempts. Please try again later.",
        )

    if email and _is_locked(LOCKED_EMAILS, email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed sign-in attempts. Please try again later.",
        )


def _mfa_required_for_role(role: str | None) -> bool:
    role_value = (role or "").strip().lower()
    return settings.force_mfa_for_sensitive_roles and role_value in {
        "admin",
        "provider_admin",
        "manager",
    }


def _get_user_by_id(conn: Any, user_id: int) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id,
                email,
                role,
                home_id,
                first_name,
                last_name,
                is_active,
                archived,
                password_hash,
                updated_at,
                created_at
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        return cur.fetchone()


def _get_user_by_email(conn: Any, email: str) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id,
                email,
                password_hash,
                role,
                home_id,
                first_name,
                last_name,
                is_active,
                archived
            FROM users
            WHERE lower(email) = %s
            LIMIT 1
            """,
            (email,),
        )
        return cur.fetchone()


def _set_session_cookie(response: Response, token: str, remember: bool = False) -> None:
    max_age = settings.cookie_max_age_long if remember else settings.cookie_max_age_short
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=max_age,
        path="/",
    )


def _set_csrf_cookie(response: Response, csrf_token: str, remember: bool = False) -> None:
    max_age = settings.cookie_max_age_long if remember else settings.cookie_max_age_short
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=csrf_token,
        httponly=False,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=max_age,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(key=settings.session_cookie_name, path="/")
    response.delete_cookie(key=settings.csrf_cookie_name, path="/")


def _get_billing_safe(conn: Any, user_id: int) -> dict[str, Any] | None:
    try:
        return get_user_billing_by_user_id(conn, user_id)
    except Exception:
        return None


def _get_mfa_safe(user_id: int) -> dict[str, Any] | None:
    try:
        return get_user_mfa(user_id)
    except Exception:
        return None


def _session_user_payload(user: dict[str, Any], billing: dict[str, Any] | None) -> dict[str, Any]:
    return {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "home_id": user.get("home_id"),
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "is_active": bool(user.get("is_active")),
        "subscription_active": bool(billing and billing.get("subscription_active")),
        "subscription_status": billing.get("subscription_status") if billing else "inactive",
        "plan_name": billing.get("plan_name") if billing else None,
    }


def _full_user_payload(
    user: dict[str, Any],
    billing: dict[str, Any] | None,
    *,
    mfa_enabled: bool,
    mfa_verified: bool,
    has_passkeys: bool,
) -> dict[str, Any]:
    return {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "home_id": user.get("home_id"),
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "archived": user.get("archived"),
        "updated_at": user.get("updated_at"),
        "created_at": user.get("created_at"),
        "is_active": bool(user.get("is_active")),
        "subscription_active": bool(billing and billing.get("subscription_active")),
        "subscription_status": billing.get("subscription_status") if billing else "inactive",
        "plan_name": billing.get("plan_name") if billing else None,
        "stripe_customer_id": billing.get("stripe_customer_id") if billing else None,
        "stripe_subscription_id": billing.get("stripe_subscription_id") if billing else None,
        "current_period_end": billing.get("current_period_end") if billing else None,
        "mfa_enabled": mfa_enabled,
        "mfa_verified": mfa_verified,
        "has_passkeys": has_passkeys,
    }


def _validate_active_user(user: dict[str, Any] | None) -> dict[str, Any]:
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.get("archived") is True:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is archived")
    if user.get("is_active") is False:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
    return user


def _get_session_user_from_request(
    request: Request,
    conn: Any,
    authorization: str | None,
    *,
    raise_on_missing: bool,
) -> tuple[dict[str, Any] | None, int | None]:
    token = _extract_token(request, authorization)
    payload = decode_session_token(token) if token else None

    if not payload:
        if raise_on_missing:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        return None, None

    raw_user_id = payload.get("sub")
    try:
        user_id = int(raw_user_id)
    except (TypeError, ValueError):
        if raise_on_missing:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
        return None, None

    user = _get_user_by_id(conn, user_id)
    return user, user_id


@router.post("/login")
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    conn=Depends(get_db),
):
    email = _normalise_email(payload.email)
    password = payload.password or ""
    remember = bool(payload.remember)

    _assert_not_locked(request, email)

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required",
        )

    user = _get_user_by_email(conn, email)

    if not user:
        _dummy_bcrypt_check(password)
        _register_failure(_client_ip(request), email)
        _log_auth(
            request=request,
            user_id=None,
            email=email,
            event_type="login_failed",
            detail="Invalid credentials",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.get("archived") is True:
        _register_failure(_client_ip(request), email)
        _log_auth(
            request=request,
            user_id=user["id"],
            email=user["email"],
            event_type="login_blocked",
            detail="Archived user",
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is archived")

    if user.get("is_active") is False:
        _register_failure(_client_ip(request), email)
        _log_auth(
            request=request,
            user_id=user["id"],
            email=user["email"],
            event_type="login_blocked",
            detail="Inactive user",
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    password_hash = _ensure_password_hash_bytes(user.get("password_hash"))
    try:
        password_ok = bool(password_hash) and bcrypt.checkpw(password.encode("utf-8"), password_hash)
    except ValueError:
        password_ok = False

    if not password_ok:
        _register_failure(_client_ip(request), email)
        _log_auth(
            request=request,
            user_id=user["id"],
            email=user["email"],
            event_type="login_failed",
            detail="Invalid credentials",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    _clear_failures(_client_ip(request), email)

    token = create_session_token(user["id"])
    csrf_token = secrets.token_urlsafe(32)

    _set_session_cookie(response, token, remember=remember)
    _set_csrf_cookie(response, csrf_token, remember=remember)

    try:
        _safe_session_reset(request)
        request.session[SESSION_USER_ID_KEY] = int(user["id"])
        request.session[SESSION_USER_EMAIL_KEY] = user["email"]
        request.session[SESSION_MFA_VERIFIED_KEY] = False
        request.session["csrf_token"] = csrf_token
        request.session["remember"] = remember
        request.session["login_at"] = int(_now())
        request.session["preauth_pending"] = True
        request.session["pending_mfa_user_id"] = int(user["id"])
        request.session["pending_mfa_email"] = user["email"]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Session could not be created",
        )

    mfa_row = _get_mfa_safe(int(user["id"]))
    mfa_enabled = bool(mfa_row and bool(mfa_row.get("is_enabled")))
    billing = _get_billing_safe(conn, user["id"])
    force_mfa = _mfa_required_for_role(user.get("role"))

    _log_auth(
        request=request,
        user_id=user["id"],
        email=user["email"],
        event_type="login_password_passed",
        detail="Primary credential check passed",
    )

    return {
        "ok": True,
        "authenticated": False,
        "message": "Password accepted. MFA required.",
        "mfa_required": True,
        "mfa_enabled": mfa_enabled,
        "mfa_mandatory": force_mfa,
        "mfa_pending": True,
        "user": _session_user_payload(user, billing),
    }


@router.post("/logout")
def logout(request: Request, response: Response):
    _clear_auth_cookies(response)
    _safe_session_reset(request)
    return {"ok": True, "message": "Logged out"}


@router.get("/check")
def check_auth(
    request: Request,
    authorization: str | None = Header(default=None),
    conn=Depends(get_db),
):
    if request.session.get("preauth_pending") is True:
        pending_user_id = request.session.get("pending_mfa_user_id")
        try:
            pending_user_id = int(pending_user_id) if pending_user_id is not None else None
        except (TypeError, ValueError):
            pending_user_id = None

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
            "mfa_enabled": True,
            "mfa_verified": False,
            "user_id": pending_user_id,
            "expires_in_seconds": expires_in_seconds,
        }

    user, user_id = _get_session_user_from_request(
        request,
        conn,
        authorization,
        raise_on_missing=False,
    )

    if not user or user_id is None:
        return {"authenticated": False, "mfa_pending": False}

    if user.get("archived") is True or user.get("is_active") is False:
        return {"authenticated": False, "mfa_pending": False}

    billing = _get_billing_safe(conn, user_id)
    mfa_row = _get_mfa_safe(user_id)
    mfa_enabled = bool(mfa_row and bool(mfa_row.get("is_enabled")))
    mfa_verified = request.session.get(SESSION_MFA_VERIFIED_KEY) is True

    return {
        "authenticated": True,
        "user_id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "home_id": user.get("home_id"),
        "is_active": bool(user.get("is_active")),
        "subscription_active": bool(billing and billing.get("subscription_active")),
        "subscription_status": billing.get("subscription_status") if billing else "inactive",
        "plan_name": billing.get("plan_name") if billing else None,
        "mfa_enabled": mfa_enabled,
        "mfa_verified": mfa_verified,
        "mfa_mandatory": _mfa_required_for_role(user.get("role")),
        "mfa_pending": False,
    }


@router.get("/me")
def get_me(
    request: Request,
    authorization: str | None = Header(default=None),
    conn=Depends(get_db),
):
    user, user_id = _get_session_user_from_request(
        request,
        conn,
        authorization,
        raise_on_missing=True,
    )

    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    user = _validate_active_user(user)

    billing = _get_billing_safe(conn, user_id)
    mfa_row = _get_mfa_safe(user_id)
    mfa_enabled = bool(mfa_row and bool(mfa_row.get("is_enabled")))
    mfa_verified = request.session.get(SESSION_MFA_VERIFIED_KEY) is True
    has_passkeys = user_has_passkeys(user_id)

    return {
        "ok": True,
        "user": _full_user_payload(
            user,
            billing,
            mfa_enabled=mfa_enabled,
            mfa_verified=mfa_verified,
            has_passkeys=has_passkeys,
        ),
        "mfa_mandatory": _mfa_required_for_role(user.get("role")),
    }


@router.get("/auth-policy")
def auth_policy():
    return {
        "password_min_length": 12,
        "mfa_required_for_sensitive_roles": settings.force_mfa_for_sensitive_roles,
        "cookie_samesite": settings.cookie_samesite,
        "cookie_secure": settings.cookie_secure,
    }
