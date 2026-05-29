from __future__ import annotations

"""ORB Residential plan limit enforcement at request time."""

from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status
from schemas.ai_models import AiRiskLevel

from services.orb_billing_meter_service import orb_billing_meter_service
from services.orb_plan_limits_service import orb_plan_limits_service
from services.orb_subscription_plan_service import orb_subscription_plan_service
from services.orb_usage_budget_service import (
    SAFEGUARDING_LIMIT_TEMPLATE,
    orb_usage_budget_service,
)

USAGE_LIMIT_USER_MESSAGE = (
    "You've reached today's ORB usage limit. I can still give a short safety-focused response "
    "for urgent safeguarding concerns, but deeper analysis will be available again after your limit resets."
)


@dataclass
class OrbPlanEnforcementDecision:
    allowed: bool
    level: str
    message: str | None = None
    use_safeguarding_template: bool = False
    soft_limit_reached: bool = False
    hard_limit_reached: bool = False
    bypassed: bool = False
    metadata: dict[str, Any] | None = None


class OrbPlanEnforcementService:
    def check_request(
        self,
        *,
        user_id: int | None,
        user: dict[str, Any] | None,
        message: str | None = None,
        prompt_tier: str | None = None,
        risk_level: AiRiskLevel | str | None = None,
        event_type: str = "conversation",
    ) -> OrbPlanEnforcementDecision:
        if orb_usage_budget_service.user_can_bypass(user):
            return OrbPlanEnforcementDecision(allowed=True, level="ok", bypassed=True)

        budget = orb_usage_budget_service.check_budget(
            user_id=user_id,
            user=user,
            prompt_tier=prompt_tier,
            risk_level=risk_level,
            event_type=event_type,
        )
        if budget.use_safeguarding_template:
            return OrbPlanEnforcementDecision(
                allowed=True,
                level="hard",
                message=budget.message or SAFEGUARDING_LIMIT_TEMPLATE,
                use_safeguarding_template=True,
                hard_limit_reached=True,
            )
        if not budget.allowed:
            return OrbPlanEnforcementDecision(
                allowed=False,
                level="hard",
                message=budget.message or USAGE_LIMIT_USER_MESSAGE,
                hard_limit_reached=True,
            )

        plan_name = orb_subscription_plan_service.resolve_plan_for_user(user=user)
        meter = orb_billing_meter_service.user_meter(user_id=int(user_id or 0), user=user) if user_id else {}
        limit_state = orb_plan_limits_service.limit_state(
            plan_name=plan_name,
            user=user,
            daily_requests=int(meter.get("daily_requests") or 0),
            monthly_requests=int(meter.get("total_requests") or 0),
            monthly_deep=int(meter.get("deep_requests") or 0),
            monthly_document=int(meter.get("document_requests") or 0),
            monthly_deep_research=int(meter.get("deep_research_requests") or 0),
        )
        if limit_state.get("hard_limit_reached"):
            safeguarding = self._is_safeguarding(message, risk_level)
            if safeguarding:
                return OrbPlanEnforcementDecision(
                    allowed=True,
                    level="hard",
                    message=SAFEGUARDING_LIMIT_TEMPLATE,
                    use_safeguarding_template=True,
                    hard_limit_reached=True,
                    metadata=limit_state,
                )
            return OrbPlanEnforcementDecision(
                allowed=False,
                level="hard",
                message=USAGE_LIMIT_USER_MESSAGE,
                hard_limit_reached=True,
                metadata=limit_state,
            )

        soft = bool(limit_state.get("soft_limit_reached")) or budget.level == "soft"
        return OrbPlanEnforcementDecision(
            allowed=True,
            level="soft" if soft else "ok",
            message=budget.message if soft else None,
            soft_limit_reached=soft,
            metadata=limit_state if soft else None,
        )

    def enforce_or_raise(
        self,
        *,
        user_id: int | None,
        user: dict[str, Any] | None,
        message: str | None = None,
        prompt_tier: str | None = None,
        risk_level: AiRiskLevel | str | None = None,
        event_type: str = "conversation",
    ) -> OrbPlanEnforcementDecision:
        decision = self.check_request(
            user_id=user_id,
            user=user,
            message=message,
            prompt_tier=prompt_tier,
            risk_level=risk_level,
            event_type=event_type,
        )
        if decision.allowed or decision.use_safeguarding_template:
            return decision
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "usage_limit_reached",
                "message": decision.message or USAGE_LIMIT_USER_MESSAGE,
                "level": decision.level,
                "hard_limit_reached": True,
                "os_access_granted": False,
                "upgrade": {"checkout_available": True},
            },
        )

    def _is_safeguarding(self, message: str | None, risk_level: AiRiskLevel | str | None) -> bool:
        if isinstance(risk_level, AiRiskLevel):
            return risk_level == AiRiskLevel.SAFEGUARDING_SENSITIVE
        text = str(risk_level or "").strip().lower()
        if text == AiRiskLevel.SAFEGUARDING_SENSITIVE.value:
            return True
        msg = str(message or "").lower()
        keywords = (
            "safeguard",
            "abuse",
            "immediate danger",
            "999",
            "self-harm",
            "missing from care",
            "exploitation",
            "lado",
        )
        return any(token in msg for token in keywords)


orb_plan_enforcement_service = OrbPlanEnforcementService()
