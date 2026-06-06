from __future__ import annotations

import logging
from typing import Any

from fastapi import Depends, HTTPException, status

from auth.orb_residential_auth_loader import get_orb_residential_user
from db.connection import get_db
from db.orb_residential_db import _safe_rollback
from services.orb_access_service import orb_access_service

logger = logging.getLogger(__name__)


def require_orb_product_bootstrap_access(
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_orb_residential_user),
) -> dict[str, Any]:
    """Gate ORB product bootstrap routes until session and access are ready.

    Returns 401 when unauthenticated (via ``get_orb_residential_user``),
    403 when safety acceptance is required, and 402 when subscription/trial
    access is inactive. Does not return guest or partial product payloads.
    """
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "not_authenticated",
                "message": "Sign in to use ORB Residential",
                "os_access_granted": False,
            },
        )

    try:
        decision = orb_access_service.check_access(conn, user_id=int(user_id), workflow="ask_orb")
    except Exception:
        _safe_rollback(conn)
        logger.exception("ORB product bootstrap access check failed for user_id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "access_check_unavailable",
                "message": "ORB Residential access could not be verified right now. Please try again shortly.",
                "os_access_granted": False,
            },
        ) from None

    if decision.access_state.get("db_error"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "access_check_unavailable",
                "message": "ORB Residential access could not be verified right now. Please try again shortly.",
                "os_access_granted": False,
            },
        )

    if not decision.access_state.get("safety_accepted", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "safety_acceptance_required",
                "message": "Accept ORB Residential safety statements before use.",
                "os_access_granted": False,
            },
        )

    if not decision.allowed:
        upgrade = orb_access_service.build_upgrade_payload()
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "premium_required",
                "product": upgrade["product"],
                "price_label": upgrade.get("price_label"),
                "price_gbp_monthly": upgrade["price_gbp_monthly"],
                "reason": decision.reason,
                "trial": upgrade["trial"],
                "access_state": decision.access_state,
                "upgrade": upgrade,
                "os_links": False,
            },
        )

    current_user["orb_access"] = decision.access_state
    return current_user
