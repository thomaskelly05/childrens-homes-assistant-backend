from __future__ import annotations

import logging
from typing import Any, Iterable

from fastapi import HTTPException, Request, status

logger = logging.getLogger("indicare.security.guards")

ADMIN_ROLES = {"admin", "administrator", "super_admin", "superadmin", "founder", "owner"}
PROVIDER_ROLES = ADMIN_ROLES | {"provider", "provider_admin", "director", "responsible_individual", "ri"}
RI_ROLES = PROVIDER_ROLES | {"responsible_individual", "ri"}
MANAGER_ROLES = PROVIDER_ROLES | {"registered_manager", "manager", "deputy_manager"}
STAFF_ROLES = MANAGER_ROLES | {"senior", "senior_staff", "staff", "support_worker", "key_worker"}

ROLE_GROUPS = {
    "admin": ADMIN_ROLES,
    "provider": PROVIDER_ROLES,
    "ri": RI_ROLES,
    "manager": MANAGER_ROLES,
    "staff": STAFF_ROLES,
}


def normalise_role(current_user: dict[str, Any] | None) -> str:
    if not current_user:
        return ""
    return str(current_user.get("role") or current_user.get("user_role") or current_user.get("account_role") or "").strip().lower()


def safe_int(value: Any) -> int | None:
    try:
        parsed = int(value)
        return parsed if parsed > 0 else None
    except Exception:
        return None


def user_id(current_user: dict[str, Any] | None) -> int | None:
    if not current_user:
        return None
    return safe_int(current_user.get("id") or current_user.get("user_id") or current_user.get("sub"))


def user_home_id(current_user: dict[str, Any] | None) -> int | None:
    if not current_user:
        return None
    return safe_int(current_user.get("home_id") or current_user.get("homeId") or current_user.get("selected_home_id"))


def user_provider_id(current_user: dict[str, Any] | None) -> int | None:
    if not current_user:
        return None
    return safe_int(current_user.get("provider_id") or current_user.get("providerId") or current_user.get("organisation_id") or current_user.get("org_id"))


def allowed_home_ids(current_user: dict[str, Any] | None) -> set[int]:
    if not current_user:
        return set()

    raw = current_user.get("allowed_home_ids") or current_user.get("allowedHomeIds") or []
    ids: set[int] = set()

    if isinstance(raw, (list, tuple, set)):
        for value in raw:
            parsed = safe_int(value)
            if parsed:
                ids.add(parsed)

    home_id = user_home_id(current_user)
    if home_id:
        ids.add(home_id)

    return ids


def is_role(current_user: dict[str, Any], roles: Iterable[str]) -> bool:
    role = normalise_role(current_user)
    wanted = {str(item).strip().lower() for item in roles}
    return role in wanted


def is_role_group(current_user: dict[str, Any], group: str) -> bool:
    return normalise_role(current_user) in ROLE_GROUPS.get(group, set())


def require_role_group(current_user: dict[str, Any], group: str) -> dict[str, Any]:
    if not is_role_group(current_user, group):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"{group} access required")
    return current_user


def require_home_access(current_user: dict[str, Any], target_home_id: Any, *, request: Request | None = None) -> int:
    parsed_home_id = safe_int(target_home_id)
    if not parsed_home_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid home_id is required")

    if is_role_group(current_user, "provider"):
        return parsed_home_id

    if parsed_home_id not in allowed_home_ids(current_user):
        log_denied_access(request, current_user, "home", parsed_home_id)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Home access denied")

    return parsed_home_id


def require_provider_access(current_user: dict[str, Any], target_provider_id: Any, *, request: Request | None = None) -> int:
    parsed_provider_id = safe_int(target_provider_id)
    if not parsed_provider_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid provider_id is required")

    if is_role_group(current_user, "admin"):
        return parsed_provider_id

    current_provider_id = user_provider_id(current_user)
    if current_provider_id != parsed_provider_id:
        log_denied_access(request, current_user, "provider", parsed_provider_id)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Provider access denied")

    return parsed_provider_id


def log_denied_access(request: Request | None, current_user: dict[str, Any] | None, resource_type: str, resource_id: Any) -> None:
    logger.warning(
        "denied_access user_id=%s role=%s resource_type=%s resource_id=%s path=%s ip=%s",
        user_id(current_user),
        normalise_role(current_user),
        resource_type,
        resource_id,
        request.url.path if request else None,
        request.client.host if request and request.client else None,
    )


def log_sensitive_access(request: Request | None, current_user: dict[str, Any] | None, resource_type: str, resource_id: Any, action: str = "read") -> None:
    logger.info(
        "sensitive_access user_id=%s role=%s action=%s resource_type=%s resource_id=%s path=%s ip=%s",
        user_id(current_user),
        normalise_role(current_user),
        action,
        resource_type,
        resource_id,
        request.url.path if request else None,
        request.client.host if request and request.client else None,
    )
