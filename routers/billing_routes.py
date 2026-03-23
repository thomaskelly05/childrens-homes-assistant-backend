import logging
import os
from datetime import datetime, timezone
from typing import Any

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from psycopg2 import OperationalError

from auth.current_user import get_current_user
from db.billing_db import (
    clear_subscription_by_customer_id,
    get_user_billing_by_user_id,
    set_stripe_customer_id,
    update_subscription_status_by_customer_id,
)
from db.connection import get_db

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/billing",
    tags=["Billing"],
)

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID", "").strip()
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:8000").strip()
FRONTEND_APP_URL = os.getenv("FRONTEND_APP_URL", APP_BASE_URL).strip()

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


def _require_stripe() -> None:
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe secret key is not configured")
    if not STRIPE_PRICE_ID:
        raise HTTPException(status_code=500, detail="Stripe price ID is not configured")


def _dt_from_unix(ts: int | None) -> datetime | None:
    if not ts:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def _normalise_subscription_status(status: str | None) -> tuple[str, bool]:
    value = (status or "").strip().lower()

    active_statuses = {"active", "trialing"}
    inactive_statuses = {
        "incomplete",
        "incomplete_expired",
        "past_due",
        "canceled",
        "cancelled",
        "unpaid",
        "paused",
    }

    if value in active_statuses:
        return value, True

    if value in inactive_statuses:
        return value, False

    return value or "inactive", False


def _extract_plan_name_from_subscription_object(subscription_obj: dict[str, Any] | Any) -> str | None:
    items = subscription_obj.get("items", {}).get("data", [])
    if not items:
        return None

    item_data = items[0]
    price_obj = item_data.get("price", {}) or {}

    return (
        price_obj.get("nickname")
        or price_obj.get("id")
        or price_obj.get("lookup_key")
        or None
    )


@router.get("/me")
async def get_my_billing(
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        record = get_user_billing_by_user_id(conn, current_user["user_id"])
    except OperationalError:
        logger.exception("Database error in /billing/me user_id=%s", current_user.get("user_id"))
        raise HTTPException(status_code=503, detail="Billing database unavailable")

    if not record:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "ok": True,
        "billing": record,
    }


