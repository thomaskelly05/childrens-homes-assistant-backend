"""Standalone ORB answer feedback — review-only improvement loop."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
from auth.permissions import require_admin
from schemas.orb_feedback import OrbFeedbackSubmitRequest
from services.orb_feedback_improvement_service import orb_feedback_improvement_service
from services.orb_feedback_service import orb_feedback_service
from services.orb_admin_quality_service import orb_admin_quality_service
from services.orb_billing_meter_service import orb_billing_meter_service

router = APIRouter(prefix="/orb/standalone", tags=["ORB Standalone Feedback"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


@router.post("/feedback")
async def submit_standalone_orb_feedback(
    payload: OrbFeedbackSubmitRequest,
    current_user=Depends(require_standalone_orb_access),
):
    user_id = int(current_user["id"]) if current_user.get("id") is not None else None
    result = orb_feedback_service.submit(user_id=user_id, request=payload)
    return _success(result.model_dump())


@router.get("/feedback/summary", response_model=None)
async def standalone_orb_feedback_summary(
    days: int = Query(default=30, ge=1, le=365),
    _admin=Depends(require_admin),
):
    summary = orb_admin_quality_service.build_summary(days=days)
    if "thumbs_up_ratio" in summary and "helpful_ratio" not in summary:
        summary["helpful_ratio"] = summary["thumbs_up_ratio"]
    return _success(summary)


@router.get("/billing/meter")
async def standalone_orb_billing_meter(
    current_user=Depends(require_standalone_orb_access),
):
    user_id = int(current_user.get("user_id") or current_user.get("id") or 0)
    if not user_id:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in required")
    meter = orb_billing_meter_service.user_meter(user_id=user_id, user=current_user)
    return _success(meter)
