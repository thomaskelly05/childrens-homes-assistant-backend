"""Standalone ORB answer feedback — review-only improvement loop."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
from auth.permissions import require_admin
from schemas.orb_feedback import OrbFeedbackSubmitRequest, OrbFeedbackSummaryResponse
from services.orb_feedback_improvement_service import orb_feedback_improvement_service
from services.orb_feedback_service import orb_feedback_service

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
    batch = orb_feedback_service.list_feedback(days=days)
    summary = orb_feedback_improvement_service.build_admin_summary(batch, days=days)
    return _success(OrbFeedbackSummaryResponse(**summary).model_dump())