@router.post("/create-checkout-session")
async def create_checkout_session(
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_stripe()

    try:
        user = get_user_billing_by_user_id(conn, current_user["user_id"])
    except OperationalError:
        logger.exception(
            "Database error loading billing user for checkout user_id=%s",
            current_user.get("user_id"),
        )
        raise HTTPException(status_code=503, detail="Billing database unavailable")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    customer_id = user.get("stripe_customer_id")

    try:
        if not customer_id:
            customer = stripe.Customer.create(
                email=user["email"],
                name=user["email"],
                metadata={
                    "user_id": str(user["id"]),
                    "email": user["email"],
                },
            )
            customer_id = customer["id"]
            set_stripe_customer_id(conn, user["id"], customer_id)

        session = stripe.checkout.Session.create(
            mode="subscription",
            customer=customer_id,
            line_items=[
                {
                    "price": STRIPE_PRICE_ID,
                    "quantity": 1,
                }
            ],
            success_url=f"{FRONTEND_APP_URL}/login?billing=success",
            cancel_url=f"{FRONTEND_APP_URL}/login?billing=cancelled",
            metadata={
                "user_id": str(user["id"]),
                "email": user["email"],
            },
            allow_promotion_codes=True,
        )

        return {
            "ok": True,
            "url": session.url,
        }

    except stripe.error.StripeError as exc:
        logger.exception(
            "Stripe error creating checkout session for user_id=%s",
            current_user.get("user_id"),
        )
        raise HTTPException(status_code=400, detail="Could not create checkout session") from exc
    except OperationalError:
        logger.exception(
            "Database error saving checkout customer_id for user_id=%s",
            current_user.get("user_id"),
        )
        raise HTTPException(status_code=503, detail="Billing database unavailable")
    except Exception as exc:
        logger.exception(
            "Unexpected error creating checkout session for user_id=%s",
            current_user.get("user_id"),
        )
        raise HTTPException(status_code=500, detail="Could not create checkout session") from exc


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    conn=Depends(get_db),
):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe secret key is not configured")

    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Stripe webhook secret is not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=STRIPE_WEBHOOK_SECRET,
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid webhook payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event["type"]
    data_object = event["data"]["object"]

    try:
        logger.info("Received Stripe webhook event_type=%s", event_type)

        if event_type == "checkout.session.completed":
            customer_id = data_object.get("customer")
            subscription_id = data_object.get("subscription")

            if customer_id and subscription_id:
                subscription = stripe.Subscription.retrieve(subscription_id)
                status, subscription_active = _normalise_subscription_status(subscription.get("status"))
                plan_name = _extract_plan_name_from_subscription_object(subscription)
                current_period_end = _dt_from_unix(subscription.get("current_period_end"))

                update_subscription_status_by_customer_id(
                    conn=conn,
                    stripe_customer_id=customer_id,
                    stripe_subscription_id=subscription_id,
                    subscription_status=status,
                    plan_name=plan_name,
                    current_period_end=current_period_end,
                    subscription_active=subscription_active,
                )

        elif event_type in {
            "customer.subscription.created",
            "customer.subscription.updated",
        }:
            customer_id = data_object.get("customer")
            subscription_id = data_object.get("id")
            status, subscription_active = _normalise_subscription_status(data_object.get("status"))
            plan_name = _extract_plan_name_from_subscription_object(data_object)
            current_period_end = _dt_from_unix(data_object.get("current_period_end"))

            if customer_id:
                update_subscription_status_by_customer_id(
                    conn=conn,
                    stripe_customer_id=customer_id,
                    stripe_subscription_id=subscription_id,
                    subscription_status=status,
                    plan_name=plan_name,
                    current_period_end=current_period_end,
                    subscription_active=subscription_active,
                )

        elif event_type == "customer.subscription.deleted":
            customer_id = data_object.get("customer")

            if customer_id:
                clear_subscription_by_customer_id(
                    conn=conn,
                    stripe_customer_id=customer_id,
                )

        elif event_type == "invoice.payment_failed":
            customer_id = data_object.get("customer")
            subscription_id = data_object.get("subscription")

            if customer_id:
                update_subscription_status_by_customer_id(
                    conn=conn,
                    stripe_customer_id=customer_id,
                    stripe_subscription_id=subscription_id,
                    subscription_status="past_due",
                    plan_name=None,
                    current_period_end=None,
                    subscription_active=False,
                )

        elif event_type == "invoice.payment_succeeded":
            customer_id = data_object.get("customer")
            subscription_id = data_object.get("subscription")

            if customer_id and subscription_id:
                subscription = stripe.Subscription.retrieve(subscription_id)
                status, subscription_active = _normalise_subscription_status(subscription.get("status"))
                plan_name = _extract_plan_name_from_subscription_object(subscription)
                current_period_end = _dt_from_unix(subscription.get("current_period_end"))

                update_subscription_status_by_customer_id(
                    conn=conn,
                    stripe_customer_id=customer_id,
                    stripe_subscription_id=subscription_id,
                    subscription_status=status,
                    plan_name=plan_name,
                    current_period_end=current_period_end,
                    subscription_active=subscription_active,
                )

        else:
            logger.info("Ignoring Stripe webhook event_type=%s", event_type)

        return JSONResponse({"ok": True})

    except stripe.error.StripeError as exc:
        logger.exception("Stripe API error while handling webhook event_type=%s", event_type)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Stripe webhook processing failed",
        ) from exc
    except OperationalError as exc:
        logger.exception("Database error while handling webhook event_type=%s", event_type)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing database unavailable",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected webhook handling failure event_type=%s", event_type)
        raise HTTPException(
            status_code=500,
            detail="Webhook handling failed",
        ) from exc
