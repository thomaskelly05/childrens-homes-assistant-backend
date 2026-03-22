from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor
import bcrypt

from db.connection import get_db
from db.billing_db import ensure_billing_columns, get_user_billing_by_user_id
from auth.tokens import create_session_token, decode_session_token

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


def _normalise_email(email: str) -> str:
    return (email or "").strip().lower()


def _get_bearer_payload(authorization: str | None):
    if not authorization:
        return None

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    token = parts[1].strip()
    if not token:
        return None

    return decode_session_token(token)


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
            (user_id,)
        )
        return cur.fetchone()


@router.post("/login")
def login(payload: LoginRequest, conn=Depends(get_db)):
    ensure_billing_columns(conn)

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
            (email,)
        )
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get("archived") is True:
        raise HTTPException(status_code=403, detail="User is archived")

    if user.get("is_active") is False:
        raise HTTPException(status_code=403, detail="User account is inactive")

    password_hash = user["password_hash"]
    if isinstance(password_hash, str):
        password_hash = password_hash.encode("utf-8")

    if not bcrypt.checkpw(password.encode("utf-8"), password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_session_token(user["id"])
    billing = get_user_billing_by_user_id(conn, user["id"])

    return {
        "ok": True,
        "message": "Logged in",
        "access_token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "home_id": user.get("home_id"),
            "first_name": user.get("first_name"),
            "last_name": user.get("last_name"),
            "is_active": bool(billing and billing.get("is_active")),
            "subscription_status": billing.get("subscription_status") if billing else "inactive",
            "plan_name": billing.get("plan_name") if billing else None,
        }
    }


@router.post("/logout")
def logout():
    return {
        "ok": True,
        "message": "Logged out"
    }


@router.get("/check")
def check_auth(
    authorization: str | None = Header(default=None),
    conn=Depends(get_db)
):
    payload = _get_bearer_payload(authorization)
    if not payload:
        return {"authenticated": False}

    raw_user_id = payload.get("sub")
    try:
        user_id = int(raw_user_id)
    except (TypeError, ValueError):
        return {"authenticated": False}

    ensure_billing_columns(conn)
    user = _get_user_by_id(conn, user_id)

    if not user or user.get("archived") is True or user.get("is_active") is False:
        return {"authenticated": False}

    billing = get_user_billing_by_user_id(conn, user_id)

    return {
        "authenticated": True,
        "user_id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "home_id": user.get("home_id"),
        "is_active": bool(billing and billing.get("is_active")),
        "subscription_status": billing.get("subscription_status") if billing else "inactive",
        "plan_name": billing.get("plan_name") if billing else None,
    }


@router.get("/me")
def get_me(
    authorization: str | None = Header(default=None),
    conn=Depends(get_db)
):
    payload = _get_bearer_payload(authorization)
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")

    raw_user_id = payload.get("sub")
    if raw_user_id is None:
        raise HTTPException(status_code=401, detail="Invalid session")

    try:
        user_id = int(raw_user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid session")

    ensure_billing_columns(conn)
    user = _get_user_by_id(conn, user_id)

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if user.get("archived") is True:
        raise HTTPException(status_code=403, detail="User is archived")

    if user.get("is_active") is False:
        raise HTTPException(status_code=403, detail="User account is inactive")

    billing = get_user_billing_by_user_id(conn, user_id)

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
            "is_active": bool(billing and billing.get("is_active")),
            "subscription_status": billing.get("subscription_status") if billing else "inactive",
            "plan_name": billing.get("plan_name") if billing else None,
            "stripe_customer_id": billing.get("stripe_customer_id") if billing else None,
            "stripe_subscription_id": billing.get("stripe_subscription_id") if billing else None,
            "current_period_end": billing.get("current_period_end") if billing else None,
        }
    }
