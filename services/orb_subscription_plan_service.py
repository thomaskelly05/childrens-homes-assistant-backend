from __future__ import annotations

import os
from typing import Any

ORB_RESIDENTIAL_PRODUCT = "ORB Residential — Powered by IndiCare"
ORB_RESIDENTIAL_PRICE_LABEL = "£9.99/month"
ORB_RESIDENTIAL_PLAN = "orb_residential_individual"
ORB_RESIDENTIAL_PLAN_PRICE_GBP = 9.99

ACTIVE_SUBSCRIPTION_STATUSES = {"active", "trialing"}
PAST_DUE_STATUSES = {"past_due"}
CANCELLED_STATUSES = {"canceled", "cancelled"}
INCOMPLETE_STATUSES = {"incomplete", "incomplete_expired"}


def orb_residential_stripe_price_id() -> str:
    return os.getenv("ORB_RESIDENTIAL_STRIPE_PRICE_ID", "").strip()


def stripe_configured() -> bool:
    return bool(os.getenv("STRIPE_SECRET_KEY", "").strip() and orb_residential_stripe_price_id())


def _google_client_id_valid() -> bool:
    client_id = os.getenv("OAUTH_GOOGLE_CLIENT_ID", "").strip()
    return bool(client_id) and client_id.endswith(".apps.googleusercontent.com")


def oauth_provider_configured(provider: str) -> bool:
    from services.orb_oauth_provider_env import (
        apple_auth_enabled,
        microsoft_auth_enabled,
        microsoft_client_id,
    )

    key = provider.strip().lower()
    if key == "google":
        return _google_client_id_valid()
    if key == "microsoft":
        return microsoft_auth_enabled() and bool(microsoft_client_id())
    if key == "apple":
        return apple_auth_enabled() and bool(os.getenv("OAUTH_APPLE_CLIENT_ID", "").strip())
    return False


def map_stripe_price_to_plan(price_id: str | None) -> str:
    configured = orb_residential_stripe_price_id()
    normalised = str(price_id or "").strip()
    if configured and normalised == configured:
        return ORB_RESIDENTIAL_PLAN
    if normalised:
        return ORB_RESIDENTIAL_PLAN
    return ORB_RESIDENTIAL_PLAN


def subscription_grants_orb_access(status: str | None, *, period_end: Any = None) -> bool:
    value = str(status or "").strip().lower()
    if value in ACTIVE_SUBSCRIPTION_STATUSES:
        return True
    if value in CANCELLED_STATUSES and period_end is not None:
        try:
            from datetime import datetime, timezone

            end = period_end
            if isinstance(end, str):
                end = datetime.fromisoformat(end.replace("Z", "+00:00"))
            if end.tzinfo is None:
                end = end.replace(tzinfo=timezone.utc)
            return end > datetime.now(timezone.utc)
        except Exception:
            return False
    return False


class OrbSubscriptionPlanService:
    """Map Stripe prices and subscription rows to ORB Residential plans — never OS access."""

    def resolve_plan_for_user(
        self,
        *,
        user: dict[str, Any] | None,
        subscription: dict[str, Any] | None = None,
    ) -> str:
        if not user:
            return ORB_RESIDENTIAL_PLAN
        role = str(user.get("role") or "").strip().lower()
        if role in {"admin", "super_admin", "superadmin"}:
            return "admin"
        plan = str(
            (subscription or {}).get("orb_plan")
            or user.get("orb_plan")
            or user.get("plan_name")
            or ""
        ).strip().lower()
        if "founding" in plan:
            return "founding_plan"
        if "enterprise" in plan or "provider" in plan:
            return "enterprise"
        return ORB_RESIDENTIAL_PLAN

    def current_plan_payload(
        self,
        *,
        user: dict[str, Any] | None,
        subscription: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        plan_name = self.resolve_plan_for_user(user=user, subscription=subscription)
        return {
            "plan_name": plan_name,
            "orb_plan": plan_name,
            "product": ORB_RESIDENTIAL_PRODUCT,
            "price_label": ORB_RESIDENTIAL_PRICE_LABEL,
            "price_gbp_monthly": ORB_RESIDENTIAL_PLAN_PRICE_GBP,
            "stripe_price_id": (subscription or {}).get("stripe_price_id") or orb_residential_stripe_price_id() or None,
            "os_access_granted": False,
        }

    def stripe_metadata(self, *, user_id: int, email: str | None = None) -> dict[str, str]:
        payload = {
            "product": "orb_residential",
            "user_id": str(user_id),
            "orb_plan": ORB_RESIDENTIAL_PLAN,
        }
        if email:
            payload["email"] = email
        return payload


orb_subscription_plan_service = OrbSubscriptionPlanService()
