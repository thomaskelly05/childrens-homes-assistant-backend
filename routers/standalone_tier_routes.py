from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from auth.current_user import get_current_user
from services.standalone_tier_service import assert_feature, is_enabled, tier_from_user, tier_payload

router = APIRouter(prefix="/standalone-tiers", tags=["Standalone Tier Access"])


class FeatureCheckRequest(BaseModel):
    feature: str = Field(..., min_length=1, max_length=120)


@router.get("/me")
def my_tier(current_user: dict[str, Any] = Depends(get_current_user)):
    tier = tier_from_user(current_user)
    payload = tier_payload(tier)
    payload["billing"] = {
        "subscription_active": bool(current_user.get("subscription_active")),
        "subscription_status": current_user.get("subscription_status"),
        "plan_name": current_user.get("plan_name"),
    }
    return {"ok": True, **payload}


@router.post("/check")
def check_feature(payload: FeatureCheckRequest, current_user: dict[str, Any] = Depends(get_current_user)):
    tier = tier_from_user(current_user)
    enabled = is_enabled(tier, payload.feature)
    return {
        "ok": True,
        "tier": tier,
        "feature": payload.feature,
        "enabled": enabled,
        "access": tier_payload(tier)["locked"].get(payload.feature) if not enabled else None,
    }


@router.post("/require")
def require_feature(payload: FeatureCheckRequest, current_user: dict[str, Any] = Depends(get_current_user)):
    assert_feature(current_user, payload.feature)
    return {"ok": True, "tier": tier_from_user(current_user), "feature": payload.feature, "enabled": True}
