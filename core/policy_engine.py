from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from auth.rbac import StaffRole, normalise_role, permissions_for_role
from core.provider_context import ProviderContext, resolve_provider_context

CANONICAL_PERMISSIONS: frozenset[str] = frozenset(
    {
        "records:read",
        "records:write",
        "chronology:read",
        "chronology:write",
        "safeguarding:review",
        "governance:review",
        "inspection:review",
        "assistant:access",
        "provider:oversight",
        "realtime:subscribe",
        "evidence:review",
        "orb:access",
    }
)

ENTERPRISE_PERMISSIONS_BY_ROLE: dict[str, frozenset[str]] = {
    StaffRole.ADMIN.value: CANONICAL_PERMISSIONS,
    StaffRole.MANAGER.value: CANONICAL_PERMISSIONS - {"provider:oversight"},
    StaffRole.DEPUTY_MANAGER.value: CANONICAL_PERMISSIONS
    - {"provider:oversight", "governance:review"},
    StaffRole.SUPPORT_WORKER.value: frozenset(
        {
            "records:read",
            "records:write",
            "chronology:read",
            "chronology:write",
            "safeguarding:review",
            "assistant:access",
            "realtime:subscribe",
            "orb:access",
        }
    ),
    StaffRole.VIEWER.value: frozenset({"records:read", "chronology:read"}),
}


@dataclass(frozen=True)
class PolicyDecision:
    allowed: bool
    permission: str
    reason: str
    context: ProviderContext


def permissions_for_context(current_user: dict[str, Any]) -> frozenset[str]:
    role = normalise_role(current_user.get("role"))
    base = set(permissions_for_role(role))
    base.update(ENTERPRISE_PERMISSIONS_BY_ROLE.get(role, frozenset()))
    explicit = current_user.get("permissions")
    if isinstance(explicit, (list, tuple, set)):
        base.update(str(item) for item in explicit if str(item))
    return frozenset(base)


def context_from_user(current_user: dict[str, Any], **kwargs: Any) -> ProviderContext:
    return resolve_provider_context(
        {**current_user, "permissions": sorted(permissions_for_context(current_user))},
        **kwargs,
    )


class PolicyEngine:
    def evaluate(
        self,
        current_user: dict[str, Any],
        permission: str,
        *,
        home_id: int | str | None = None,
        provider_id: int | str | None = None,
    ) -> PolicyDecision:
        context = context_from_user(current_user)
        if permission not in CANONICAL_PERMISSIONS and permission not in context.permissions:
            return PolicyDecision(False, permission, "permission_not_registered", context)
        if permission not in context.permissions:
            return PolicyDecision(False, permission, "permission_not_granted", context)
        if home_id is not None and not context.can_access_home(home_id):
            return PolicyDecision(False, permission, "home_scope_denied", context)
        if provider_id is not None and not context.can_access_provider(provider_id):
            return PolicyDecision(False, permission, "provider_scope_denied", context)
        return PolicyDecision(True, permission, "allowed", context)

    def has_permission(
        self,
        current_user: dict[str, Any],
        permission: str,
        *,
        home_id: int | str | None = None,
        provider_id: int | str | None = None,
    ) -> bool:
        try:
            return self.evaluate(current_user, permission, home_id=home_id, provider_id=provider_id).allowed
        except PermissionError:
            return False


policy_engine = PolicyEngine()
