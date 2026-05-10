import logging
from typing import Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from psycopg2 import OperationalError, ProgrammingError
from psycopg2.extras import RealDictCursor

from auth.routes import settings as auth_settings
from auth.tokens import decode_session_token
from db.billing_db import get_user_billing_by_user_id
from db.connection import get_db
from db.mfa_db import get_user_mfa  # Backwards-compat export for test monkeypatches
from services.session_security_service import is_session_revoked, touch_session

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)
SESSION_COOKIE_NAME = auth_settings.session_cookie_name

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
    "/admin/users",
    "/founder",
)

BILLING_EXEMPT_ROLES = {
    "admin",
    "provider_admin",
    "founder",
    "owner",
    "super_admin",
    "superadmin",
}


def get_bearer_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str | None:
    if not credentials:
        return None

    if credentials.scheme.lower() != "bearer":
        return None

    token = (credentials.credentials or "").strip()
    return token or None


def _unauthorised(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def _forbidden(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def _service_unavailable(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)


def _normalise_role(role: str | None) -> str:
    return (role or "").strip().lower()


def _get_request_token(request: Request, bearer_token: str | None) -> str | None:
    cookie_token = (request.cookies.get(SESSION_COOKIE_NAME) or "").strip()
    if cookie_token:
        return cookie_token

    if bearer_token:
        return bearer_token

    return None


def _get_user_by_id(conn: Any, user_id: int) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id,
                email,
                role,
                home_id,
                provider_id,
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


def _is_billing_exempt_role(role: str | None) -> bool:
    return _normalise_role(role) in BILLING_EXEMPT_ROLES


def _get_billing_safe(conn: Any, user_id: int) -> dict[str, Any] | None:
    try:
        billing = get_user_billing_by_user_id(conn, user_id)
        return dict(billing) if billing else None
    except ProgrammingError as exc:
        logger.exception(
            "Billing schema/query error while authenticating user_id=%s",
            user_id,
        )
        raise _service_unavailable("Billing system unavailable") from exc
    except OperationalError as exc:
        logger.exception(
            "Billing database operational error while authenticating user_id=%s",
            user_id,
        )
        raise _service_unavailable("Billing system unavailable") from exc


def _decode_session_payload(token: str) -> dict[str, Any]:
    payload = decode_session_token(token)
    if not payload:
        raise _unauthorised("Invalid or expired session")
    return payload


def _decode_user_id_from_payload(payload: dict[str, Any]) -> int:
    raw_user_id = payload.get("sub")
    if raw_user_id is None:
        raise _unauthorised("Invalid session payload")

    try:
        return int(raw_user_id)
    except (TypeError, ValueError) as exc:
        raise _unauthorised("Invalid session subject") from exc


def _enforce_session_state(payload: dict[str, Any]) -> None:
    session_id = payload.get("sid")
    if session_id and is_session_revoked(str(session_id)):
        raise _unauthorised("Session has been revoked")
    if session_id:
        touch_session(str(session_id))


def _load_active_user(conn: Any, user_id: int) -> dict[str, Any]:
    try:
        user = _get_user_by_id(conn, user_id)
    except OperationalError as exc:
        logger.exception("Database error loading current user user_id=%s", user_id)
        raise _service_unavailable("Authentication database unavailable") from exc

    if not user:
        raise _unauthorised("User not found")

    if user.get("archived") is True:
        raise _forbidden("User account is archived")

    if user.get("is_active") is False:
        raise _forbidden("User account is inactive")

    return user


def _extract_billing_state(
    conn: Any,
    user_id: int,
    *,
    is_exempt: bool,
    request_path: str,
) -> tuple[bool, str, str | None]:
    subscription_active = False
    subscription_status = "inactive"
    plan_name = None

    try:
        billing = _get_billing_safe(conn, user_id)
        if billing:
            subscription_active = bool(billing.get("subscription_active"))
            subscription_status = billing.get("subscription_status") or "inactive"
            plan_name = billing.get("plan_name")
    except HTTPException:
        if not is_exempt:
            logger.exception(
                "Required billing lookup failed for user_id=%s path=%s",
                user_id,
                request_path,
            )
            raise

        logger.warning(
            "Best-effort billing lookup failed for exempt request path=%s user_id=%s",
            request_path,
            user_id,
            exc_info=True,
        )

    if is_exempt and not subscription_active:
        subscription_active = True
        subscription_status = "exempt"

    return subscription_active, subscription_status, plan_name


def get_current_user(
    request: Request,
    bearer_token: str | None = Depends(get_bearer_token),
    conn=Depends(get_db),
):
    token = _get_request_token(request, bearer_token)
    if not token:
        raise _unauthorised("Not authenticated")

    payload = _decode_session_payload(token)
    _enforce_session_state(payload)
    user_id = _decode_user_id_from_payload(payload)
    user = _load_active_user(conn, user_id)

    role = _normalise_role(user.get("role"))
    request_path = request.url.path
    is_exempt = _is_billing_exempt_path(request_path) or _is_billing_exempt_role(role)

    subscription_active, subscription_status, plan_name = _extract_billing_state(
        conn,
        user_id,
        is_exempt=is_exempt,
        request_path=request_path,
    )

    if not is_exempt and not subscription_active:
        raise _forbidden("Subscription required")

    home_id = user.get("home_id")
    provider_id = user.get("provider_id")

    allowed_home_ids = []
    if home_id is not None:
        try:
            allowed_home_ids = [int(home_id)]
        except (TypeError, ValueError):
            allowed_home_ids = []

    return {
        **user,
        "id": user["id"],
        "user_id": user["id"],
        "email": user.get("email"),
        "role": role,
        "home_id": home_id,
        "homeId": home_id,
        "provider_id": provider_id,
        "providerId": provider_id,
        "allowed_home_ids": allowed_home_ids,
        "allowedHomeIds": allowed_home_ids,
        "subscription_active": subscription_active,
        "subscription_status": subscription_status,
        "plan_name": plan_name,
    }
