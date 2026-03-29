import os

import bcrypt
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel
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

SESSION_COOKIE_NAME = "indicare_session"
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "true").lower() == "true"
COOKIE_SAMESITE = os.environ.get("COOKIE_SAMESITE", "lax")
COOKIE_MAX_AGE = 60 * 30


class LoginRequest(BaseModel):
    email: str
    password: str
    remember: bool | None = False


def _normalise_email(email: str) -> str:
    return (email or "").strip().lower()


def _extract_token(request: Request, authorization: str | None = None) -> str | None:
    cookie_token = (request.cookies.get(SESSION_COOKIE_NAME) or "").strip()
    if cookie_token:
        return cookie_token

    if not authorization:
        return None

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    token = parts[1].strip()
    return token or None


def _get_user_by_id(conn, user_id: int):
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


def _set_session_cookie(response: Response, token: str):
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=COOKIE_MAX_AGE,
        path="/",
    )


def _clear_session_cookie(response: Response):
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
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


@router.post("/login")
def login(payload: LoginRequest, request: Request, response: Response, conn=Depends(get_db)):
    email = _normalise_email(payload.email)
    password = payload.password or ""

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

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
        user = cur.fetchone()

    if not user:
        log_auth_event(
            user_id=None,
            email=email,
            event_type="login_failed",
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
            detail="Unknown email",
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get("archived") is True:
        log_auth_event(
            user_id=user["id"],
            email=user["email"],
            event_type="login_blocked",
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
            detail="Archived user",
        )
        raise HTTPException(status_code=403, detail="User is archived")

    if user.get("is_active") is False:
        log_auth_event(
            user_id=user["id"],
            email=user["email"],
            event_type="login_blocked",
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
            detail="Inactive user",
        )
        raise HTTPException(status_code=403, detail="User account is inactive")

    password_hash = user["password_hash"]
    if isinstance(password_hash, str):
        password_hash = password_hash.encode("utf-8")

    if not bcrypt.checkpw(password.encode("utf-8"), password_hash):
        log_auth_event(
            user_id=user["id"],
            email=user["email"],
            event_type="login_failed",
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
            detail="Invalid password",
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_session_token(user["id"])
    _set_session_cookie(response, token)

    # Pre-authenticated session state for MFA enforcement
    request.session[SESSION_USER_ID_KEY] = int(user["id"])
    request.session[SESSION_USER_EMAIL_KEY] = user["email"]
    request.session[SESSION_MFA_VERIFIED_KEY] = False

    mfa_row = get_user_mfa(int(user["id"]))
    mfa_enabled = bool(mfa_row and int(mfa_row.get("is_enabled", 0)) == 1)

    billing = get_user_billing_by_user_id(conn, user["id"])

    log_auth_event(
        user_id=user["id"],
        email=user["email"],
        event_type="login_password_passed",
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
        detail="Primary credential check passed",
    )

    return {
        "ok": True,
        "message": "Password accepted. MFA required.",
        "mfa_required": True,
        "mfa_enabled": mfa_enabled,
        "user": {
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
        },
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
    token = _extract_token(request, authorization)
    payload = decode_session_token(token) if token else None

    if not payload:
        return {"authenticated": False}

    raw_user_id = payload.get("sub")
    try:
        user_id = int(raw_user_id)
    except (TypeError, ValueError):
        return {"authenticated": False}

    user = _get_user_by_id(conn, user_id)

    if not user or user.get("archived") is True or user.get("is_active") is False:
        return {"authenticated": False}

    billing = get_user_billing_by_user_id(conn, user_id)
    mfa_row = get_user_mfa(user_id)
    mfa_enabled = bool(mfa_row and int(mfa_row.get("is_enabled", 0)) == 1)
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
    token = _extract_token(request, authorization)
    payload = decode_session_token(token) if token else None

    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")

    raw_user_id = payload.get("sub")
    if raw_user_id is None:
        raise HTTPException(status_code=401, detail="Invalid session")

    try:
        user_id = int(raw_user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid session")

    user = _get_user_by_id(conn, user_id)

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if user.get("archived") is True:
        raise HTTPException(status_code=403, detail="User is archived")

    if user.get("is_active") is False:
        raise HTTPException(status_code=403, detail="User account is inactive")

    billing = get_user_billing_by_user_id(conn, user_id)
    mfa_row = get_user_mfa(user_id)
    mfa_enabled = bool(mfa_row and int(mfa_row.get("is_enabled", 0)) == 1)
    mfa_verified = request.session.get(SESSION_MFA_VERIFIED_KEY) is True

    return {
        "ok": True,
        "user": {
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
        },
    }
