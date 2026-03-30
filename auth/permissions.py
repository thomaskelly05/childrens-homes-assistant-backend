from collections.abc import Iterable
from typing import Any

from fastapi import Depends, HTTPException, Path, Query, status

from auth.current_user import get_current_user


def _normalise_role(role: str | None) -> str:
    return (role or "").strip().lower()


def _as_int(value: Any, field_name: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        ) from exc


def _forbidden(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=detail,
    )


def _ensure_role(user: dict[str, Any], allowed_roles: set[str]) -> dict[str, Any]:
    role = _normalise_role(user.get("role"))
    if role not in allowed_roles:
        raise _forbidden("You do not have permission to access this resource")
    return user


def _ensure_home_access(user: dict[str, Any], target_home_id: int) -> dict[str, Any]:
    role = _normalise_role(user.get("role"))
    user_home_id = user.get("home_id")

    if role in {"admin", "provider_admin"}:
        return user

    if user_home_id is None:
        raise _forbidden("No home access assigned to this account")

    if int(user_home_id) != int(target_home_id):
        raise _forbidden("You do not have permission to access this home")

    return user


def require_authenticated_user(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return current_user


def require_admin(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return _ensure_role(current_user, {"admin"})


def require_provider_admin(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return _ensure_role(current_user, {"provider_admin", "admin"})


def require_manager_or_admin(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return _ensure_role(current_user, {"manager", "admin", "provider_admin"})


def require_staff_or_manager(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return _ensure_role(
        current_user,
        {"staff", "senior", "manager", "admin", "provider_admin"},
    )


def role_required(*roles: str):
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
    role = _normalise_role(current_user.get("role"))
    if role in {"admin", "provider_admin"}:
        return current_user

    user_home_id = current_user.get("home_id")
    if user_home_id is None:
        raise _forbidden("No home access assigned to this account")

    allowed_home_ids = {int(h) for h in home_ids}
    if int(user_home_id) not in allowed_home_ids:
        raise _forbidden("You do not have permission to access these records")

    return current_user


def require_active_subscription(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if not bool(current_user.get("subscription_active")):
        raise _forbidden("Subscription required")
    return current_user
