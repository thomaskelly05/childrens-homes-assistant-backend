from __future__ import annotations

"""ORB Residential premium routes.

These routes intentionally separate standalone ORB premium functionality from
IndiCare OS operational routes.

Purpose:
- onboarding preferences
- premium access checks
- Shift Builder access
- saved outputs
- saved projects
- future workspace continuity
"""

from fastapi import APIRouter

router = APIRouter(prefix="/orb/residential", tags=["ORB Residential"])


@router.get("/health")
async def orb_residential_health() -> dict[str, object]:
    return {
        "ok": True,
        "surface": "orb_residential",
        "premium": True,
        "powered_by": "IndiCare Intelligence",
        "shared_intelligence_spine": True,
    }


@router.get("/product")
async def orb_residential_product_definition() -> dict[str, object]:
    return {
        "name": "ORB Residential",
        "tagline": "Powered by IndiCare Intelligence",
        "price_gbp_monthly": 9.99,
        "positioning": "Residential care intelligence",
        "premium": True,
        "core_workflows": [
            "Ask ORB",
            "Shift Builder",
            "Record This Properly",
            "Safeguarding Thinking",
            "Therapeutic Reframe",
            "Ofsted Lens",
            "Supervision Prep",
            "Manager Review",
        ],
        "standalone_boundaries": {
            "live_record_access": False,
            "chronology_access": False,
            "provider_dashboard_access": False,
            "operational_state_access": False,
        },
    }
