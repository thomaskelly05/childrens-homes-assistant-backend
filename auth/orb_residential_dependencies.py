from __future__ import annotations

"""FastAPI dependencies for ORB Residential premium product."""

from typing import Any

from fastapi import Depends, HTTPException, Request, status

from auth.errors import forbidden
from auth.orb_residential_auth_loader import get_orb_residential_user
from core.policy_engine import policy_engine
from db.connection import get_db
from services.orb_access_service import orb_access_service
from services.orb_runtime_guard_service import orb_runtime_guard_service


ORB_RESIDENTIAL_SURFACE_HEADER = "x-orb-surface"
ORB_RESIDENTIAL_PRODUCT_COOKIE = "orb_product_surface"


def _forbidden(detail: str) -> HTTPException:
    return forbidden("orb_residential_denied", detail)


def is_orb_residential_scoped_request(request: Request) -> bool:
    header = str(request.headers.get(ORB_RESIDENTIAL_SURFACE_HEADER) or "").strip().lower()
    if header in {"orb_residential", "residential", "standalone_premium"}:
        return True
    cookie = str(request.cookies.get(ORB_RESIDENTIAL_PRODUCT_COOKIE) or "").strip().lower()
    if cookie in {"orb_residential", "residential"}:
        return True
    path = str(request.url.path or "").lower()
    return path.startswith("/orb/residential")


def is_orb_residential_only_user(user: dict[str, Any]) -> bool:
    """Users without OS record access are treated as ORB Residential scoped."""
    if policy_engine.has_permission(user, "records:read"):
        return False
    if policy_engine.has_permission(user, "provider:read"):
        return False
    role = str(user.get("role") or "").strip().lower()
    if role in {"orb_residential", "standalone_orb", "orb_user"}:
        return True
    return not policy_engine.has_permission(user, "chronology:read")


def require_orb_residential_auth(
    current_user: dict[str, Any] = Depends(get_orb_residential_user),
) -> dict[str, Any]:
    if not current_user.get("user_id"):
        raise _forbidden("Sign in to use ORB Residential")
    return current_user


def require_orb_residential_premium(
    request: Request,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(require_orb_residential_auth),
    workflow: str = "ask_orb",
) -> dict[str, Any]:
    user_id = current_user.get("user_id") or current_user.get("id")
    if not user_id:
        raise _forbidden("Sign in to use ORB Residential")
    decision = orb_access_service.check_access(
        conn,
        user_id=int(user_id),
        workflow=workflow,
    )
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


def require_orb_residential_route_allowed(request: Request) -> None:
    route = str(request.url.path or "")
    if not is_orb_residential_scoped_request(request):
        return
    guard = orb_runtime_guard_service.check_route_access(route=route, surface="orb_residential")
    if not guard.allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=orb_runtime_guard_service.build_boundary_response(),
        )


def orb_residential_premium_dependency(workflow: str):
    def dependency(
        request: Request,
        conn=Depends(get_db),
        current_user: dict[str, Any] = Depends(require_orb_residential_auth),
    ) -> dict[str, Any]:
        require_orb_residential_route_allowed(request)
        return require_orb_residential_premium(
            request,
            conn=conn,
            current_user=current_user,
            workflow=workflow,
        )

    return dependency
