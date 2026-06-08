from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException, Request, status

from auth.current_user import _get_request_token
from auth.orb_residential_auth_loader import get_orb_residential_user
from db.connection import DatabaseUnavailableError
from services.orb_access_service import orb_access_service
from services.orb_build_version import ORB_FRONT_DOOR_CONTRACT_VERSION, get_backend_build_marker

logger = logging.getLogger(__name__)

VERDICT_UNAUTHENTICATED = "unauthenticated"
VERDICT_INACTIVE = "inactive"
VERDICT_SAFETY_REQUIRED = "safety_required"
VERDICT_READY = "ready"
VERDICT_RETRY = "retry"


def _safe_user_summary(user: dict[str, Any] | None, *, conn=None) -> dict[str, Any] | None:
    if not user:
        return None
    user_id = user.get("id") or user.get("user_id")
    if conn is not None and user_id is not None:
        from services.orb_user_avatar_service import enrich_user_summary

        return enrich_user_summary(user, conn, int(user_id))
    return {
        "id": user_id,
        "email": user.get("email"),
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "role": user.get("role"),
        "avatar_url": None,
        "auth_provider": None,
    }


def _safe_subscription_summary(access: dict[str, Any]) -> dict[str, Any]:
    subscription = access.get("subscription") or {}
    trial = access.get("trial") or {}
    billing = access.get("billing") or {}
    return {
        "can_use_orb": bool(access.get("can_use_orb")),
        "access_state": access.get("access_state"),
        "access_blocker": access.get("access_blocker"),
        "safety_accepted": bool(access.get("safety_accepted")),
        "trial": {
            "available": bool(trial.get("available")),
            "active": bool(trial.get("active")),
            "days_left": trial.get("days_left"),
            "expires_at": trial.get("expires_at"),
        },
        "subscription": {
            "active": bool(subscription.get("active")),
            "status": subscription.get("status"),
            "plan_name": subscription.get("plan_name"),
        },
        "billing": {
            "stripe_configured": bool(billing.get("stripe_configured")),
            "price_gbp_monthly": billing.get("price_gbp_monthly"),
        },
    }


def _base_verdict(
    *,
    verdict: str,
    authenticated: bool,
    can_use_orb: bool,
    reason: str,
    clear_session: bool = False,
    access_blocker: str | None = None,
    safety_accepted: bool = False,
    subscription_summary: dict[str, Any] | None = None,
    user_summary: dict[str, Any] | None = None,
    access_payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    frontend_should_mount_product = verdict == VERDICT_READY
    allowed_bootstrap = verdict == VERDICT_READY
    return {
        "contract_version": ORB_FRONT_DOOR_CONTRACT_VERSION,
        "verdict": verdict,
        "authenticated": authenticated,
        "can_use_orb": can_use_orb,
        "access_blocker": access_blocker,
        "safety_accepted": safety_accepted,
        "subscription": subscription_summary,
        "user": user_summary,
        "frontend_should_mount_product": frontend_should_mount_product,
        "allowed_bootstrap": allowed_bootstrap,
        "backend_build": get_backend_build_marker(),
        "reason": reason,
        "clear_session": clear_session,
        "access": access_payload,
    }


def build_front_door_verdict(
    request: Request,
    conn,
    bearer_token: str | None = None,
) -> dict[str, Any]:
    """Single canonical ORB front-door decision — mirrors /orb/standalone/access logic."""
    token = _get_request_token(request, bearer_token)
    if not token:
        guest_access = orb_access_service.build_access_payload(None, conn=conn)
        return _base_verdict(
            verdict=VERDICT_UNAUTHENTICATED,
            authenticated=False,
            can_use_orb=False,
            reason="no_session",
            access_blocker=guest_access.get("access_blocker"),
            safety_accepted=False,
            subscription_summary=_safe_subscription_summary(guest_access),
        )

    try:
        current_user = get_orb_residential_user(request, bearer_token, conn)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            return _base_verdict(
                verdict=VERDICT_UNAUTHENTICATED,
                authenticated=False,
                can_use_orb=False,
                reason="session_invalid",
                clear_session=True,
            )
        logger.warning("ORB front-door verdict auth failure status=%s", exc.status_code)
        return _base_verdict(
            verdict=VERDICT_RETRY,
            authenticated=False,
            can_use_orb=False,
            reason="auth_check_failed",
        )
    except DatabaseUnavailableError:
        return _base_verdict(
            verdict=VERDICT_RETRY,
            authenticated=False,
            can_use_orb=False,
            reason="database_unavailable",
        )
    except Exception:
        logger.exception("ORB front-door verdict unexpected auth failure")
        return _base_verdict(
            verdict=VERDICT_RETRY,
            authenticated=False,
            can_use_orb=False,
            reason="auth_check_unavailable",
        )

    user_id = int(current_user["user_id"])
    try:
        access_payload = orb_access_service.build_access_payload(user_id, conn=conn, user=current_user)
    except Exception:
        logger.exception("ORB front-door verdict access payload failed user_id=%s", user_id)
        return _base_verdict(
            verdict=VERDICT_RETRY,
            authenticated=True,
            can_use_orb=False,
            reason="access_payload_unavailable",
            user_summary=_safe_user_summary(current_user, conn=conn),
        )

    subscription_summary = _safe_subscription_summary(access_payload)
    user_summary = _safe_user_summary(current_user, conn=conn)
    safety_accepted = bool(access_payload.get("safety_accepted"))
    can_use_orb = bool(access_payload.get("can_use_orb"))
    access_blocker = access_payload.get("access_blocker")

    if access_payload.get("db_error"):
        return _base_verdict(
            verdict=VERDICT_RETRY,
            authenticated=True,
            can_use_orb=False,
            reason="access_check_unavailable",
            access_blocker=access_blocker,
            safety_accepted=safety_accepted,
            subscription_summary=subscription_summary,
            user_summary=user_summary,
        )

    if not safety_accepted:
        entitled = bool(
            access_payload.get("trial", {}).get("active")
            or access_payload.get("subscription", {}).get("active")
            or access_payload.get("access_state") in {"admin_bypass", "founding_plan_bypass"}
        )
        if entitled or access_blocker == "safety_acceptance":
            return _base_verdict(
                verdict=VERDICT_SAFETY_REQUIRED,
                authenticated=True,
                can_use_orb=False,
                reason="safety_acceptance_required",
                access_blocker=access_blocker or "safety_acceptance",
                safety_accepted=False,
                subscription_summary=subscription_summary,
                user_summary=user_summary,
                access_payload=access_payload,
            )

    if not can_use_orb:
        return _base_verdict(
            verdict=VERDICT_INACTIVE,
            authenticated=True,
            can_use_orb=False,
            reason=str(access_payload.get("access_state") or "premium_required"),
            access_blocker=access_blocker,
            safety_accepted=safety_accepted,
            subscription_summary=subscription_summary,
            user_summary=user_summary,
            access_payload=access_payload,
        )

    return _base_verdict(
        verdict=VERDICT_READY,
        authenticated=True,
        can_use_orb=True,
        reason="ready",
        access_blocker=None,
        safety_accepted=safety_accepted,
        subscription_summary=subscription_summary,
        user_summary=user_summary,
        access_payload=access_payload,
    )
