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

from auth.current_user import get_bearer_token
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

ORB_CHECKOUT_CONFIG_ERROR = "Checkout is not available yet. Billing configuration needs attention."
ORB_EXPECTED_PRICE_UNIT_AMOUNT = 999  # £9.99/month in GBP pence


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


def _stripe_attr(obj: Any, key: str, default: Any = None) -> Any:
    """Read a field from a Stripe API object or plain dict safely."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _extract_price_id(subscription_obj: dict[str, Any] | Any) -> str | None:
    items_container = _stripe_attr(subscription_obj, "items") or {}
    items = _stripe_attr(items_container, "data") or []
    if not items:
        return None
    price_obj = _stripe_attr(items[0], "price") or {}
    return _stripe_attr(price_obj, "id")


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


def _validate_orb_stripe_checkout_config() -> str:
    """Validate live Stripe checkout configuration before creating a session."""
    if not STRIPE_SECRET_KEY.startswith("sk_"):
        raise HTTPException(status_code=503, detail=ORB_CHECKOUT_CONFIG_ERROR)

    price_id = orb_residential_stripe_price_id()
    if not price_id.startswith("price_"):
        raise HTTPException(status_code=503, detail=ORB_CHECKOUT_CONFIG_ERROR)

    try:
        price = stripe.Price.retrieve(price_id)
    except stripe.error.StripeError:
        logger.exception("ORB Stripe price validation failed")
        raise HTTPException(status_code=503, detail=ORB_CHECKOUT_CONFIG_ERROR) from None

    active = bool(_stripe_attr(price, "active", False))
    currency = _stripe_attr(price, "currency")
    unit_amount = _stripe_attr(price, "unit_amount")
    recurring = _stripe_attr(price, "recurring")
    interval = _stripe_attr(recurring, "interval") if recurring else None

    if not active:
        raise HTTPException(status_code=503, detail=ORB_CHECKOUT_CONFIG_ERROR)
    if str(currency or "").lower() != "gbp":
        raise HTTPException(status_code=503, detail=ORB_CHECKOUT_CONFIG_ERROR)
    if unit_amount != ORB_EXPECTED_PRICE_UNIT_AMOUNT:
        raise HTTPException(status_code=503, detail=ORB_CHECKOUT_CONFIG_ERROR)
    if interval != "month":
        raise HTTPException(status_code=503, detail=ORB_CHECKOUT_CONFIG_ERROR)

    return price_id


def _safe_stripe_checkout_error(exc: stripe.error.StripeError) -> str:
    param = getattr(exc, "param", None) or ""
    code = getattr(exc, "code", None) or ""
    if code == "parameter_unknown" or param == "automatic_payment_methods":
        return ORB_CHECKOUT_CONFIG_ERROR
    return "Could not create checkout session"


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
    request: Request,
    conn=Depends(get_db),
    bearer_token: str | None = Depends(get_bearer_token),
):
    """Return commercial access payload.

    - No session cookie: guest payload (200 JSON) for marketing/signup surfaces.
    - Invalid or expired session: 401 JSON (frontend clears stale auth).
    - Valid session: full user access payload (200 JSON).

    Does not require premium subscription — avoids circular dependency with premium gates.
    """
    from auth.current_user import _get_request_token

    token = _get_request_token(request, bearer_token)
    if not token:
        return _success(orb_access_service.build_access_payload(None, conn=conn))

    try:
        current_user = get_orb_residential_user(request, bearer_token, conn)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            detail = exc.detail
            error = detail if isinstance(detail, dict) else {"code": "session_invalid", "message": str(detail)}
            return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"success": False, "error": error})
        raise

    user_id = int(current_user["user_id"])
    return _success(orb_access_service.build_access_payload(user_id, conn=conn, user=current_user))


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
    price_id = _validate_orb_stripe_checkout_config()
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
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": _default_success_url(payload.success_url),
            "cancel_url": _default_cancel_url(payload.cancel_url),
            "client_reference_id": str(user_id),
            "metadata": orb_subscription_plan_service.stripe_metadata(user_id=user_id, email=email),
            "subscription_data": {
                "metadata": orb_subscription_plan_service.stripe_metadata(user_id=user_id, email=email),
            },
            "payment_method_types": ["card"],
            "allow_promotion_codes": True,
        }
        session = stripe.checkout.Session.create(**session_kwargs)
        _record_analytics(conn, user_id=user_id, event="checkout_started")
        conn.commit()
        return {"success": True, "checkout_url": session.url}
    except stripe.error.StripeError as exc:
        logger.exception("ORB checkout failed user_id=%s", user_id)
        detail = _safe_stripe_checkout_error(exc)
        status_code = 503 if detail == ORB_CHECKOUT_CONFIG_ERROR else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc


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
    stripe_event_id = str(_stripe_attr(event, "id") or "").strip()
    data_object = event["data"]["object"]

    if stripe_event_id and is_orb_stripe_event_processed(conn, stripe_event_id):
        return JSONResponse({"ok": True, "duplicate": True})

    try:
        if event_type == "checkout.session.completed":
            metadata = _stripe_attr(data_object, "metadata") or {}
            if _stripe_attr(metadata, "product") not in {None, "orb_residential"}:
                return JSONResponse({"ok": True, "ignored": True})
            if _stripe_attr(metadata, "purchase_type") == "usage_topup":
                user_id_raw = _stripe_attr(metadata, "user_id")
                session_id = str(_stripe_attr(data_object, "id") or "")
                amount_raw = _stripe_attr(metadata, "amount_pence") or _stripe_attr(data_object, "amount_total")
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
            user_id = _stripe_attr(metadata, "user_id")
            customer_id = _stripe_attr(data_object, "customer")
            subscription_id = _stripe_attr(data_object, "subscription")
            if user_id and customer_id:
                subscription = stripe.Subscription.retrieve(subscription_id) if subscription_id else None
                price_id = _extract_price_id(subscription) if subscription else orb_residential_stripe_price_id()
                status_value = _stripe_attr(subscription, "status") if subscription else "active"
                update_orb_subscription_state(
                    conn,
                    user_id=int(user_id),
                    stripe_customer_id=str(customer_id),
                    stripe_subscription_id=str(subscription_id) if subscription_id else None,
                    stripe_price_id=price_id,
                    orb_plan=map_stripe_price_to_plan(price_id),
                    subscription_status=str(status_value),
                    current_period_start=_dt_from_unix(_stripe_attr(subscription, "current_period_start")) if subscription else None,
                    current_period_end=_dt_from_unix(_stripe_attr(subscription, "current_period_end")) if subscription else None,
                    cancel_at_period_end=bool(_stripe_attr(subscription, "cancel_at_period_end")) if subscription else False,
                    clear_payment_failed=True,
                )
                _record_analytics(conn, user_id=int(user_id), event="checkout_completed")

        elif event_type in {"customer.subscription.created", "customer.subscription.updated"}:
            metadata = _stripe_attr(data_object, "metadata") or {}
            if _stripe_attr(metadata, "product") not in {None, "orb_residential"} and _stripe_attr(metadata, "user_id") is None:
                customer_id = _stripe_attr(data_object, "customer")
                existing = get_orb_subscription_by_customer_id(conn, str(customer_id)) if customer_id else None
                if not existing:
                    return JSONResponse({"ok": True, "ignored": True})
            user_id = _stripe_attr(metadata, "user_id")
            customer_id = _stripe_attr(data_object, "customer")
            price_id = _extract_price_id(data_object)
            resolved_user_id = int(user_id) if user_id else None
            update_orb_subscription_state(
                conn,
                user_id=resolved_user_id,
                stripe_customer_id=str(customer_id) if customer_id else None,
                stripe_subscription_id=str(_stripe_attr(data_object, "id")),
                stripe_price_id=price_id,
                orb_plan=map_stripe_price_to_plan(price_id),
                subscription_status=str(_stripe_attr(data_object, "status") or "inactive"),
                current_period_start=_dt_from_unix(_stripe_attr(data_object, "current_period_start")),
                current_period_end=_dt_from_unix(_stripe_attr(data_object, "current_period_end")),
                cancel_at_period_end=bool(_stripe_attr(data_object, "cancel_at_period_end")),
                clear_payment_failed=str(_stripe_attr(data_object, "status") or "") in {"active", "trialing"},
            )
            if subscription_grants_orb_access(_stripe_attr(data_object, "status")) and resolved_user_id:
                _record_analytics(conn, user_id=resolved_user_id, event="subscription_active")

        elif event_type == "customer.subscription.deleted":
            customer_id = _stripe_attr(data_object, "customer")
            if customer_id:
                update_orb_subscription_state(
                    conn,
                    stripe_customer_id=str(customer_id),
                    stripe_subscription_id=None,
                    subscription_status="cancelled",
                    cancel_at_period_end=False,
                )

        elif event_type == "invoice.payment_failed":
            customer_id = _stripe_attr(data_object, "customer")
            if customer_id:
                update_orb_subscription_state(
                    conn,
                    stripe_customer_id=str(customer_id),
                    subscription_status="past_due",
                    payment_failed_at=datetime.now(timezone.utc),
                )

        elif event_type == "invoice.payment_succeeded":
            customer_id = _stripe_attr(data_object, "customer")
            subscription_id = _stripe_attr(data_object, "subscription")
            if customer_id and subscription_id:
                subscription = stripe.Subscription.retrieve(subscription_id)
                price_id = _extract_price_id(subscription)
                update_orb_subscription_state(
                    conn,
                    stripe_customer_id=str(customer_id),
                    stripe_subscription_id=str(subscription_id),
                    stripe_price_id=price_id,
                    orb_plan=map_stripe_price_to_plan(price_id),
                    subscription_status=str(_stripe_attr(subscription, "status") or "active"),
                    current_period_start=_dt_from_unix(_stripe_attr(subscription, "current_period_start")),
                    current_period_end=_dt_from_unix(_stripe_attr(subscription, "current_period_end")),
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
