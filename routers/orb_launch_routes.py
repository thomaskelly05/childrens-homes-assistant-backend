from __future__ import annotations

"""Canonical ORB Residential launch API — single front door at app.indicare.co.uk.

Aliases and converges existing standalone ORB services under stable /orb/* paths
without duplicating business logic.
"""

import logging
import os
from typing import Any

import stripe
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from auth.current_user import get_bearer_token
from auth.orb_residential_auth_loader import get_optional_orb_residential_user
from auth.orb_residential_dependencies import require_orb_residential_auth
from db.connection import get_db
from db.orb_residential_db import get_orb_user_preferences, upsert_orb_user_preferences
from db.orb_subscription_db import get_orb_subscription, has_orb_safety_acceptance
from schemas.orb_residential_premium import OrbOnboardingPreferencesRequest
from services.orb_access_service import orb_access_service
from services.orb_build_version import orb_build_response_headers
from services.orb_front_door_verdict_service import build_front_door_verdict
from services.orb_home_profile_service import orb_home_profile_service
from services.orb_learning_micro_service import orb_learning_micro_service
from services.orb_memory_service import orb_memory_service
from services.orb_onboarding_profile_service import orb_onboarding_profile_service
from services.orb_oauth_service import load_provider_config
from services.orb_production_config_service import (
    oauth_config_warnings,
    oauth_providers_diagnostics,
    passkey_config_warnings,
    stripe_config_warnings,
)
from services.orb_subscription_plan_service import (
    ORB_RESIDENTIAL_PRICE_LABEL,
    orb_residential_stripe_price_id,
    orb_subscription_plan_service,
    stripe_configured,
)
from services.shared_institutional_cognition_runtime import shared_institutional_cognition_runtime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orb", tags=["ORB Residential Launch"])

APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3001").strip()
FRONTEND_APP_URL = os.getenv("FRONTEND_APP_URL", APP_BASE_URL).strip()
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


