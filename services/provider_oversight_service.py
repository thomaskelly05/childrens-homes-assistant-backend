from __future__ import annotations

from collections import Counter
from typing import Any

from auth.permissions import MANAGER_LEVEL_ROLES, PROVIDER_LEVEL_ROLES
from auth.rbac import normalise_role


class ProviderOversightService:
    """Provider-level summaries built only from supplied, authorised home records."""

    def overview(self, *, current_user: dict[str, Any], homes: list[dict[str, Any]], action_plans: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        self._assert_manager_view(current_user)
        provider_id = current_user.get("provider_id") or current_user.get("providerId")
        visible_homes = [home for home in homes if self._home_visible(current_user, home, provider_id)]
        actions = [action for action in action_plans or [] if self._action_visible(action, visible_homes)]
        status_counts = Counter(str(action.get("status") or "open") for action in actions)
        return {
            "provider_id": provider_id,
            "home_count": len(visible_homes),
            "homes": [
                {
                    "home_id": home.get("id") or home.get("home_id"),
                    "name": home.get("name"),
                    "inspection_readiness": home.get("inspection_readiness") or "not_sampled",
                    "safeguarding_escalations": int(home.get("safeguarding_escalations") or 0),
                    "training_overdue": int(home.get("training_overdue") or 0),
                }
                for home in visible_homes
            ],
            "action_plan_tracking": dict(status_counts),
            "guardrail": "Provider oversight is manager-only and uses caller-supplied authorised home records.",
        }

    def _assert_manager_view(self, current_user: dict[str, Any]) -> None:
        role = normalise_role(current_user.get("role"))
        if role not in PROVIDER_LEVEL_ROLES | MANAGER_LEVEL_ROLES:
            raise PermissionError("Provider oversight is manager-only")

    def _home_visible(self, current_user: dict[str, Any], home: dict[str, Any], provider_id: Any) -> bool:
        role = normalise_role(current_user.get("role"))
        if role in PROVIDER_LEVEL_ROLES:
            return provider_id is None or str(home.get("provider_id") or home.get("providerId") or provider_id) == str(provider_id)
        allowed = {str(value) for value in current_user.get("allowed_home_ids") or current_user.get("home_ids") or [current_user.get("home_id")]}
        return str(home.get("id") or home.get("home_id")) in allowed

    def _action_visible(self, action: dict[str, Any], visible_homes: list[dict[str, Any]]) -> bool:
        home_ids = {str(home.get("id") or home.get("home_id")) for home in visible_homes}
        return str(action.get("home_id") or action.get("homeId")) in home_ids


provider_oversight_service = ProviderOversightService()
