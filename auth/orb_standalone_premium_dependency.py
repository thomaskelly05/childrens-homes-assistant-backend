from __future__ import annotations

from typing import Any

from fastapi import Depends, HTTPException, status

from auth.orb_residential_auth_loader import get_orb_residential_user
from db.connection import get_db
from services.orb_access_service import orb_access_service


def require_rich_orb_premium_access(
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_orb_residential_user),
) -> dict[str, Any]:
    """Premium gate for the rich /orb experience.

    The existing ChatGPT-like ORB UI uses /orb/standalone/* routes. Those routes
    are now the canonical ORB Residential product surface and should be governed
    by the same £9.99/month ORB trial/subscription model as /orb/residential/*.
    """
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in to use ORB Residential")

    decision = orb_access_service.check_access(conn, user_id=int(user_id), workflow="ask_orb")
    if decision.allowed:
        current_user["orb_access"] = decision.access_state
        return current_user

    upgrade = orb_access_service.build_upgrade_payload()
    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail={
            "error": "premium_required",
            "product": upgrade["product"],
            "price_gbp_monthly": upgrade["price_gbp_monthly"],
            "tagline": upgrade["tagline"],
            "reason": decision.reason,
            "trial": upgrade["trial"],
            "access_state": decision.access_state,
            "upgrade": upgrade,
            "os_links": False,
        },
    )
