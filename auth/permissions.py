from collections.abc import Iterable
from typing import Any

from fastapi import Depends, HTTPException, Path, Query, status

from auth.current_user import get_current_user
from auth.errors import forbidden
from auth.rbac import (
    StaffRole,
    normalise_role,
)
from core.policy_engine import context_from_user, permissions_for_context, policy_engine
from core.provider_context import ProviderContextError


PROVIDER_LEVEL_ROLES = {
    StaffRole.ADMIN.value,
    "provider_admin",
    "super_admin",
    "superadmin",
    "founder",
    "owner",
    "administrator",
    "ri",
    "responsible_individual",
}

MANAGER_LEVEL_ROLES = {
    StaffRole.MANAGER.value,
    "registered_manager",
    StaffRole.DEPUTY_MANAGER.value,
}

STAFF_LEVEL_ROLES = {
    "staff",
    StaffRole.SUPPORT_WORKER.value,
    "senior",
    "rsw",
    "residential_support_worker",
}

READ_ONLY_ROLES = {
    StaffRole.VIEWER.value,
}


def _normalise_role(role: str | None) -> str:
    return normalise_role(role)


def _as_int(value: Any, field_name: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        ) from exc


def _forbidden(detail: str) -> HTTPException:
    return forbidden(
        "permission_denied",
        detail,
    )


def _ensure_role(user: dict[str, Any], allowed_roles: set[str]) -> dict[str, Any]:
    role = _normalise_role(user.get("role"))
    if role not in allowed_roles:
        raise _forbidden("You do not have permission to access this resource")
    return user


def _ensure_home_access(user: dict[str, Any], target_home_id: int) -> dict[str, Any]:
    requested_home_id = _as_int(target_home_id, "home_id")
    try:
        context = context_from_user(user, requested_home_id=requested_home_id)
    except ProviderContextError as exc:
        raise _forbidden(str(exc)) from exc
    if context.can_access_home(requested_home_id):
        return user
    raise _forbidden("You do not have access to this home.")


def require_authenticated_user(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return current_user


def require_admin(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return _ensure_role(current_user, {StaffRole.ADMIN.value, "super_admin", "superadmin"})


def require_provider_admin(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return _ensure_role(current_user, PROVIDER_LEVEL_ROLES)


def require_manager_or_admin(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return _ensure_role(
        current_user,
        PROVIDER_LEVEL_ROLES | MANAGER_LEVEL_ROLES,
    )


def require_staff_or_manager(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return _ensure_role(
        current_user,
        PROVIDER_LEVEL_ROLES | MANAGER_LEVEL_ROLES | STAFF_LEVEL_ROLES,
    )


def require_read_access(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return _ensure_role(
        current_user,
        PROVIDER_LEVEL_ROLES | MANAGER_LEVEL_ROLES | STAFF_LEVEL_ROLES | READ_ONLY_ROLES,
    )


def require_write_access(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if not policy_engine.has_permission(current_user, "records:write"):
        raise _forbidden("You do not have permission to change records")
    return current_user


def require_assistant_access(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if not policy_engine.has_permission(current_user, "assistant:access"):
        raise _forbidden("You do not have permission to use the assistant")
    return current_user


def require_permission(permission: str):
    def dependency(
        current_user: dict[str, Any] = Depends(get_current_user),
    ) -> dict[str, Any]:
        if not policy_engine.has_permission(current_user, permission):
            raise _forbidden("You do not have permission to access this resource")
        return current_user

    return dependency


def role_required(*roles: str):
    allowed_roles = {_normalise_role(role) for role in roles if role}

    def dependency(
        current_user: dict[str, Any] = Depends(get_current_user),
    ) -> dict[str, Any]:
        return _ensure_role(current_user, allowed_roles)

    return dependency


def require_role(roles: Iterable[str]):
    allowed_roles = {_normalise_role(role) for role in roles if role}

    def dependency(
        current_user: dict[str, Any] = Depends(get_current_user),
    ) -> dict[str, Any]:
        return _ensure_role(current_user, allowed_roles)

    return dependency


def home_access_required_from_path(param_name: str = "home_id"):
    def dependency(
        current_user: dict[str, Any] = Depends(get_current_user),
        home_id: int = Path(...),
    ) -> dict[str, Any]:
        target_home_id = _as_int(home_id, param_name)
        return _ensure_home_access(current_user, target_home_id)

    return dependency


def home_access_required_from_query(param_name: str = "home_id"):
    def dependency(
        current_user: dict[str, Any] = Depends(get_current_user),
        home_id: int = Query(...),
    ) -> dict[str, Any]:
        target_home_id = _as_int(home_id, param_name)
        return _ensure_home_access(current_user, target_home_id)

    return dependency


def require_same_home_or_admin(
    home_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return _ensure_home_access(current_user, _as_int(home_id, "home_id"))


def require_any_home_access(
    home_ids: Iterable[int],
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        context = context_from_user(current_user)
    except ProviderContextError as exc:
        raise _forbidden(str(exc)) from exc
    if context.provider_oversight_access:
        return current_user
    allowed_home_ids = {_as_int(h, "home_id") for h in home_ids}

    if not any(home_id in context.home_ids for home_id in allowed_home_ids):
        raise _forbidden("You do not have permission to access these records")

    return current_user


def require_active_subscription(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    role = _normalise_role(current_user.get("role"))

    if role in PROVIDER_LEVEL_ROLES:
        return current_user

    if not bool(current_user.get("subscription_active")):
        raise _forbidden("Subscription required")

    return current_user


def user_permissions(current_user: dict[str, Any]) -> list[str]:
    return sorted(permissions_for_context(current_user))
