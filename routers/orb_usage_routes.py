from __future__ import annotations

"""ORB Residential usage metering — spending caps and top-up checkout."""

import logging
import os
from typing import Any

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_residential_auth_loader import get_orb_residential_user
from auth.orb_residential_dependencies import require_orb_residential_auth
from db.connection import get_db
from db.orb_subscription_db import get_orb_subscription, upsert_orb_stripe_customer
from db.orb_usage_commercial_db import (
    get_orb_usage_preferences,
    sum_orb_usage_credits_balance,
    upsert_orb_usage_preferences,
)
from services.orb_billing_meter_service import orb_billing_meter_service
from services.orb_subscription_plan_service import (
    orb_subscription_plan_service,
    stripe_configured,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orb/usage", tags=["ORB Residential Usage"])

SAFE_USAGE_SUMMARY: dict[str, Any] = {
    "messages_this_period": 0,
    "included_messages": None,
    "extra_usage_pence": 0,
    "estimated_spend_pence": 0,
    "monthly_cap_pence": None,
    "warning_threshold_percent": 80,
    "allow_overage": False,
    "credits_balance": 0,
}

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
FRONTEND_APP_URL = os.getenv("FRONTEND_APP_URL", os.getenv("APP_BASE_URL", "http://localhost:3001")).strip()

TOP_UP_AMOUNTS_PENCE = {500, 1000, 2500, 5000}

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


class OrbSpendingCapRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    monthly_cap_pence: int | None = Field(default=None, ge=0, le=1_000_000)
    warning_threshold_percent: int = Field(default=80, ge=0, le=100)
    allow_overage: bool = False


class OrbTopUpCheckoutRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    amount_pence: int = Field(..., ge=100, le=500_000)


def _usage_summary(conn, *, user_id: int, user: dict[str, Any]) -> dict[str, Any]:
    meter = orb_billing_meter_service.user_meter(user_id=user_id, user=user)
    prefs = get_orb_usage_preferences(conn, user_id=user_id) or {}
    credits_balance = sum_orb_usage_credits_balance(conn, user_id=user_id)
    messages = int(meter.get("total_requests") or 0)
    estimated_cost = float(meter.get("estimated_cost") or 0)
    estimated_spend_pence = int(round(estimated_cost * 100))
    plan = orb_subscription_plan_service.resolve_plan_for_user(user=user)
    included = plan.get("monthly_message_allowance") if isinstance(plan, dict) else None

    return {
        "messages_this_period": messages,
        "included_messages": included,
        "extra_usage_pence": max(0, estimated_spend_pence),
        "estimated_spend_pence": estimated_spend_pence,
        "monthly_cap_pence": prefs.get("monthly_cap_pence"),
        "warning_threshold_percent": int(prefs.get("warning_threshold_percent") or 80),
        "allow_overage": bool(prefs.get("allow_overage")),
        "credits_balance": credits_balance,
        "meter": meter,
    }


@router.get("")
@router.get("/")
async def get_orb_usage(
    conn=Depends(get_db),
    current_user=Depends(get_orb_residential_user),
):
    """Usage summary for signed-in ORB Residential users.

  Returns HTTP 200 with zeroed fields when metering tables are unavailable or the
  subscription is inactive — only unauthenticated requests receive 401.
    """
    user_id = int(current_user["user_id"])
    try:
        summary = _usage_summary(conn, user_id=user_id, user=current_user)
        summary.pop("meter", None)
        return summary
    except Exception:
        logger.warning("ORB usage summary degraded user_id=%s", user_id, exc_info=True)
        return dict(SAFE_USAGE_SUMMARY)


@router.post("/spending-cap")
async def set_orb_spending_cap(
    payload: OrbSpendingCapRequest,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    row = upsert_orb_usage_preferences(
        conn,
        user_id=user_id,
        monthly_cap_pence=payload.monthly_cap_pence,
        warning_threshold_percent=payload.warning_threshold_percent,
        allow_overage=payload.allow_overage,
    )
    conn.commit()
    return {
        "ok": True,
        "monthly_cap_pence": row.get("monthly_cap_pence"),
        "warning_threshold_percent": int(row.get("warning_threshold_percent") or 80),
        "allow_overage": bool(row.get("allow_overage")),
    }


@router.post("/top-up-checkout")
async def orb_top_up_checkout(
    payload: OrbTopUpCheckoutRequest,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    if payload.amount_pence not in TOP_UP_AMOUNTS_PENCE:
        raise HTTPException(
            status_code=400,
            detail="Supported top-up amounts are £5, £10, £25 and £50",
        )

    user_id = int(current_user["user_id"])
    email = str(current_user.get("email") or "")
    subscription = get_orb_subscription(conn, user_id)
    customer_id = (subscription or {}).get("stripe_customer_id")

    try:
        if not customer_id:
            customer = stripe.Customer.create(
                email=email,
                metadata={"product": "orb_residential", "user_id": str(user_id)},
            )
            customer_id = customer["id"]
            upsert_orb_stripe_customer(conn, user_id=user_id, stripe_customer_id=customer_id)
            conn.commit()

        success_url = f"{FRONTEND_APP_URL.rstrip('/')}/orb?billing=topup_success"
        cancel_url = f"{FRONTEND_APP_URL.rstrip('/')}/orb?billing=topup_cancelled"

        session = stripe.checkout.Session.create(
            mode="payment",
            customer=customer_id,
            line_items=[
                {
                    "price_data": {
                        "currency": "gbp",
                        "unit_amount": payload.amount_pence,
                        "product_data": {"name": "ORB Residential usage credits"},
                    },
                    "quantity": 1,
                }
            ],
            success_url=success_url,
            cancel_url=cancel_url,
            automatic_payment_methods={"enabled": True},
            metadata={
                "product": "orb_residential",
                "user_id": str(user_id),
                "purchase_type": "usage_topup",
                "amount_pence": str(payload.amount_pence),
            },
        )
        conn.commit()
        return {"checkout_url": session.url}
    except stripe.error.StripeError as exc:
        logger.exception("ORB top-up checkout failed user_id=%s", user_id)
        raise HTTPException(status_code=400, detail="Could not create top-up checkout") from exc
