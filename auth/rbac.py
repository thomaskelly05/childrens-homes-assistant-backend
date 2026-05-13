from __future__ import annotations

from enum import StrEnum
from typing import Iterable


class StaffRole(StrEnum):
    ADMIN = "admin"
    MANAGER = "manager"
    DEPUTY_MANAGER = "deputy_manager"
    SUPPORT_WORKER = "support_worker"
    VIEWER = "viewer"


CANONICAL_STAFF_ROLES: tuple[str, ...] = tuple(role.value for role in StaffRole)

ROLE_ALIASES: dict[str, StaffRole] = {
    "administrator": StaffRole.ADMIN,
    "provider_admin": StaffRole.ADMIN,
    "responsible_individual": StaffRole.ADMIN,
    "ri": StaffRole.ADMIN,
    "owner": StaffRole.ADMIN,
    "super_admin": StaffRole.ADMIN,
    "superadmin": StaffRole.ADMIN,
    "registered_manager": StaffRole.MANAGER,
    "regional_manager": StaffRole.MANAGER,
    "deputy": StaffRole.DEPUTY_MANAGER,
    "staff": StaffRole.SUPPORT_WORKER,
    "senior": StaffRole.SUPPORT_WORKER,
    "rsw": StaffRole.SUPPORT_WORKER,
    "residential_support_worker": StaffRole.SUPPORT_WORKER,
    "support": StaffRole.SUPPORT_WORKER,
    "read_only": StaffRole.VIEWER,
    "readonly": StaffRole.VIEWER,
}

PERMISSIONS_BY_ROLE: dict[StaffRole, frozenset[str]] = {
    StaffRole.ADMIN: frozenset(
        {
            "assistant:access",
            "assistant:quality",
            "assistant:send_reports",
            "audit:read",
            "billing:manage",
            "records:read",
            "records:write",
            "reports:read",
            "reports:write",
            "staff:read",
            "staff:manage",
            "settings:manage",
            "users:manage",
        }
    ),
    StaffRole.MANAGER: frozenset(
        {
            "assistant:access",
            "assistant:quality",
            "assistant:send_reports",
            "audit:read",
            "records:read",
            "records:write",
            "reports:read",
            "reports:write",
            "staff:read",
            "staff:manage",
            "settings:read",
        }
    ),
    StaffRole.DEPUTY_MANAGER: frozenset(
        {
            "assistant:access",
            "assistant:quality",
            "audit:read",
            "records:read",
            "records:write",
            "reports:read",
            "reports:write",
            "staff:read",
            "settings:read",
        }
    ),
    StaffRole.SUPPORT_WORKER: frozenset(
        {
            "assistant:access",
            "records:read",
            "records:write",
            "reports:read",
            "staff:read",
        }
    ),
    StaffRole.VIEWER: frozenset(
        {
            "records:read",
            "reports:read",
            "staff:read",
        }
    ),
}


def normalise_role(role: str | None) -> str:
    cleaned = (role or "").strip().lower()
    if not cleaned:
        return ""
    aliased = ROLE_ALIASES.get(cleaned)
    if aliased is not None:
        return aliased.value
    if cleaned in CANONICAL_STAFF_ROLES:
        return StaffRole(cleaned).value
    return cleaned


def canonical_role(role: str | None) -> StaffRole | None:
    cleaned = normalise_role(role)
    try:
        return StaffRole(cleaned)
    except ValueError:
        return None


def permissions_for_role(role: str | None) -> frozenset[str]:
    staff_role = canonical_role(role)
    if staff_role is None:
        return frozenset()
    return PERMISSIONS_BY_ROLE[staff_role]


def has_permission(role: str | None, permission: str) -> bool:
    return permission in permissions_for_role(role)


def role_in(role: str | None, allowed_roles: Iterable[str]) -> bool:
    allowed = {normalise_role(candidate) for candidate in allowed_roles if candidate}
    return normalise_role(role) in allowed


def is_staff_role(role: str | None) -> bool:
    return canonical_role(role) is not None
