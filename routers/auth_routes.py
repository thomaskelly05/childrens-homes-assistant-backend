import os
from dataclasses import dataclass
from typing import Any

import bcrypt
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr
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

router = APIRouter(prefix="/auth", tags=["Auth"])


# -----------------------------------------------------------------------------
# SETTINGS
# -----------------------------------------------------------------------------

@dataclass(frozen=True)
class AuthSettings:
    session_cookie_name: str
    app_env: str
    is_production: bool
    cookie_secure: bool
    cookie_samesite: str
    cookie_max_age: int

    @classmethod
    def load(cls) -> "AuthSettings":
        app_env = os.environ.get("APP_ENV", "development").lower()
        is_production = app_env == "production"

        cookie_secure = os.environ.get(
            "COOKIE_SECURE",
            "true" if is_production else "false",
        ).lower() == "true"

        cookie_samesite = os.environ.get("COOKIE_SAMESITE", "lax").strip().lower()
        if cookie_samesite not in {"lax", "strict", "none"}:
            cookie_samesite = "lax"

        return cls(
            session_cookie_name="indicare_session",
            app_env=app_env,
            is_production=is_production,
            cookie_secure=cookie_secure,
            cookie_samesite=cookie_samesite,
            cookie_max_age=60 * 60 * 12,
        )


settings = AuthSettings.load()


# -----------------------------------------------------------------------------
# MODELS
# -----------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember: bool | None = False


# -----------------------------------------------------------------------------
# HELPERS
# -----------------------------------------------------------------------------

def _normalise_email(email: str) -> str:
    return (email or "").strip().lower()


def _extract_token(
    request: Request,
    authorization: str | None = None,
) -> str | None:
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


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.cookie_max_age,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
    )


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def _user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")


def _auth_context(request: Request) -> dict[str, str | None]:
    return {
        "ip_address": _client_ip(request),
        "user_agent": _user_agent(request),
    }


def _log_auth(
    *,
    request: Request,
    user_id: int | None,
    email: str | None,
    event_type: str,
    detail: str,
) -> None:
    context = _auth_context(request)
    log_auth_event(
        user_id=user_id,
        email=email,
        event_type=event_type,
        ip_address=context["ip_address"],
        user_agent=context["user_agent"],
        detail=detail,
    )


def _ensure_password_hash_bytes(password_hash: str | bytes | None) -> bytes:
    if password_hash is None:
        return b""
    if isinstance(password_hash, bytes):
        return password_hash
    return password_hash.encode("utf-8")


def _session_user_payload(
    user: dict[str, Any],
    billing: dict[str, Any] | None,
) -> dict[str, Any]:
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
    }


def _validate_active_user(
    user: dict[str, Any] | None,
    *,
    not_found_status: int = status.HTTP_401_UNAUTHORIZED,
) -> dict[str, Any]:
    if not user:
        raise HTTPException(status_code=not_found_status, detail="User not found")

    if user.get("archived") is True:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is archived")

    if user.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

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


# -----------------------------------------------------------------------------
# ROUTES
# -----------------------------------------------------------------------------

@router.post("/login")
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    conn=Depends(get_db),
):
    email = _normalise_email(payload.email)
    password = payload.password or ""

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required",
        )

    user = _get_user_by_email(conn, email)

    if not user:
        _log_auth(
            request=request,
            user_id=None,
            email=email,
            event_type="login_failed",
            detail="Unknown email",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.get("archived") is True:
        _log_auth(
            request=request,
            user_id=user["id"],
            email=user["email"],
            event_type="login_blocked",
            detail="Archived user",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is archived",
        )

    if user.get("is_active") is False:
        _log_auth(
            request=request,
            user_id=user["id"],
            email=user["email"],
            event_type="login_blocked",
            detail="Inactive user",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    password_hash = _ensure_password_hash_bytes(user.get("password_hash"))
    if not password_hash or not bcrypt.checkpw(password.encode("utf-8"), password_hash):
        _log_auth(
            request=request,
            user_id=user["id"],
            email=user["email"],
            event_type="login_failed",
            detail="Invalid password",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_session_token(user["id"])
    _set_session_cookie(response, token)

    request.session[SESSION_USER_ID_KEY] = int(user["id"])
    request.session[SESSION_USER_EMAIL_KEY] = user["email"]
    request.session[SESSION_MFA_VERIFIED_KEY] = False

    mfa_row = get_user_mfa(int(user["id"]))
    mfa_enabled = bool(mfa_row and mfa_row.get("is_enabled") is True)
    billing = get_user_billing_by_user_id(conn, user["id"])

    _log_auth(
        request=request,
        user_id=user["id"],
        email=user["email"],
        event_type="login_password_passed",
        detail="Primary credential check passed",
    )

    return {
        "ok": True,
        "message": "Password accepted. MFA required.",
        "mfa_required": True,
        "mfa_enabled": mfa_enabled,
        "user": _session_user_payload(user, billing),
    }


@router.post("/logout")
def logout(request: Request, response: Response):
    _clear_session_cookie(response)
    request.session.clear()
    return {
        "ok": True,
        "message": "Logged out",
    }


@router.get("/check")
def check_auth(
    request: Request,
    authorization: str | None = Header(default=None),
    conn=Depends(get_db),
):
    user, user_id = _get_session_user_from_request(
        request,
        conn,
        authorization,
        raise_on_missing=False,
    )

    if not user or user_id is None:
        return {"authenticated": False}

    if user.get("archived") is True or user.get("is_active") is False:
        return {"authenticated": False}

    billing = get_user_billing_by_user_id(conn, user_id)
    mfa_row = get_user_mfa(user_id)
    mfa_enabled = bool(mfa_row and mfa_row.get("is_enabled") is True)
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

    billing = get_user_billing_by_user_id(conn, user_id)
    mfa_row = get_user_mfa(user_id)
    mfa_enabled = bool(mfa_row and mfa_row.get("is_enabled") is True)
    mfa_verified = request.session.get(SESSION_MFA_VERIFIED_KEY) is True

    return {
        "ok": True,
        "user": _full_user_payload(
            user,
            billing,
            mfa_enabled=mfa_enabled,
            mfa_verified=mfa_verified,
        ),
    }
