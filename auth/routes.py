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


@router.post("/login")
def login(payload: LoginRequest, conn=Depends(get_db)):
    ensure_billing_columns(conn)

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
                archived
            FROM users
            WHERE email = %s
            LIMIT 1
            """,
            (payload.email.strip(),)
        )
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get("archived") is True:
        raise HTTPException(status_code=403, detail="User is archived")

    password_hash = user["password_hash"]

    if isinstance(password_hash, str):
        password_hash = password_hash.encode()

    if not bcrypt.checkpw(payload.password.encode(), password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_session_token(
        user["id"],
        user["email"],
        user["role"],
        user.get("home_id")
    )

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
        return {
            "authenticated": False
        }

    user_id = payload.get("sub")

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return {
            "authenticated": False
        }

    ensure_billing_columns(conn)
    billing = get_user_billing_by_user_id(conn, user_id)

    return {
        "authenticated": True,
        "user_id": payload.get("sub"),
        "email": payload.get("email"),
        "role": payload.get("role"),
        "home_id": payload.get("home_id"),
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

    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid session")

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid session")

    ensure_billing_columns(conn)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                u.id,
                u.email,
                u.role,
                u.home_id,
                u.first_name,
                u.last_name,
                u.archived,
                u.updated_at,
                u.created_at,
                h.name AS home_name
            FROM users u
            LEFT JOIN homes h
                ON h.id = u.home_id
            WHERE u.id = %s
            LIMIT 1
            """,
            (user_id,)
        )
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if user.get("archived") is True:
        raise HTTPException(status_code=403, detail="User is archived")

    billing = get_user_billing_by_user_id(conn, user_id)

    return {
        "ok": True,
        "user": {
            **dict(user),
            "is_active": bool(billing and billing.get("is_active")),
            "subscription_status": billing.get("subscription_status") if billing else "inactive",
            "plan_name": billing.get("plan_name") if billing else None,
            "stripe_customer_id": billing.get("stripe_customer_id") if billing else None,
            "stripe_subscription_id": billing.get("stripe_subscription_id") if billing else None,
            "current_period_end": billing.get("current_period_end") if billing else None,
        }
    }
