from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from psycopg2.extras import RealDictCursor

from db.connection import get_db
from db.billing_db import ensure_billing_columns, get_user_billing_by_user_id
from auth.tokens import decode_session_token

security = HTTPBearer(auto_error=False)
SESSION_COOKIE_NAME = "indicare_session"


def get_bearer_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(security)
) -> str | None:
    if not credentials:
        return None

    if credentials.scheme.lower() != "bearer":
        return None

    return credentials.credentials


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
                created_at,
                updated_at
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,)
        )
        row = cur.fetchone()
        return dict(row) if row else None


def get_current_user(
    request: Request,
    bearer_token: str | None = Depends(get_bearer_token),
    conn=Depends(get_db)
):
    cookie_token = request.cookies.get(SESSION_COOKIE_NAME)
    token = cookie_token or bearer_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    payload = decode_session_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )

    raw_user_id = payload.get("sub")
    if not raw_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session payload"
        )

    try:
        user_id = int(raw_user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session subject"
        )

    user = _get_user_by_id(conn, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if user.get("archived") is True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is archived"
        )

    if user.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    ensure_billing_columns(conn)
    billing = get_user_billing_by_user_id(conn, user_id)

    request_path = request.url.path
    billing_exempt_prefixes = (
        "/billing/webhook",
        "/health",
        "/login",
        "/login.html",
        "/oslogin",
        "/oslogin.html",
        "/css",
        "/js",
        "/assets",
        "/components"
    )
    is_exempt = any(request_path.startswith(prefix) for prefix in billing_exempt_prefixes)

    if not is_exempt:
        subscription_active = bool(billing and billing.get("is_active"))
        if not subscription_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Subscription required"
            )

    return {
        **user,
        "user_id": user["id"],
        "email": user.get("email"),
        "role": user.get("role"),
        "home_id": user.get("home_id"),
        "subscription_active": bool(billing and billing.get("is_active")),
        "subscription_status": billing.get("subscription_status") if billing else "inactive",
        "plan_name": billing.get("plan_name") if billing else None,
    }
