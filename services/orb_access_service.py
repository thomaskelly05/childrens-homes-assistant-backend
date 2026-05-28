from __future__ import annotations

"""ORB Residential access management service.

Purpose:
- centralise premium access decisions
- keep ORB Residential gating consistent
- support future feature limits and team plans
- separate standalone ORB access from IndiCare OS permissions
"""

from dataclasses import dataclass
from typing import Any

from db.orb_residential_db import get_orb_access_state


PREMIUM_WORKFLOWS = {
    "ask_orb",
    "shift_builder",
    "record_this_properly",
    "safeguarding_thinking",
    "therapeutic_reframe",
    "ofsted_lens",
    "supervision_prep",
    "manager_review",
    "document_support",
    "voice_workflows",
}


@dataclass(frozen=True)
class OrbAccessDecision:
    user_id: int | None
    workflow: str
    allowed: bool
    reason: str
    premium_required: bool
    access_state: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "workflow": self.workflow,
            "allowed": self.allowed,
            "reason": self.reason,
            "premium_required": self.premium_required,
            "access_state": self.access_state,
        }


class OrbAccessService:
    """Commercial access layer for ORB Residential."""

    def check_access(
        self,
        conn,
        *,
        user_id: int | None,
        workflow: str = "ask_orb",
    ) -> OrbAccessDecision:
        workflow_name = str(workflow or "ask_orb").strip().lower()

        if user_id is None:
            return OrbAccessDecision(
                user_id=None,
                workflow=workflow_name,
                allowed=False,
                reason="authentication_required",
                premium_required=True,
                access_state={
                    "can_use_orb": False,
                    "subscription_active": False,
                    "trial_active": False,
                },
            )

        access_state = get_orb_access_state(conn, user_id)

        premium_required = workflow_name in PREMIUM_WORKFLOWS
        allowed = bool(access_state.get("can_use_orb")) if premium_required else True

        if allowed:
            reason = access_state.get("access_reason") or "allowed"
        else:
            reason = "premium_subscription_required"

        return OrbAccessDecision(
            user_id=user_id,
            workflow=workflow_name,
            allowed=allowed,
            reason=reason,
            premium_required=premium_required,
            access_state=access_state,
        )

    def build_upgrade_payload(self) -> dict[str, Any]:
        return {
            "product": "ORB Residential",
            "price_gbp_monthly": 9.99,
            "tagline": "Powered by IndiCare Intelligence",
            "features": [
                "Full ORB Residential access",
                "Shift Builder",
                "Recording intelligence",
                "Safeguarding thinking",
                "Therapeutic reflection",
                "Ofsted lens",
                "Saved outputs and projects",
                "Document support",
                "Voice workflows",
            ],
            "trial": {
                "enabled": True,
                "days": 7,
            },
        }


orb_access_service = OrbAccessService()
