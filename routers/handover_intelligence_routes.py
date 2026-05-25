"""Handover intelligence and draft routes — auth-gated, metadata-only."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.handover_drafts import (
    HandoverDraftRequest,
    HandoverDraftUpdateRequest,
    HandoverReviewActionRequest,
)
from services.handover_draft_service import handover_draft_service
from services.handover_formal_mapping_service import handover_formal_mapping_service
from services.handover_intelligence_service import handover_intelligence_service
from services.handover_review_service import handover_review_service

router = APIRouter(prefix="/handover", tags=["Handover Intelligence"])
compat_router = APIRouter(prefix="/api/handover", tags=["Handover Intelligence API"])


def _success(data: Any) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "operational_only": True,
        "standalone_access": False,
        "metadata_only": True,
    }


@router.get("/health")
async def handover_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    health = handover_intelligence_service.get_health(conn=conn)
    draft = handover_draft_service.get_health(conn=conn)
    payload = health.model_dump()
    payload["draft_service"] = draft.service
    payload["draft_storage_mode"] = draft.storage_mode
    payload["draft_count"] = draft.draft_count
    return _success(payload)


@router.get("/intelligence")
async def handover_intelligence(
    child_id: int | None = None,
    home_id: int | None = None,
    shift_label: str | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    filters: dict[str, Any] = {}
    if child_id is not None:
        filters["child_id"] = child_id
    if home_id is not None:
        filters["home_id"] = home_id
    if shift_label:
        filters["shift_label"] = shift_label
    dashboard = handover_intelligence_service.build_dashboard(
        current_user, filters or None, conn=conn
    )
    return _success(dashboard.model_dump())


@router.get("/drafts")
async def list_handover_drafts(
    status: str | None = None,
    child_id: int | None = None,
    home_id: int | None = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    listed = handover_draft_service.list_drafts(
        current_user,
        status=status,
        child_id=child_id,
        home_id=home_id,
        limit=int(limit),
        conn=conn,
    )
    return _success(listed.model_dump())


@router.post("/drafts")
async def create_handover_draft(
    body: HandoverDraftRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    result = handover_draft_service.create_draft(current_user, body, conn=conn)
    return _success(result.model_dump())


@router.get("/drafts/{draft_id}")
async def get_handover_draft(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        record = handover_draft_service.get_draft(current_user, draft_id, conn=conn)
    except KeyError:
        raise HTTPException(status_code=404, detail="Handover draft not found") from None
    return _success(record.model_dump())


@router.patch("/drafts/{draft_id}")
async def update_handover_draft(
    draft_id: str,
    body: HandoverDraftUpdateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        result = handover_draft_service.update_draft(current_user, draft_id, body, conn=conn)
    except KeyError:
        raise HTTPException(status_code=404, detail="Handover draft not found") from None
    if not result.success:
        raise HTTPException(status_code=400, detail=result.warnings[0] if result.warnings else "Update failed")
    return _success(result.model_dump())


@router.post("/drafts/{draft_id}/ready-for-review")
async def handover_draft_ready_for_review(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        result = handover_draft_service.mark_ready_for_review(current_user, draft_id, conn=conn)
    except KeyError:
        raise HTTPException(status_code=404, detail="Handover draft not found") from None
    return _success(result.model_dump())


@router.post("/drafts/{draft_id}/complete")
async def handover_draft_complete(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        result = handover_draft_service.complete_draft(current_user, draft_id, conn=conn)
    except KeyError:
        raise HTTPException(status_code=404, detail="Handover draft not found") from None
    return _success(result.model_dump())


@router.get("/reviews/health")
async def handover_review_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    health = handover_review_service.get_health(conn=conn)
    return _success(health.model_dump())


@router.get("/reviews")
async def list_handover_reviews(
    review_status: str | None = None,
    child_id: int | None = None,
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    filters: dict[str, Any] = {}
    if review_status:
        filters["review_status"] = review_status
    if child_id is not None:
        filters["child_id"] = child_id
    if home_id is not None:
        filters["home_id"] = home_id
    queue = handover_review_service.list_review_queue(
        current_user, filters or None, conn=conn
    )
    return _success(queue.model_dump())


@router.get("/reviews/{draft_id}")
async def get_handover_review(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        detail = handover_review_service.get_review_detail(
            draft_id, current_user, conn=conn
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Handover draft not found") from None
    return _success(detail.model_dump())


@router.post("/reviews/{draft_id}/action")
async def handover_review_action(
    draft_id: str,
    body: HandoverReviewActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        result = handover_review_service.apply_review_action(
            draft_id, body, current_user, conn=conn
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Handover draft not found") from None
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not result.success:
        raise HTTPException(
            status_code=400,
            detail=result.warnings[0] if result.warnings else "Review action failed",
        )
    return _success(result.model_dump())


@router.get("/drafts/{draft_id}/formal-target")
async def handover_formal_target(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    try:
        draft = handover_draft_service.get_draft(current_user, draft_id, conn=conn)
    except KeyError:
        raise HTTPException(status_code=404, detail="Handover draft not found") from None
    target = handover_formal_mapping_service.get_target(draft)
    return _success(target.model_dump())


@router.post("/drafts/{draft_id}/archive")
async def handover_draft_archive(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        result = handover_draft_service.archive_draft(current_user, draft_id, conn=conn)
    except KeyError:
        raise HTTPException(status_code=404, detail="Handover draft not found") from None
    return _success(result.model_dump())


# API mirror routes
@compat_router.get("/health")
async def api_handover_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await handover_health(current_user=current_user, conn=conn)


@compat_router.get("/intelligence")
async def api_handover_intelligence(
    child_id: int | None = None,
    home_id: int | None = None,
    shift_label: str | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await handover_intelligence(
        child_id=child_id,
        home_id=home_id,
        shift_label=shift_label,
        current_user=current_user,
        conn=conn,
    )


@compat_router.get("/drafts")
async def api_list_handover_drafts(
    status: str | None = None,
    child_id: int | None = None,
    home_id: int | None = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await list_handover_drafts(
        status=status,
        child_id=child_id,
        home_id=home_id,
        limit=limit,
        current_user=current_user,
        conn=conn,
    )


@compat_router.post("/drafts")
async def api_create_handover_draft(
    body: HandoverDraftRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await create_handover_draft(body=body, current_user=current_user, conn=conn)


@compat_router.get("/drafts/{draft_id}")
async def api_get_handover_draft(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await get_handover_draft(draft_id=draft_id, current_user=current_user, conn=conn)


@compat_router.patch("/drafts/{draft_id}")
async def api_update_handover_draft(
    draft_id: str,
    body: HandoverDraftUpdateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await update_handover_draft(
        draft_id=draft_id, body=body, current_user=current_user, conn=conn
    )


@compat_router.post("/drafts/{draft_id}/ready-for-review")
async def api_handover_draft_ready_for_review(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await handover_draft_ready_for_review(
        draft_id=draft_id, current_user=current_user, conn=conn
    )


@compat_router.post("/drafts/{draft_id}/complete")
async def api_handover_draft_complete(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await handover_draft_complete(
        draft_id=draft_id, current_user=current_user, conn=conn
    )


@compat_router.post("/drafts/{draft_id}/archive")
async def api_handover_draft_archive(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await handover_draft_archive(
        draft_id=draft_id, current_user=current_user, conn=conn
    )


@compat_router.get("/reviews/health")
async def api_handover_review_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await handover_review_health(current_user=current_user, conn=conn)


@compat_router.get("/reviews")
async def api_list_handover_reviews(
    review_status: str | None = None,
    child_id: int | None = None,
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await list_handover_reviews(
        review_status=review_status,
        child_id=child_id,
        home_id=home_id,
        current_user=current_user,
        conn=conn,
    )


@compat_router.get("/reviews/{draft_id}")
async def api_get_handover_review(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await get_handover_review(
        draft_id=draft_id, current_user=current_user, conn=conn
    )


@compat_router.post("/reviews/{draft_id}/action")
async def api_handover_review_action(
    draft_id: str,
    body: HandoverReviewActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await handover_review_action(
        draft_id=draft_id, body=body, current_user=current_user, conn=conn
    )


@compat_router.get("/drafts/{draft_id}/formal-target")
async def api_handover_formal_target(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await handover_formal_target(
        draft_id=draft_id, current_user=current_user, conn=conn
    )
