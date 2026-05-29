from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not str(raw).strip():
        return default
    try:
        return max(0, int(str(raw).strip()))
    except ValueError:
        return default


@dataclass(frozen=True)
class OrbPlanLimits:
    plan_name: str
    included_monthly_messages: int
    included_deep_messages: int
    included_document_lenses: int
    included_deep_research: int
    max_document_size_mb: int
    daily_soft_limit: int
    daily_hard_limit: int
    monthly_soft_limit: int
    monthly_hard_limit: int


PLAN_DEFAULTS: dict[str, dict[str, int]] = {
    "orb_residential_individual": {
        "included_monthly_messages": 900,
        "included_deep_messages": 120,
        "included_document_lenses": 60,
        "included_deep_research": 30,
        "max_document_size_mb": 12,
        "daily_soft_limit": 120,
        "daily_hard_limit": 250,
        "monthly_soft_limit": 900,
        "monthly_hard_limit": 1500,
    },
    "founding_plan": {
        "included_monthly_messages": 2000,
        "included_deep_messages": 300,
        "included_document_lenses": 150,
        "included_deep_research": 80,
        "max_document_size_mb": 20,
        "daily_soft_limit": 300,
        "daily_hard_limit": 600,
        "monthly_soft_limit": 2000,
        "monthly_hard_limit": 4000,
    },
    "admin": {
        "included_monthly_messages": 100000,
        "included_deep_messages": 100000,
        "included_document_lenses": 100000,
        "included_deep_research": 100000,
        "max_document_size_mb": 50,
        "daily_soft_limit": 100000,
        "daily_hard_limit": 100000,
        "monthly_soft_limit": 100000,
        "monthly_hard_limit": 100000,
    },
    "enterprise": {
        "included_monthly_messages": 5000,
        "included_deep_messages": 800,
        "included_document_lenses": 400,
        "included_deep_research": 200,
        "max_document_size_mb": 30,
        "daily_soft_limit": 500,
        "daily_hard_limit": 1000,
        "monthly_soft_limit": 5000,
        "monthly_hard_limit": 10000,
    },
}


class OrbPlanLimitsService:
    """Configurable fair-use limits for standalone ORB subscription plans."""

    def resolve_plan_name(self, user: dict[str, Any] | None) -> str:
        if not user:
            return "orb_residential_individual"
        role = str(user.get("role") or "").strip().lower()
        if role in {"admin", "super_admin", "superadmin"}:
            return "admin"
        plan = str(user.get("plan_name") or user.get("subscription_plan") or "").strip().lower()
        if "founding" in plan:
            return "founding_plan"
        if "enterprise" in plan or "provider" in plan:
            return "enterprise"
        return "orb_residential_individual"

    def get_limits(self, plan_name: str | None = None, *, user: dict[str, Any] | None = None) -> OrbPlanLimits:
        resolved = plan_name or self.resolve_plan_name(user)
        defaults = PLAN_DEFAULTS.get(resolved, PLAN_DEFAULTS["orb_residential_individual"])
        prefix = resolved.upper()
        return OrbPlanLimits(
            plan_name=resolved,
            included_monthly_messages=_env_int(f"ORB_{prefix}_MONTHLY_MESSAGES", defaults["included_monthly_messages"]),
            included_deep_messages=_env_int(f"ORB_{prefix}_DEEP_MESSAGES", defaults["included_deep_messages"]),
            included_document_lenses=_env_int(f"ORB_{prefix}_DOCUMENT_LENSES", defaults["included_document_lenses"]),
            included_deep_research=_env_int(f"ORB_{prefix}_DEEP_RESEARCH", defaults["included_deep_research"]),
            max_document_size_mb=_env_int(f"ORB_{prefix}_MAX_DOCUMENT_MB", defaults["max_document_size_mb"]),
            daily_soft_limit=_env_int(f"ORB_{prefix}_DAILY_SOFT", defaults["daily_soft_limit"]),
            daily_hard_limit=_env_int(f"ORB_{prefix}_DAILY_HARD", defaults["daily_hard_limit"]),
            monthly_soft_limit=_env_int(f"ORB_{prefix}_MONTHLY_SOFT", defaults["monthly_soft_limit"]),
            monthly_hard_limit=_env_int(f"ORB_{prefix}_MONTHLY_HARD", defaults["monthly_hard_limit"]),
        )

    def limit_state(
        self,
        *,
        plan_name: str | None,
        user: dict[str, Any] | None,
        daily_requests: int,
        monthly_requests: int,
        monthly_deep: int = 0,
        monthly_document: int = 0,
        monthly_deep_research: int = 0,
    ) -> dict[str, Any]:
        limits = self.get_limits(plan_name, user=user)
        soft = False
        hard = False
        if daily_requests >= limits.daily_hard_limit:
            hard = True
        elif daily_requests >= limits.daily_soft_limit:
            soft = True
        if monthly_requests >= limits.monthly_hard_limit:
            hard = True
        elif monthly_requests >= limits.monthly_soft_limit:
            soft = True
        if monthly_deep >= limits.included_deep_messages:
            soft = True
        if monthly_document >= limits.included_document_lenses:
            soft = True
        if monthly_deep_research >= limits.included_deep_research:
            soft = True
        return {
            "soft_limit_reached": soft and not hard,
            "hard_limit_reached": hard,
            "plan_name": limits.plan_name,
            "plan_limit_summary": {
                "included_monthly_messages": limits.included_monthly_messages,
                "included_deep_messages": limits.included_deep_messages,
                "included_document_lenses": limits.included_document_lenses,
                "included_deep_research": limits.included_deep_research,
                "daily_soft_limit": limits.daily_soft_limit,
                "daily_hard_limit": limits.daily_hard_limit,
                "monthly_soft_limit": limits.monthly_soft_limit,
                "monthly_hard_limit": limits.monthly_hard_limit,
            },
        }


orb_plan_limits_service = OrbPlanLimitsService()
