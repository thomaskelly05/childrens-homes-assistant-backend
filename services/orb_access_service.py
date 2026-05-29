from __future__ import annotations

"""ORB Residential access management service."""

from dataclasses import dataclass
from typing import Any

from db.orb_residential_db import get_orb_access_state
from services.orb_billing_meter_service import orb_billing_meter_service
from services.orb_subscription_plan_service import (
    ORB_RESIDENTIAL_PRICE_LABEL,
    ORB_RESIDENTIAL_PRODUCT,
    oauth_provider_configured,
    orb_subscription_plan_service,
    stripe_configured,
)


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
        user: dict[str, Any] | None = None,
    ) -> OrbAccessDecision:
        workflow_name = str(workflow or "ask_orb").strip().lower()
        access_state = self.build_access_payload(user_id, conn=conn, user=user)

        if user_id is None:
            return OrbAccessDecision(
                user_id=None,
                workflow=workflow_name,
                allowed=False,
                reason="authentication_required",
                premium_required=True,
                access_state=access_state,
            )

        premium_required = workflow_name in PREMIUM_WORKFLOWS
        allowed = bool(access_state.get("can_use_orb")) if premium_required else True
        if not access_state.get("safety_accepted", True):
            allowed = False

        if allowed:
            reason = access_state.get("access_state") or "allowed"
        elif not access_state.get("safety_accepted", True):
            reason = "safety_acceptance_required"
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

    def build_access_payload(
        self,
        user_id: int | None,
        *,
        conn,
        user: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if user_id is None:
            return self._unauthenticated_payload()

        raw = get_orb_access_state(conn, user_id, user=user)
        access_state = self._resolve_access_state(raw, user=user)
        subscription = raw.get("subscription") or {}
        trial = raw.get("trial") or {}
        plan = orb_subscription_plan_service.current_plan_payload(user=user, subscription=subscription)
        meter = {}
        try:
            meter = orb_billing_meter_service.user_meter(user_id=user_id, user=user)
        except Exception:
            meter = {}

        safety_accepted = bool(raw.get("safety_accepted"))
        can_use_orb = bool(raw.get("can_use_orb")) and safety_accepted

        return {
            "product": ORB_RESIDENTIAL_PRODUCT,
            "price_label": ORB_RESIDENTIAL_PRICE_LABEL,
            "can_use_orb": can_use_orb,
            "access_state": access_state,
            "trial": {
                "available": bool(raw.get("trial_available")),
                "active": bool(raw.get("trial_active")),
                "status": trial.get("status"),
                "started_at": trial.get("started_at"),
                "expires_at": trial.get("expires_at"),
                "days_left": raw.get("trial_days_left"),
            },
            "subscription": {
                "active": bool(raw.get("subscription_active")),
                "status": subscription.get("subscription_status") or raw.get("subscription_status"),
                "plan_name": plan.get("plan_name"),
                "orb_plan": plan.get("orb_plan"),
                "current_period_end": subscription.get("current_period_end") or raw.get("current_period_end"),
                "cancel_at_period_end": subscription.get("cancel_at_period_end"),
                "stripe_customer_id": subscription.get("stripe_customer_id"),
            },
            "billing": {
                "stripe_configured": stripe_configured(),
                "price_gbp_monthly": plan.get("price_gbp_monthly"),
            },
            "usage_meter": meter,
            "standalone": True,
            "os_records_accessed": False,
            "os_access_granted": False,
            "safety_accepted": safety_accepted,
            "onboarding_completed": bool(raw.get("onboarding_completed")),
            "upgrade": self._upgrade_payload(raw, access_state),
            "oauth": {
                "google": oauth_provider_configured("google"),
                "microsoft": oauth_provider_configured("microsoft"),
                "apple": oauth_provider_configured("apple"),
            },
        }

    def _resolve_access_state(self, raw: dict[str, Any], *, user: dict[str, Any] | None) -> str:
        if raw.get("admin_bypass"):
            return "admin_bypass"
        if raw.get("founding_bypass"):
            return "founding_plan_bypass"
        if raw.get("enterprise_later"):
            return "enterprise_provider_later"
        if raw.get("subscription_active"):
            status = str(raw.get("subscription_status") or "").lower()
            if status in {"past_due"}:
                return "subscription_past_due"
            if status in {"canceled", "cancelled"}:
                return "subscription_cancelled"
            if status in {"incomplete", "incomplete_expired"}:
                return "subscription_incomplete"
            return "subscription_active"
        if raw.get("trial_active"):
            return "trial_active"
        if raw.get("trial_available"):
            return "trial_available"
        if user and user.get("user_id"):
            return "authenticated_no_subscription"
        return "locked"

    def _unauthenticated_payload(self) -> dict[str, Any]:
        return {
            "product": ORB_RESIDENTIAL_PRODUCT,
            "price_label": ORB_RESIDENTIAL_PRICE_LABEL,
            "can_use_orb": False,
            "access_state": "unauthenticated",
            "trial": {"available": True, "active": False},
            "subscription": {"active": False, "status": None},
            "billing": {"stripe_configured": stripe_configured(), "price_gbp_monthly": 9.99},
            "usage_meter": {},
            "standalone": True,
            "os_records_accessed": False,
            "os_access_granted": False,
            "safety_accepted": False,
            "onboarding_completed": False,
            "upgrade": self.build_upgrade_payload(),
        }

    def _upgrade_payload(self, raw: dict[str, Any], access_state: str) -> dict[str, Any]:
        upgrade = self.build_upgrade_payload()
        upgrade["checkout_available"] = stripe_configured()
        upgrade["trial_available"] = bool(raw.get("trial_available"))
        upgrade["access_state"] = access_state
        upgrade["manage_billing_available"] = bool((raw.get("subscription") or {}).get("stripe_customer_id"))
        return upgrade

    def build_upgrade_payload(self) -> dict[str, Any]:
        return {
            "product": ORB_RESIDENTIAL_PRODUCT,
            "price_label": ORB_RESIDENTIAL_PRICE_LABEL,
            "price_gbp_monthly": 9.99,
            "tagline": "For adults working in or around children's homes",
            "features": [
                "Residential children's homes assistant",
                "Safeguarding thinking",
                "Recording support",
                "Ofsted / Reg 44 lens",
                "Shift Builder",
                "Document intelligence",
                "Academy / NVQ helper",
                "Profile and voice",
                "Feedback-driven improvement",
            ],
            "trial": {"enabled": True, "days": 7},
            "boundary_note": "Standalone ORB does not access IndiCare OS records.",
            "os_links": False,
            "checkout_available": stripe_configured(),
        }


orb_access_service = OrbAccessService()
