from __future__ import annotations

"""ORB Residential commercial billing routes — standalone from IndiCare OS billing."""

import logging
import os
from datetime import datetime, timezone
from typing import Any

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_residential_auth_loader import get_optional_orb_residential_user, get_orb_residential_user
from auth.orb_residential_dependencies import require_orb_residential_auth
from auth.passwords import hash_password
from db.connection import get_db
from db.orb_residential_db import (
    get_orb_access_state,
    get_orb_user_preferences,
    record_orb_usage_event,
    start_orb_trial,
    upsert_orb_user_preferences,
)
from db.orb_stripe_events_db import is_orb_stripe_event_processed, record_orb_stripe_event
from db.orb_subscription_db import (
    ORB_SAFETY_ACCEPTANCE_VERSION,
    get_orb_subscription,
    get_orb_subscription_by_customer_id,
    has_orb_safety_acceptance,
    record_orb_safety_acceptance,
    update_orb_subscription_state,
    upsert_orb_stripe_customer,
)
from services.orb_standalone_boundary import FORBIDDEN_STANDALONE_OS_KEYS
from schemas.orb_residential_premium import OrbOnboardingPreferencesRequest
from services.orb_access_service import orb_access_service
from services.orb_billing_meter_service import orb_billing_meter_service
from services.orb_subscription_plan_service import (
    map_stripe_price_to_plan,
    orb_residential_stripe_price_id,
    orb_subscription_plan_service,
    stripe_configured,
    subscription_grants_orb_access,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orb/standalone", tags=["ORB Standalone Billing"])

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
STRIPE_SUCCESS_URL = os.getenv("STRIPE_SUCCESS_URL", "").strip()
STRIPE_CANCEL_URL = os.getenv("STRIPE_CANCEL_URL", "").strip()
STRIPE_PORTAL_CONFIGURATION_ID = os.getenv("STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID", "").strip()
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3001").strip()
FRONTEND_APP_URL = os.getenv("FRONTEND_APP_URL", APP_BASE_URL).strip()

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


class OrbSignupRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: str = Field(..., min_length=3, max_length=320)
    password: str = Field(..., min_length=12, max_length=256)
    first_name: str | None = Field(default=None, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)


class OrbCheckoutRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success_url: str | None = Field(default=None, max_length=2000)
    cancel_url: str | None = Field(default=None, max_length=2000)


class OrbSafetyAcceptanceRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    version: str = Field(default=ORB_SAFETY_ACCEPTANCE_VERSION, max_length=80)
    accepted: bool = True


class OrbAnalyticsEventRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    event: str = Field(..., min_length=1, max_length=80)
    metadata: dict[str, Any] = Field(default_factory=dict)


def _success(data: Any, **extra: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {"success": True, "data": data}
    payload.update(extra)
    return payload


def _default_success_url(custom: str | None) -> str:
    if custom and custom.startswith(("http://", "https://")):
        return custom
    if STRIPE_SUCCESS_URL:
        return STRIPE_SUCCESS_URL
    return f"{FRONTEND_APP_URL}/orb/billing/success"


def _default_cancel_url(custom: str | None) -> str:
    if custom and custom.startswith(("http://", "https://")):
        return custom
    if STRIPE_CANCEL_URL:
        return STRIPE_CANCEL_URL
    return f"{FRONTEND_APP_URL}/orb/billing/cancel"


def _dt_from_unix(ts: int | None) -> datetime | None:
    if not ts:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def _extract_price_id(subscription_obj: dict[str, Any] | Any) -> str | None:
    items = subscription_obj.get("items", {}).get("data", [])
    if not items:
        return None
    price_obj = items[0].get("price", {}) or {}
    return price_obj.get("id")


def _require_stripe_checkout() -> None:
    if not STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=503,
            detail="Stripe billing is not configured yet (STRIPE_SECRET_KEY missing on the server).",
        )
    if not orb_residential_stripe_price_id():
        raise HTTPException(
            status_code=503,
            detail="ORB Residential subscription price is not configured (ORB_RESIDENTIAL_STRIPE_PRICE_ID missing).",
        )


def _record_analytics(conn, *, user_id: int | None, event: str, metadata: dict[str, Any] | None = None) -> None:
    try:
        record_orb_usage_event(
            conn,
            user_id=user_id,
            event_type=f"analytics:{event}",
            workflow="orb_residential",
            metadata={"analytics_event": event, **(metadata or {})},
        )
    except Exception:
        logger.debug("ORB analytics event skipped", exc_info=True)


@router.post("/auth/signup")
async def orb_standalone_signup(payload: OrbSignupRequest, conn=Depends(get_db)):
    email = payload.email.strip().lower()
    from psycopg2.extras import RealDictCursor

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id FROM users WHERE lower(email) = %s LIMIT 1", (email,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="An account with this email already exists")
        cur.execute(
            """
            INSERT INTO users (
                email, password_hash, role, home_id, provider_id,
                first_name, last_name, is_active, archived,
                account_status, subscription_active, subscription_status,
                created_at, updated_at
            )
            VALUES (%s, %s, %s, NULL, NULL, %s, %s, TRUE, FALSE, 'active', FALSE, 'inactive', NOW(), NOW())
            RETURNING id, email, role, first_name, last_name
            """,
            (
                email,
                hash_password(payload.password),
                "orb_residential",
                payload.first_name,
                payload.last_name,
            ),
        )
        user = dict(cur.fetchone())
    _record_analytics(conn, user_id=int(user["id"]), event="signup_viewed")
    conn.commit()
    return _success({"user_id": user["id"], "email": user["email"], "message": "Account created. Sign in to continue."})


@router.get("/access")
async def orb_standalone_access(
    conn=Depends(get_db),
    current_user=Depends(get_optional_orb_residential_user),
):
    user_id = current_user.get("user_id") if current_user else None
    if not user_id:
        payload = orb_access_service.build_access_payload(None, conn=conn)
        return _success(payload)
    payload = orb_access_service.build_access_payload(int(user_id), conn=conn, user=current_user)
    return _success(payload)


@router.get("/billing/status")
async def orb_standalone_billing_status(
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    access = orb_access_service.build_access_payload(user_id, conn=conn, user=current_user)
    subscription = get_orb_subscription(conn, user_id)
    meter = orb_billing_meter_service.user_meter(user_id=user_id, user=current_user)
    return _success(
        {
            "access": access,
            "subscription": subscription,
            "usage_meter": meter,
            "stripe_configured": stripe_configured(),
        }
    )


@router.get("/billing/meter")
async def orb_standalone_billing_meter(
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    if not orb_access_service.check_access(conn, user_id=user_id).allowed:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="ORB subscription required")
    meter = orb_billing_meter_service.user_meter(user_id=user_id, user=current_user)
    return _success(meter)


@router.post("/billing/checkout")
async def orb_standalone_checkout(
    payload: OrbCheckoutRequest,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    _require_stripe_checkout()
    user_id = int(current_user["user_id"])
    email = str(current_user.get("email") or "")
    subscription = get_orb_subscription(conn, user_id)
    customer_id = (subscription or {}).get("stripe_customer_id")

    try:
        if not customer_id:
            customer = stripe.Customer.create(
                email=email,
                metadata=orb_subscription_plan_service.stripe_metadata(user_id=user_id, email=email),
            )
            customer_id = customer["id"]
            upsert_orb_stripe_customer(conn, user_id=user_id, stripe_customer_id=customer_id)
            conn.commit()

        session_kwargs: dict[str, Any] = {
            "mode": "subscription",
            "customer": customer_id,
            "line_items": [{"price": orb_residential_stripe_price_id(), "quantity": 1}],
            "success_url": _default_success_url(payload.success_url),
            "cancel_url": _default_cancel_url(payload.cancel_url),
            "metadata": orb_subscription_plan_service.stripe_metadata(user_id=user_id, email=email),
            "subscription_data": {
                "metadata": orb_subscription_plan_service.stripe_metadata(user_id=user_id, email=email),
            },
            "allow_promotion_codes": True,
        }
        session_kwargs["automatic_payment_methods"] = {"enabled": True}
        session = stripe.checkout.Session.create(**session_kwargs)
        _record_analytics(conn, user_id=user_id, event="checkout_started")
        conn.commit()
        return {"success": True, "checkout_url": session.url}
    except stripe.error.StripeError as exc:
        logger.exception("ORB checkout failed user_id=%s", user_id)
        raise HTTPException(status_code=400, detail="Could not create checkout session") from exc


@router.post("/billing/portal")
async def orb_standalone_billing_portal(
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=503,
            detail="Stripe billing is not configured yet (STRIPE_SECRET_KEY missing on the server).",
        )
    user_id = int(current_user["user_id"])
    subscription = get_orb_subscription(conn, user_id)
    customer_id = (subscription or {}).get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer for this account")
    portal_kwargs: dict[str, Any] = {
        "customer": customer_id,
        "return_url": f"{FRONTEND_APP_URL}/orb",
    }
    if STRIPE_PORTAL_CONFIGURATION_ID:
        portal_kwargs["configuration"] = STRIPE_PORTAL_CONFIGURATION_ID
    session = stripe.billing_portal.Session.create(**portal_kwargs)
    _record_analytics(conn, user_id=user_id, event="billing_portal_opened")
    conn.commit()
    return {"success": True, "portal_url": session.url}


@router.post("/trial/start")
async def orb_standalone_start_trial(
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    access_state = get_orb_access_state(conn, user_id, user=current_user)
    if access_state.get("can_use_orb"):
        return _success({"access": orb_access_service.build_access_payload(user_id, conn=conn, user=current_user)})
    trial = start_orb_trial(conn, user_id, source="orb_standalone")
    _record_analytics(conn, user_id=user_id, event="trial_started")
    conn.commit()
    return _success(
        {
            "trial": trial,
            "access": orb_access_service.build_access_payload(user_id, conn=conn, user=current_user),
        }
    )


@router.get("/onboarding/preferences")
async def get_standalone_onboarding_preferences(
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    prefs = get_orb_user_preferences(conn, int(current_user["user_id"]))
    safety_accepted = has_orb_safety_acceptance(conn, int(current_user["user_id"]))
    return _success({"preferences": prefs or {}, "safety_accepted": safety_accepted})


@router.post("/onboarding/preferences")
async def update_standalone_onboarding_preferences(
    payload: OrbOnboardingPreferencesRequest,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    row = upsert_orb_user_preferences(
        conn,
        user_id=int(current_user["user_id"]),
        role_label=payload.role_label,
        work_environment=payload.work_environment,
        preferred_support_style=payload.preferred_support_style,
        onboarding_completed=payload.onboarding_completed,
        preferences=payload.preferences,
    )
    if payload.onboarding_completed:
        _record_analytics(conn, user_id=int(current_user["user_id"]), event="onboarding_completed")
    conn.commit()
    return _success(row)


@router.post("/safety/accept")
async def accept_orb_safety_statement(
    payload: OrbSafetyAcceptanceRequest,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    if payload.version != ORB_SAFETY_ACCEPTANCE_VERSION:
        raise HTTPException(status_code=400, detail="Safety acceptance version mismatch")
    if not payload.accepted:
        raise HTTPException(status_code=400, detail="Acceptance required")
    user_id = int(current_user["user_id"])
    row = record_orb_safety_acceptance(conn, user_id=user_id, version=payload.version)
    _record_analytics(conn, user_id=user_id, event="terms_accepted")
    conn.commit()
    return _success(row)


@router.get("/safety/status")
async def orb_safety_status(
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    return _success(
        {
            "required_version": ORB_SAFETY_ACCEPTANCE_VERSION,
            "accepted": has_orb_safety_acceptance(conn, user_id),
            "product": "orb_residential",
        }
    )


PUBLIC_ORB_ANALYTICS_EVENTS = frozenset(
    {
        "login_viewed",
        "signup_viewed",
        "oauth_clicked",
        "locked_screen_viewed",
        "upgrade_clicked",
        "checkout_cancelled",
    }
)

ORB_ANALYTICS_EVENTS = PUBLIC_ORB_ANALYTICS_EVENTS | {
    "onboarding_started",
    "onboarding_completed",
    "trial_started",
    "checkout_started",
    "checkout_completed",
    "subscription_active",
    "billing_portal_opened",
    "terms_accepted",
}


def _sanitize_analytics_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    clean: dict[str, Any] = {}
    for key, value in (metadata or {}).items():
        if key in FORBIDDEN_STANDALONE_OS_KEYS:
            continue
        clean[key] = value
    return clean


@router.post("/analytics/event")
async def orb_analytics_event(
    payload: OrbAnalyticsEventRequest,
    conn=Depends(get_db),
    current_user=Depends(get_optional_orb_residential_user),
):
    if payload.event not in ORB_ANALYTICS_EVENTS:
        return _success({"recorded": False, "disabled": True})
    user_id = int(current_user["user_id"]) if current_user and current_user.get("user_id") else None
    if not user_id and payload.event not in PUBLIC_ORB_ANALYTICS_EVENTS:
        return _success({"recorded": False, "requires_sign_in": True})
    try:
        _record_analytics(
            conn,
            user_id=user_id,
            event=payload.event,
            metadata=_sanitize_analytics_metadata(payload.metadata),
        )
        conn.commit()
        return _success({"recorded": True})
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        logger.exception("orb_analytics_event failed event=%s user_id=%s", payload.event, user_id)
        return _success({"recorded": False, "disabled": True})


@router.post("/billing/webhook")
async def orb_standalone_stripe_webhook(request: Request, conn=Depends(get_db)):
    if not STRIPE_SECRET_KEY or not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Stripe webhook is not configured")
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload=payload, sig_header=sig_header, secret=STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid webhook payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event["type"]
    stripe_event_id = str(event.get("id") or "").strip()
    data_object = event["data"]["object"]

    if stripe_event_id and is_orb_stripe_event_processed(conn, stripe_event_id):
        return JSONResponse({"ok": True, "duplicate": True})

    try:
        if event_type == "checkout.session.completed":
            metadata = data_object.get("metadata") or {}
            if metadata.get("product") not in {None, "orb_residential"}:
                return JSONResponse({"ok": True, "ignored": True})
            if metadata.get("purchase_type") == "usage_topup":
                user_id_raw = metadata.get("user_id")
                session_id = str(data_object.get("id") or "")
                amount_raw = metadata.get("amount_pence") or data_object.get("amount_total")
                if user_id_raw and session_id:
                    from db.orb_usage_commercial_db import record_orb_usage_credit_purchase

                    amount_pence = int(amount_raw) if amount_raw is not None else 0
                    record_orb_usage_credit_purchase(
                        conn,
                        user_id=int(user_id_raw),
                        stripe_checkout_session_id=session_id,
                        amount_pence=amount_pence,
                        status="completed",
                    )
                return JSONResponse({"ok": True, "topup": True})
            user_id = metadata.get("user_id")
            customer_id = data_object.get("customer")
            subscription_id = data_object.get("subscription")
            if user_id and customer_id:
                subscription = stripe.Subscription.retrieve(subscription_id) if subscription_id else None
                price_id = _extract_price_id(subscription) if subscription else orb_residential_stripe_price_id()
                status_value = subscription.get("status") if subscription else "active"
                update_orb_subscription_state(
                    conn,
                    user_id=int(user_id),
                    stripe_customer_id=str(customer_id),
                    stripe_subscription_id=str(subscription_id) if subscription_id else None,
                    stripe_price_id=price_id,
                    orb_plan=map_stripe_price_to_plan(price_id),
                    subscription_status=str(status_value),
                    current_period_start=_dt_from_unix(subscription.get("current_period_start")) if subscription else None,
                    current_period_end=_dt_from_unix(subscription.get("current_period_end")) if subscription else None,
                    cancel_at_period_end=bool(subscription.get("cancel_at_period_end")) if subscription else False,
                    clear_payment_failed=True,
                )
                _record_analytics(conn, user_id=int(user_id), event="checkout_completed")

        elif event_type in {"customer.subscription.created", "customer.subscription.updated"}:
            metadata = data_object.get("metadata") or {}
            if metadata.get("product") not in {None, "orb_residential"} and metadata.get("user_id") is None:
                customer_id = data_object.get("customer")
                existing = get_orb_subscription_by_customer_id(conn, str(customer_id)) if customer_id else None
                if not existing:
                    return JSONResponse({"ok": True, "ignored": True})
            user_id = metadata.get("user_id")
            customer_id = data_object.get("customer")
            price_id = _extract_price_id(data_object)
            resolved_user_id = int(user_id) if user_id else None
            update_orb_subscription_state(
                conn,
                user_id=resolved_user_id,
                stripe_customer_id=str(customer_id) if customer_id else None,
                stripe_subscription_id=str(data_object.get("id")),
                stripe_price_id=price_id,
                orb_plan=map_stripe_price_to_plan(price_id),
                subscription_status=str(data_object.get("status") or "inactive"),
                current_period_start=_dt_from_unix(data_object.get("current_period_start")),
                current_period_end=_dt_from_unix(data_object.get("current_period_end")),
                cancel_at_period_end=bool(data_object.get("cancel_at_period_end")),
                clear_payment_failed=str(data_object.get("status") or "") in {"active", "trialing"},
            )
            if subscription_grants_orb_access(data_object.get("status")) and resolved_user_id:
                _record_analytics(conn, user_id=resolved_user_id, event="subscription_active")

        elif event_type == "customer.subscription.deleted":
            customer_id = data_object.get("customer")
            if customer_id:
                update_orb_subscription_state(
                    conn,
                    stripe_customer_id=str(customer_id),
                    stripe_subscription_id=None,
                    subscription_status="cancelled",
                    cancel_at_period_end=False,
                )

        elif event_type == "invoice.payment_failed":
            customer_id = data_object.get("customer")
            if customer_id:
                update_orb_subscription_state(
                    conn,
                    stripe_customer_id=str(customer_id),
                    subscription_status="past_due",
                    payment_failed_at=datetime.now(timezone.utc),
                )

        elif event_type == "invoice.payment_succeeded":
            customer_id = data_object.get("customer")
            subscription_id = data_object.get("subscription")
            if customer_id and subscription_id:
                subscription = stripe.Subscription.retrieve(subscription_id)
                price_id = _extract_price_id(subscription)
                update_orb_subscription_state(
                    conn,
                    stripe_customer_id=str(customer_id),
                    stripe_subscription_id=str(subscription_id),
                    stripe_price_id=price_id,
                    orb_plan=map_stripe_price_to_plan(price_id),
                    subscription_status=str(subscription.get("status") or "active"),
                    current_period_start=_dt_from_unix(subscription.get("current_period_start")),
                    current_period_end=_dt_from_unix(subscription.get("current_period_end")),
                    clear_payment_failed=True,
                )
        if stripe_event_id:
            record_orb_stripe_event(
                conn,
                stripe_event_id=stripe_event_id,
                event_type=event_type,
                status="processed",
                metadata={"product": "orb_residential"},
            )
        conn.commit()
        return JSONResponse({"ok": True})
    except Exception:
        logger.exception("ORB webhook handling failed event_type=%s", event_type)
        conn.rollback()
        raise HTTPException(status_code=500, detail="Webhook handling failed")
