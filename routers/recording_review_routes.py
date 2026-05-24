"""Manager review queue for operational recording drafts — authenticated OS only."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.recording_review import RecordingReviewActionRequest, RecordingReviewQueueFilters
from services.recording_review_service import recording_review_service

router = APIRouter(prefix="/recording-reviews", tags=["Recording Reviews"])
compat_router = APIRouter(prefix="/api/recording-reviews", tags=["Recording Reviews API"])


def _success(data: Any) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "operational_only": True,
        "standalone_access": False,
    }


def _user_dict(current_user: Any) -> dict[str, Any]:
    if isinstance(current_user, dict):
        return current_user
    return dict(current_user)


@router.get("/health")
async def recording_reviews_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    return _success(recording_review_service.get_review_health(conn=conn).model_dump())


@compat_router.get("/health")
async def api_recording_reviews_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await recording_reviews_health(current_user=current_user, conn=conn)


@router.get("/summary")
async def recording_reviews_summary(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return _success(
        recording_review_service.get_review_summary(_user_dict(current_user), conn=conn).model_dump()
    )


@compat_router.get("/summary")
async def api_recording_reviews_summary(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await recording_reviews_summary(current_user=current_user, conn=conn)


@router.get("/queue")
async def recording_reviews_queue(
    review_status: str | None = None,
    safeguarding_only: bool = False,
    manager_review_only: bool = False,
    changes_requested_only: bool = False,
    approved_only: bool = False,
    urgent_only: bool = False,
    child_id: int | None = None,
    home_id: int | None = None,
    recording_type: str | None = None,
    mine_only: bool = False,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    filters = RecordingReviewQueueFilters(
        review_status=review_status,
        safeguarding_only=safeguarding_only,
        manager_review_only=manager_review_only,
        changes_requested_only=changes_requested_only,
        approved_only=approved_only,
        urgent_only=urgent_only,
        child_id=child_id,
        home_id=home_id,
        recording_type=recording_type,
        mine_only=mine_only,
        limit=limit,
        offset=offset,
    )
    result = recording_review_service.list_review_queue(_user_dict(current_user), filters, conn=conn)
    return _success(result.model_dump())


@compat_router.get("/queue")
async def api_recording_reviews_queue(
    review_status: str | None = None,
    safeguarding_only: bool = False,
    manager_review_only: bool = False,
    changes_requested_only: bool = False,
    approved_only: bool = False,
    urgent_only: bool = False,
    child_id: int | None = None,
    home_id: int | None = None,
    recording_type: str | None = None,
    mine_only: bool = False,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await recording_reviews_queue(
        review_status=review_status,
        safeguarding_only=safeguarding_only,
        manager_review_only=manager_review_only,
        changes_requested_only=changes_requested_only,
        approved_only=approved_only,
        urgent_only=urgent_only,
        child_id=child_id,
        home_id=home_id,
        recording_type=recording_type,
        mine_only=mine_only,
        limit=limit,
        offset=offset,
        current_user=current_user,
        conn=conn,
    )


@router.get("/{draft_id}")
async def get_recording_review_detail(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    detail = recording_review_service.get_review_detail(draft_id, _user_dict(current_user), conn=conn)
    if not detail:
        raise HTTPException(status_code=404, detail="Recording draft not found or access denied.")
    return _success(detail.model_dump())


@compat_router.get("/{draft_id}")
async def api_get_recording_review_detail(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await get_recording_review_detail(draft_id=draft_id, current_user=current_user, conn=conn)


@router.post("/{draft_id}/action")
async def apply_recording_review_action(
    draft_id: str,
    payload: RecordingReviewActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    result = recording_review_service.apply_review_action(
        draft_id, payload, _user_dict(current_user), conn=conn
    )
    if not result:
        raise HTTPException(status_code=404, detail="Recording draft not found or access denied.")
    return _success(result.model_dump())


@compat_router.post("/{draft_id}/action")
async def api_apply_recording_review_action(
    draft_id: str,
    payload: RecordingReviewActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await apply_recording_review_action(
        draft_id=draft_id, payload=payload, current_user=current_user, conn=conn
    )
