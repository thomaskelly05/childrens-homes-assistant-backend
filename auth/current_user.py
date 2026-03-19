from fastapi import Header, HTTPException, Request, Depends

from auth.tokens import decode_session_token
from db.connection import get_db
from db.billing_db import ensure_billing_columns, get_user_billing_by_user_id


def get_bearer_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")

    parts = authorization.split(" ", 1)

    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = parts[1].strip()

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return token


def get_current_user(
    request: Request,
    authorization: str | None = Header(default=None),
    conn=Depends(get_db)
):
    token = get_bearer_token(authorization)

    payload = decode_session_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    email = payload.get("email")
    role = payload.get("role")
    home_id = payload.get("home_id")

    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token payload")

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

    is_active = bool(billing and billing.get("is_active"))

    if not is_exempt and not is_active:
        raise HTTPException(status_code=403, detail="Subscription required")

    return {
        "id": user_id,
        "user_id": user_id,
        "email": email,
        "role": role,
        "home_id": home_id,
        "is_active": is_active,
        "subscription_status": billing.get("subscription_status") if billing else "inactive",
        "plan_name": billing.get("plan_name") if billing else None,
        "stripe_customer_id": billing.get("stripe_customer_id") if billing else None,
        "stripe_subscription_id": billing.get("stripe_subscription_id") if billing else None,
        "current_period_end": billing.get("current_period_end") if billing else None,
    }