def _success(data: Any, **extra: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {"success": True, "data": data}
    payload.update(extra)
    return payload


def _oauth_providers() -> dict[str, bool]:
    return {
        "google": load_provider_config("google") is not None,
        "microsoft": load_provider_config("microsoft") is not None,
        "apple": load_provider_config("apple") is not None,
    }


def _payments_summary(conn, user_id: int, *, user: dict[str, Any]) -> dict[str, Any]:
    subscription = get_orb_subscription(conn, user_id) or {}
    return {
        "plan": orb_subscription_plan_service.resolve_plan_for_user(user=user, subscription=subscription),
        "price_label": ORB_RESIDENTIAL_PRICE_LABEL,
        "stripe_price_id": orb_residential_stripe_price_id() or None,
        "stripe_configured": stripe_configured(),
        "wallet_payments": {
            "apple_pay": True,
            "google_pay": True,
            "card": True,
            "note": "Apple Pay and Google Pay appear in Stripe Checkout when the domain is verified in the Stripe Dashboard.",
        },
        "subscription_status": subscription.get("subscription_status"),
        "cancel_at_period_end": subscription.get("cancel_at_period_end"),
    }


class OrbProfilePatchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    role_label: str | None = Field(default=None, max_length=120)
    work_environment: str | None = Field(default=None, max_length=160)
    preferred_support_style: str | None = Field(default=None, max_length=120)
    home_profile: dict[str, Any] | None = None
    preferences: dict[str, Any] = Field(default_factory=dict)


class OrbMemoryPatchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    preferred_role: str | None = None
    preferred_support_style: str | None = None
    favourite_tools: list[str] | None = None
    favourite_templates: list[str] | None = None
    learning_history: list[str] | None = None
    recent_reviews: list[str] | None = None
    saved_output_refs: list[str] | None = None
    main_use_cases: list[str] | None = None
    home_profile: dict[str, Any] | None = None


class OrbLearnFromAnswerRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    answer: str = Field(..., min_length=1, max_length=50_000)
    format: str | None = Field(
        default=None,
        description="micro-learning | staff_briefing | knowledge_check | reflective_exercise | cpd_note",
    )
    topic: str | None = Field(default=None, max_length=500)


class OrbSubscriptionCheckoutRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success_url: str | None = Field(default=None, max_length=2000)
    cancel_url: str | None = Field(default=None, max_length=2000)


class OrbSubscriptionCancelRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    at_period_end: bool = True


@router.get("/setup")
async def get_orb_setup(
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    access = orb_access_service.build_access_payload(user_id, conn=conn, user=current_user)
    prefs = get_orb_user_preferences(conn, user_id) or {}
    safety = has_orb_safety_acceptance(conn, user_id)
    payload = orb_onboarding_profile_service.build_setup_payload(
        access=access,
        preferences=prefs,
        safety_accepted=safety,
        oauth_providers=_oauth_providers(),
        payments=_payments_summary(conn, user_id, user=current_user),
        front_door_url=FRONTEND_APP_URL.rstrip("/"),
    )
    payload["memory"] = orb_memory_service.extract(prefs)
    payload["home_profile_service"] = {
        "locality_enabled": orb_home_profile_service.locality_enabled(prefs),
    }
    return _success(payload)


@router.post("/setup")
async def post_orb_setup(
    payload: OrbOnboardingPreferencesRequest,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    merged_prefs = payload.preferences
    if payload.preferences.get("home_profile"):
        merged_prefs = orb_home_profile_service.merge_profile(
            payload.preferences,
            home_profile=payload.preferences.get("home_profile"),
        )
    row = upsert_orb_user_preferences(
        conn,
        user_id=user_id,
        role_label=payload.role_label,
        work_environment=payload.work_environment,
        preferred_support_style=payload.preferred_support_style,
        onboarding_completed=payload.onboarding_completed,
        preferences=merged_prefs,
    )
    conn.commit()
    access = orb_access_service.build_access_payload(user_id, conn=conn, user=current_user)
    setup = orb_onboarding_profile_service.build_setup_payload(
        access=access,
        preferences=row,
        safety_accepted=has_orb_safety_acceptance(conn, user_id),
        oauth_providers=_oauth_providers(),
        payments=_payments_summary(conn, user_id, user=current_user),
        front_door_url=FRONTEND_APP_URL.rstrip("/"),
    )
    return _success(setup)


@router.get("/profile")
async def get_orb_profile(
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    prefs = get_orb_user_preferences(conn, user_id) or {}
    return _success(
        {
            "email": current_user.get("email"),
            "role_label": prefs.get("role_label"),
            "work_environment": prefs.get("work_environment"),
            "preferred_support_style": prefs.get("preferred_support_style"),
            "onboarding_completed_at": prefs.get("onboarding_completed_at"),
            "home_profile": orb_home_profile_service.get_profile(prefs),
            "memory": orb_memory_service.extract(prefs),
            "standalone": True,
            "os_records_accessed": False,
        }
    )


@router.patch("/profile")
async def patch_orb_profile(
    payload: OrbProfilePatchRequest,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    existing = get_orb_user_preferences(conn, user_id) or {}
    prefs = dict(payload.preferences or {})
    if payload.home_profile:
        prefs = orb_home_profile_service.merge_profile(existing, home_profile=payload.home_profile)
    row = upsert_orb_user_preferences(
        conn,
        user_id=user_id,
        role_label=payload.role_label or existing.get("role_label"),
        work_environment=payload.work_environment or existing.get("work_environment"),
        preferred_support_style=payload.preferred_support_style or existing.get("preferred_support_style"),
        onboarding_completed=bool(existing.get("onboarding_completed_at")),
        preferences=prefs or existing.get("preferences") or {},
    )
    conn.commit()
    return _success(
        {
            "profile": row,
            "home_profile": orb_home_profile_service.get_profile(row),
            "memory": orb_memory_service.extract(row),
        }
    )


@router.get("/memory")
async def get_orb_memory(
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    prefs = get_orb_user_preferences(conn, int(current_user["user_id"])) or {}
    return _success(orb_memory_service.extract(prefs))


@router.patch("/memory")
async def patch_orb_memory(
    payload: OrbMemoryPatchRequest,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    existing = get_orb_user_preferences(conn, user_id) or {}
    merged = orb_memory_service.merge_patch(existing, payload.model_dump(exclude_none=True))
    row = upsert_orb_user_preferences(
        conn,
        user_id=user_id,
        role_label=merged.get("role_label"),
        work_environment=merged.get("work_environment"),
        preferred_support_style=merged.get("preferred_support_style"),
        onboarding_completed=bool(existing.get("onboarding_completed_at")),
        preferences=merged.get("preferences") or {},
    )
    conn.commit()
    return _success(orb_memory_service.extract(row))


@router.get("/subscription")
async def get_orb_subscription_status(
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    access = orb_access_service.build_access_payload(user_id, conn=conn, user=current_user)
    subscription = get_orb_subscription(conn, user_id)
    return _success(
        {
            "access": access,
            "subscription": subscription,
            "payments": _payments_summary(conn, user_id, user=current_user),
        }
    )


@router.post("/subscription/checkout")
async def orb_subscription_checkout(
    payload: OrbSubscriptionCheckoutRequest,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    from routers.orb_billing_routes import OrbCheckoutRequest, orb_standalone_checkout

    base = FRONTEND_APP_URL.rstrip("/")
    success = payload.success_url or f"{base}/orb?billing=success"
    cancel = payload.cancel_url or f"{base}/orb?billing=cancelled"
    return await orb_standalone_checkout(
        OrbCheckoutRequest(success_url=success, cancel_url=cancel),
        conn=conn,
        current_user=current_user,
    )


@router.post("/subscription/portal")
async def orb_subscription_portal(
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    from routers.orb_billing_routes import orb_standalone_billing_portal

    return await orb_standalone_billing_portal(conn=conn, current_user=current_user)


@router.post("/subscription/cancel")
async def orb_subscription_cancel(
    payload: OrbSubscriptionCancelRequest,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    user_id = int(current_user["user_id"])
    subscription = get_orb_subscription(conn, user_id)
    stripe_sub_id = (subscription or {}).get("stripe_subscription_id")
    if not stripe_sub_id:
        raise HTTPException(status_code=400, detail="No active ORB subscription to cancel")
    try:
        if payload.at_period_end:
            updated = stripe.Subscription.modify(str(stripe_sub_id), cancel_at_period_end=True)
        else:
            updated = stripe.Subscription.cancel(str(stripe_sub_id))
        from db.orb_subscription_db import update_orb_subscription_state

        update_orb_subscription_state(
            conn,
            user_id=user_id,
            stripe_subscription_id=str(stripe_sub_id),
            subscription_status=str(updated.get("status") or "cancelled"),
            cancel_at_period_end=bool(updated.get("cancel_at_period_end")),
        )
        conn.commit()
        return _success(
            {
                "status": updated.get("status"),
                "cancel_at_period_end": updated.get("cancel_at_period_end"),
                "current_period_end": updated.get("current_period_end"),
            }
        )
    except stripe.error.StripeError as exc:
        logger.exception("ORB subscription cancel failed user_id=%s", user_id)
        raise HTTPException(status_code=400, detail="Could not cancel subscription") from exc


@router.post("/learn/from-answer")
async def learn_from_answer(
    body: OrbLearnFromAnswerRequest,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    format_map = {
        "micro-learning": "five_minute_session",
        "staff_briefing": "staff_briefing",
        "knowledge_check": "knowledge_check",
        "reflective_exercise": "reflective_supervision",
        "cpd_note": "cpd_note",
    }
    fmt = format_map.get((body.format or "").strip().lower()) or orb_learning_micro_service.detect_format(
        body.format or ""
    )
    topic = body.topic or "professional practice"
    message = f"Turn this ORB answer into a {fmt.replace('_', ' ')}: {topic}"
    structure = orb_learning_micro_service.build_structure(message, topic=topic)
    structure["format"] = fmt
    context = shared_institutional_cognition_runtime.build_context(
        surface="standalone_orb",
        message=message,
        mode="Learn",
    )
    user_id = int(current_user["user_id"])
    prefs = get_orb_user_preferences(conn, user_id) or {}
    merged = orb_memory_service.append_learning(
        prefs,
        {"format": fmt, "topic": topic, "source": "from_answer"},
    )
    upsert_orb_user_preferences(
        conn,
        user_id=user_id,
        role_label=merged.get("role_label"),
        work_environment=merged.get("work_environment"),
        preferred_support_style=merged.get("preferred_support_style"),
        onboarding_completed=bool(merged.get("onboarding_completed_at")),
        preferences=merged.get("preferences") or {},
    )
    conn.commit()
    return _success(
        {
            "structure": structure,
            "prompt_guidance": orb_learning_micro_service.prompt_block(message, prior_answer=body.answer),
            "cognition": context,
            "usage_hint": "POST /orb/standalone/conversation with mode Learn for the full generated artefact.",
        }
    )


@router.get("/front-door/verdict")
async def orb_front_door_verdict(
    request: Request,
    conn=Depends(get_db),
    bearer_token: str | None = Depends(get_bearer_token),
):
    """Canonical ORB front-door decision — no product payloads, no premium gate."""
    verdict = build_front_door_verdict(request, conn, bearer_token)
    headers = orb_build_response_headers(contract_version=verdict.get("contract_version"))
    if verdict.get("clear_session"):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content=jsonable_encoder({"success": False, "data": verdict}),
            headers=headers,
        )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=jsonable_encoder({"success": True, "data": verdict}),
        headers=headers,
    )


@router.get("/auth/providers")
async def list_auth_providers(current_user=Depends(get_optional_orb_residential_user)):
    """OAuth availability for the unified sign-in screen."""
    diagnostics = oauth_providers_diagnostics()
    return _success(
        {
            "email": True,
            "oauth": _oauth_providers(),
            "passkeys": True,
            "signup_path": "/orb/standalone/auth/signup",
            "oauth_start_template": "/orb/standalone/auth/oauth/{provider}/start",
            "oauth_callback_template": "/orb/standalone/auth/oauth/{provider}/callback",
            "login_path": "/orb",
            "front_door_url": f"{FRONTEND_APP_URL.rstrip('/')}/orb",
            "legal": {"privacy": "/privacy", "terms": "/terms"},
            "oauth_diagnostics": diagnostics,
            "config_warnings": {
                "stripe": stripe_config_warnings(),
                "oauth": oauth_config_warnings(),
                "passkeys": passkey_config_warnings(),
            },
        }
    )
