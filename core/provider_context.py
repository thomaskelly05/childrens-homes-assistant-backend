from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from auth.rbac import normalise_role, permissions_for_role

TenancyScope = Literal["none", "home", "provider", "platform"]


class ProviderContextError(PermissionError):
    """Raised when a request cannot be resolved to a safe provider/home scope."""


def _safe_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _int_values(value: Any) -> tuple[int, ...]:
    if value in (None, ""):
        return ()
    values = value if isinstance(value, (list, tuple, set)) else [value]
    clean = {_safe_int(item) for item in values}
    return tuple(sorted(item for item in clean if item is not None))


def _is_platform_role(raw_role: str, provider_id: int | None) -> bool:
    if raw_role in {"super_admin", "superadmin", "founder", "owner"}:
        return True
    return raw_role == "admin" and provider_id is None


@dataclass(frozen=True)
class ProviderContext:
    provider_id: int | None
    home_ids: tuple[int, ...] = field(default_factory=tuple)
    primary_home_id: int | None = None
    user_id: int | None = None
    role: str = ""
    permissions: frozenset[str] = field(default_factory=frozenset)
    tenancy_scope: TenancyScope = "none"
    read_only: bool = True
    governance_access: bool = False
    provider_oversight_access: bool = False
    assistant_access: bool = False
    chronology_access: bool = False
    realtime_access: bool = False

    def can_access_home(self, home_id: int | str | None) -> bool:
        requested = _safe_int(home_id)
        if requested is None:
            return False
        if self.tenancy_scope == "platform":
            return True
        return requested in self.home_ids

    def can_access_provider(self, provider_id: int | str | None) -> bool:
        requested = _safe_int(provider_id)
        if requested is None:
            return False
        if self.tenancy_scope == "platform":
            return True
        return self.provider_id == requested and self.provider_oversight_access

    def require_home(self, home_id: int | str | None) -> None:
        if not self.can_access_home(home_id):
            raise ProviderContextError("Home scope is not permitted for this user.")

    def require_provider(self, provider_id: int | str | None) -> None:
        if not self.can_access_provider(provider_id):
            raise ProviderContextError("Provider scope is not permitted for this user.")

    def to_user_claims(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "provider_id": self.provider_id,
            "providerId": self.provider_id,
            "home_id": self.primary_home_id,
            "homeId": self.primary_home_id,
            "allowed_home_ids": list(self.home_ids),
            "allowedHomeIds": list(self.home_ids),
            "role": self.role,
            "permissions": sorted(self.permissions),
            "tenancy_scope": self.tenancy_scope,
        }


def resolve_provider_context(
    current_user: dict[str, Any],
    *,
    requested_home_id: int | str | None = None,
    requested_provider_id: int | str | None = None,
    require_home_scope: bool = False,
    require_provider_scope: bool = False,
) -> ProviderContext:
    raw_role = str(current_user.get("role") or "").strip().lower().replace("-", "_").replace(" ", "_")
    role = normalise_role(current_user.get("role"))
    permissions = frozenset(current_user.get("permissions") or permissions_for_role(role))
    provider_id = _safe_int(
        current_user.get("provider_id")
        or current_user.get("providerId")
        or current_user.get("organisation_id")
        or current_user.get("organization_id")
    )
    primary_home_id = _safe_int(
        current_user.get("home_id")
        or current_user.get("homeId")
        or current_user.get("default_home_id")
        or current_user.get("selected_home_id")
    )
    home_ids = set(
        _int_values(
            current_user.get("allowed_home_ids")
            or current_user.get("allowedHomeIds")
            or current_user.get("home_ids")
            or current_user.get("homeIds")
        )
    )
    if primary_home_id is not None:
        home_ids.add(primary_home_id)

    platform_role = _is_platform_role(raw_role, provider_id)
    provider_oversight = "provider:oversight" in permissions or platform_role
    tenancy_scope: TenancyScope
    if platform_role:
        tenancy_scope = "platform"
    elif provider_id is not None and provider_oversight:
        tenancy_scope = "provider"
    elif home_ids:
        tenancy_scope = "home"
    else:
        tenancy_scope = "none"

    context = ProviderContext(
        provider_id=provider_id,
        home_ids=tuple(sorted(home_ids)),
        primary_home_id=primary_home_id,
        user_id=_safe_int(current_user.get("user_id") or current_user.get("id") or current_user.get("sub")),
        role=role,
        permissions=permissions,
        tenancy_scope=tenancy_scope,
        read_only="records:write" not in permissions,
        governance_access="governance:review" in permissions,
        provider_oversight_access=provider_oversight,
        assistant_access="assistant:access" in permissions,
        chronology_access="chronology:read" in permissions,
        realtime_access="realtime:subscribe" in permissions,
    )

    if require_home_scope and requested_home_id is None and context.primary_home_id is None:
        raise ProviderContextError("A home scope is required.")
    if requested_home_id is not None:
        context.require_home(requested_home_id)
    if require_provider_scope and requested_provider_id is None and context.provider_id is None:
        raise ProviderContextError("A provider scope is required.")
    if requested_provider_id is not None:
        context.require_provider(requested_provider_id)
    return context


def merge_provider_context_claims(current_user: dict[str, Any]) -> dict[str, Any]:
    context = resolve_provider_context(current_user)
    return {**current_user, **context.to_user_claims()}
