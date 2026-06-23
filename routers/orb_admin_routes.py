"""ORB admin quality review and billing usage routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
from auth.permissions import require_admin
from schemas.orb_feedback import OrbCandidateReviewRequest, OrbFeedbackMarkReviewedRequest
from services.orb_admin_quality_service import orb_admin_quality_service
from services.orb_billing_meter_service import orb_billing_meter_service
from services.orb_home_documents_service import orb_home_documents_service
from services.orb_improvement_candidate_service import orb_improvement_candidate_service

router = APIRouter(prefix="/orb/admin", tags=["ORB Admin Quality Review"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


@router.get("/feedback/summary")
async def admin_orb_feedback_summary(
    days: int = Query(default=30, ge=1, le=365),
    _admin=Depends(require_admin),
):
    summary = orb_admin_quality_service.build_summary(days=days)
    return _success(summary)


@router.get("/feedback/items")
async def admin_orb_feedback_items(
    days: int | None = Query(default=30, ge=1, le=365),
    rating: str | None = Query(default=None),
    reason: str | None = Query(default=None),
    mode: str | None = Query(default=None),
    prompt_tier: str | None = Query(default=None),
    detected_family: str | None = Query(default=None),
    action_id: str | None = Query(default=None),
    document_lens: str | None = Query(default=None),
    reviewed: bool | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    _admin=Depends(require_admin),
):
    items = orb_admin_quality_service.list_feedback_items(
        days=days,
        rating=rating,
        reason=reason,
        mode=mode,
        prompt_tier=prompt_tier,
        detected_family=detected_family,
        action_id=action_id,
        document_lens=document_lens,
        reviewed=reviewed,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    return _success({"items": items, "limit": limit, "offset": offset})


@router.get("/feedback/candidates")
async def admin_orb_feedback_candidates(
    status: str | None = Query(default=None),
    candidate_type: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    _admin=Depends(require_admin),
):
    candidates = orb_improvement_candidate_service.list_candidates(
        status=status,
        candidate_type=candidate_type,
        limit=limit,
        offset=offset,
    )
    return _success({"candidates": candidates, "limit": limit, "offset": offset})


@router.post("/feedback/candidates/{candidate_id}/approve")
async def admin_approve_improvement_candidate(
    candidate_id: str,
    payload: OrbCandidateReviewRequest | None = None,
    admin=Depends(require_admin),
):
    note = payload.reviewer_note if payload else None
    row = orb_improvement_candidate_service.approve(
        candidate_id=candidate_id,
        reviewed_by=int(admin["id"]) if admin.get("id") is not None else None,
        reviewer_note=note,
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found or already reviewed")
    return _success(row)


@router.post("/feedback/candidates/{candidate_id}/reject")
async def admin_reject_improvement_candidate(
    candidate_id: str,
    payload: OrbCandidateReviewRequest | None = None,
    admin=Depends(require_admin),
):
    note = payload.reviewer_note if payload else None
    row = orb_improvement_candidate_service.reject(
        candidate_id=candidate_id,
        reviewed_by=int(admin["id"]) if admin.get("id") is not None else None,
        reviewer_note=note,
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found or already reviewed")
    return _success(row)


@router.post("/feedback/items/{feedback_id}/mark-reviewed")
async def admin_mark_feedback_reviewed(
    feedback_id: int,
    payload: OrbFeedbackMarkReviewedRequest | None = None,
    admin=Depends(require_admin),
):
    note = payload.reviewer_note if payload else None
    row = orb_admin_quality_service.mark_feedback_reviewed(
        feedback_id=feedback_id,
        reviewed_by=int(admin["id"]) if admin.get("id") is not None else None,
        reviewer_note=note,
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
    return _success(row)


@router.get("/billing/usage")
async def admin_orb_billing_usage(
    days: int = Query(default=30, ge=1, le=365),
    _admin=Depends(require_admin),
):
    return _success(orb_billing_meter_service.admin_usage_summary(days=days))


@router.get("/home-documents/analytics")
async def admin_home_documents_analytics(_admin=Depends(require_admin)):
    return _success(orb_home_documents_service.founder_analytics())
