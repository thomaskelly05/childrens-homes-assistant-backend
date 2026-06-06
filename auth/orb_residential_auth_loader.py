from __future__ import annotations

from typing import Any

from fastapi import Depends, Request

from auth.current_user import (
    _decode_user_id_from_payload,
    _enforce_session_state,
    _get_request_token,
    _load_active_user,
    _normalise_role,
    get_bearer_token,
)
from auth.errors import service_unavailable, unauthorised
from auth.rbac import permissions_for_role
from auth.tokens import decode_session_token
from db.connection import DatabaseUnavailableError, get_db


def get_orb_residential_user(
    request: Request,
    bearer_token: str | None = Depends(get_bearer_token),
    conn=Depends(get_db),
) -> dict[str, Any]:
    """Authenticate ORB Residential API requests.

    Uses the same session cookie/JWT validity and revocation checks as ``/auth/me``.
    """
    token = _get_request_token(request, bearer_token)
    if not token:
        raise unauthorised("not_authenticated", "Sign in to use ORB Residential")

    payload = decode_session_token(token)
    if not payload:
        raise unauthorised("session_invalid_or_expired", "Invalid or expired session")

    _enforce_session_state(payload, conn)
    user_id = _decode_user_id_from_payload(payload)

    try:
        user = _load_active_user(conn, user_id)
    except DatabaseUnavailableError as exc:
        raise service_unavailable("auth_service_unavailable", "Authentication database unavailable") from exc

    role = _normalise_role(user.get("role"))
    return {
        **user,
        "id": user["id"],
        "user_id": user["id"],
        "email": user.get("email"),
        "role": role,
        "home_id": user.get("home_id"),
        "homeId": user.get("home_id"),
        "provider_id": user.get("provider_id"),
        "providerId": user.get("provider_id"),
        "allowed_home_ids": [],
        "allowedHomeIds": [],
        "permissions": sorted(permissions_for_role(role)),
        "orb_residential_auth_only": True,
    }


def get_optional_orb_residential_user(
    request: Request,
    bearer_token: str | None = Depends(get_bearer_token),
    conn=Depends(get_db),
) -> dict[str, Any] | None:
    try:
        return get_orb_residential_user(request, bearer_token, conn)
    except Exception:
        return None
