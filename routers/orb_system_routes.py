"""ORB Residential system health and readiness checks."""

from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, Depends

from auth.permissions import require_admin
from core.router_loader import get_failed_routers, get_router_registry_summary
from services.orb_saved_output_service import orb_saved_output_service
from services.orb_schema_verification import run_orb_migration_checks

router = APIRouter(prefix="/orb/system", tags=["ORB System"])


def _overall_status(checks: dict[str, dict[str, Any]]) -> str:
    statuses = [str(item.get("status") or "fail") for item in checks.values()]
    if any(status == "fail" for status in statuses):
        return "fail"
    if any(status == "degraded" for status in statuses):
        return "degraded"
    return "ok"


@router.get("/health")
async def orb_system_health(_admin=Depends(require_admin)) -> dict[str, Any]:
    migration = run_orb_migration_checks()
    saved_schema = orb_saved_output_service.verify_schema()
    stripe_key = bool(os.environ.get("STRIPE_SECRET_KEY", "").strip())
    stripe_price = bool(os.environ.get("ORB_RESIDENTIAL_STRIPE_PRICE_ID", "").strip())
    stripe_webhook = bool(os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip())
    app_env = os.environ.get("APP_ENV", "development").lower()
    stripe_status = "ok"
    stripe_message = "Stripe configured"
    if not stripe_key:
        stripe_status = "degraded" if app_env != "production" else "fail"
        stripe_message = "missing STRIPE_SECRET_KEY"
    elif not stripe_price or not stripe_webhook:
        stripe_status = "degraded"
        stripe_message = "missing ORB price ID or webhook secret"

    failed_routers = get_failed_routers()
    router_status = "ok" if not failed_routers else "degraded"

    checks: dict[str, Any] = {
        **migration.get("checks", {}),
        "saved_outputs_schema": saved_schema,
        "knowledge_rbac": migration.get("checks", {}).get(
            "knowledge_privacy_columns", {"status": "degraded"}
        ),
        "router_loader": {
            "status": router_status,
            "failed_count": len(failed_routers),
            "failed": failed_routers[:5],
        },
        "stripe": {"status": stripe_status, "message": stripe_message},
        "ai_provider": {
            "status": "ok" if os.environ.get("OPENAI_API_KEY") else "degraded",
            "message": "OPENAI_API_KEY present" if os.environ.get("OPENAI_API_KEY") else "missing key",
        },
    }
    status = _overall_status(checks)
    if migration.get("status") == "fail":
        status = "fail"
    elif migration.get("status") == "degraded" and status == "ok":
        status = "degraded"
    if saved_schema.get("status") == "fail":
        status = "fail"

    return {
        "status": status,
        "checks": checks,
        "registry": get_router_registry_summary(),
        "standalone_boundary": True,
    }
