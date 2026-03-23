import logging

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from psycopg2 import OperationalError, ProgrammingError
from psycopg2.extras import RealDictCursor

from auth.tokens import decode_session_token
from db.billing_db import get_user_billing_by_user_id
from db.connection import get_db

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)
SESSION_COOKIE_NAME = "indicare_session"

BILLING_EXEMPT_PREFIXES = (
    "/billing/webhook",
    "/health",
    "/health/ready",
    "/login",
    "/login.html",
    "/oslogin",
    "/oslogin.html",
    "/css",
    "/js",
    "/assets",
    "/components",
)


def get_bearer_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str | None:
    if not credentials:
        return None

    if credentials.scheme.lower() != "bearer":
        return None

    token = (credentials.credentials or "").strip()
    return token or None


def _get_request_token(request: Request, bearer_token: str | None) -> str | None:
    cookie_token = (request.cookies.get(SESSION_COOKIE_NAME) or "").strip()

    # Prefer cookie session for browser flows, fallback to Authorization header
    if cookie_token:
        return cookie_token

    if bearer_token:
        return bearer_token

    return None


def _get_user_by_id(conn, user_id: int) -> dict | None:
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
            (user_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def _is_billing_exempt_path(request_path: str) -> bool:
    return any(request_path.startswith(prefix) for prefix in BILLING_EXEMPT_PREFIXES)


def _get_billing_safe(conn, user_id: int) -> dict | None:
    """
    Fetch billing without breaking authentication if billing tables/columns
    are temporarily unavailable during deploys or migrations.
    """
    try:
        billing = get_user_billing_by_user_id(conn, user_id)
        return dict(billing) if billing else None
    except ProgrammingError as exc:
        logger.exception("Billing schema/query error while authenticating user_id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing system unavailable",
        ) from exc
    except OperationalError as exc:
        logger.exception("Billing database operational error while authenticating user_id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing system unavailable",
        ) from exc


def get_current_user(
    request: Request,
    bearer_token: str | None = Depends(get_bearer_token),
    conn=Depends(get_db),
):
    token = _get_request_token(request, bearer_token)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    payload = decode_session_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    raw_user_id = payload.get("sub")
    if raw_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session payload",
        )

    try:
        user_id = int(raw_user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session subject",
        )

    try:
        user = _get_user_by_id(conn, user_id)
    except OperationalError as exc:
        logger.exception("Database error loading current user user_id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication database unavailable",
        ) from exc

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.get("archived") is True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is archived",
        )

    if user.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    request_path = request.url.path
    is_exempt = _is_billing_exempt_path(request_path)

    billing = None
    subscription_active = False
    subscription_status = "inactive"
    plan_name = None

    if not is_exempt:
        billing = _get_billing_safe(conn, user_id)
        subscription_active = bool(billing and billing.get("is_active"))
        subscription_status = billing.get("subscription_status") if billing else "inactive"
        plan_name = billing.get("plan_name") if billing else None

        if not subscription_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Subscription required",
            )
    else:
        # Optional best-effort billing lookup for exempt routes.
        try:
            billing = get_user_billing_by_user_id(conn, user_id)
            if billing:
                billing = dict(billing)
                subscription_active = bool(billing.get("is_active"))
                subscription_status = billing.get("subscription_status") or "inactive"
                plan_name = billing.get("plan_name")
        except Exception:
            logger.warning(
                "Best-effort billing lookup failed for exempt path=%s user_id=%s",
                request_path,
                user_id,
                exc_info=True,
            )

    role = (user.get("role") or "").strip().lower()

    return {
        **user,
        "user_id": user["id"],
        "email": user.get("email"),
        "role": role,
        "home_id": user.get("home_id"),
        "subscription_active": subscription_active,
        "subscription_status": subscription_status,
        "plan_name": plan_name,
    }
