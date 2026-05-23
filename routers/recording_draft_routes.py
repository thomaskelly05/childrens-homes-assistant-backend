"""Operational /record recording drafts — authenticated OS routes only."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.recording_drafts import (
    RecordingDraftCreate,
    RecordingDraftListRequest,
    RecordingDraftSubmitRequest,
    RecordingDraftUpdate,
)
from schemas.recording_submission import RecordingSubmissionRequest
from services.recording_draft_service import recording_draft_service
from services.recording_submission_router_service import recording_submission_router_service
from services.recording_submission_target_registry import recording_submission_target_registry

router = APIRouter(prefix="/recording-drafts", tags=["Recording Drafts"])
compat_router = APIRouter(prefix="/api/recording-drafts", tags=["Recording Drafts API"])


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


@router.get("/submission-targets")
async def list_submission_targets(current_user: dict[str, Any] = Depends(get_current_user)):
    _ = current_user
    return _success([t.model_dump() for t in recording_submission_target_registry.list_targets()])


@compat_router.get("/submission-targets")
async def api_list_submission_targets(current_user: dict[str, Any] = Depends(get_current_user)):
    return await list_submission_targets(current_user=current_user)


@router.get("/{draft_id}/submission-target")
async def get_draft_submission_target(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    record = recording_draft_service.get_draft(draft_id, _user_dict(current_user), conn=conn)
    if not record:
        raise HTTPException(status_code=404, detail="Recording draft not found or access denied.")
    target = recording_submission_target_registry.get_target(record.recording_type, form_id=record.form_id)
    return _success(
        {
            "target": target.model_dump(),
            "route_hint": recording_submission_target_registry.route_hint(record.recording_type, record),
            "frontend_route": recording_submission_target_registry.frontend_route_for(
                record.recording_type, record
            ),
        }
    )


@compat_router.get("/{draft_id}/submission-target")
async def api_get_draft_submission_target(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await get_draft_submission_target(draft_id=draft_id, current_user=current_user, conn=conn)


@router.get("/health")
async def recording_drafts_health(current_user: dict[str, Any] = Depends(get_current_user)):
    _ = current_user
    return _success(recording_draft_service.health().model_dump())


@compat_router.get("/health")
async def api_recording_drafts_health(current_user: dict[str, Any] = Depends(get_current_user)):
    return await recording_drafts_health(current_user=current_user)


@router.get("")
async def list_recording_drafts(
    status: str | None = None,
    review_status: str | None = None,
    recording_type: str | None = None,
    child_id: int | None = None,
    home_id: int | None = None,
    include_archived: bool = False,
    include_deleted: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    request = RecordingDraftListRequest(
        status=status,  # type: ignore[arg-type]
        review_status=review_status,  # type: ignore[arg-type]
        recording_type=recording_type,
        child_id=child_id,
        home_id=home_id,
        include_archived=include_archived,
        include_deleted=include_deleted,
        limit=limit,
        offset=offset,
    )
    result = recording_draft_service.list_drafts(_user_dict(current_user), request, conn=conn)
    return _success(result.model_dump())


@compat_router.get("")
async def api_list_recording_drafts(
    status: str | None = None,
    review_status: str | None = None,
    recording_type: str | None = None,
    child_id: int | None = None,
    home_id: int | None = None,
    include_archived: bool = False,
    include_deleted: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await list_recording_drafts(
        status=status,
        review_status=review_status,
        recording_type=recording_type,
        child_id=child_id,
        home_id=home_id,
        include_archived=include_archived,
        include_deleted=include_deleted,
        limit=limit,
        offset=offset,
        current_user=current_user,
        conn=conn,
    )


@router.post("")
async def create_recording_draft(
    payload: RecordingDraftCreate,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    record = recording_draft_service.create_draft(payload, _user_dict(current_user), conn=conn)
    return _success(record.model_dump())


@compat_router.post("")
async def api_create_recording_draft(
    payload: RecordingDraftCreate,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await create_recording_draft(payload=payload, current_user=current_user, conn=conn)


@router.get("/{draft_id}")
async def get_recording_draft(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    record = recording_draft_service.get_draft(draft_id, _user_dict(current_user), conn=conn)
    if not record:
        raise HTTPException(status_code=404, detail="Recording draft not found or access denied.")
    return _success(record.model_dump())


@compat_router.get("/{draft_id}")
async def api_get_recording_draft(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await get_recording_draft(draft_id=draft_id, current_user=current_user, conn=conn)


@router.patch("/{draft_id}")
async def update_recording_draft(
    draft_id: str,
    payload: RecordingDraftUpdate,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    record = recording_draft_service.update_draft(draft_id, payload, _user_dict(current_user), conn=conn)
    if not record:
        raise HTTPException(status_code=404, detail="Recording draft not found or access denied.")
    return _success(record.model_dump())


@compat_router.patch("/{draft_id}")
async def api_update_recording_draft(
    draft_id: str,
    payload: RecordingDraftUpdate,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await update_recording_draft(
        draft_id=draft_id, payload=payload, current_user=current_user, conn=conn
    )


@router.post("/{draft_id}/autosave")
async def autosave_recording_draft(
    draft_id: str,
    payload: RecordingDraftUpdate,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    record = recording_draft_service.autosave_draft(draft_id, payload, _user_dict(current_user), conn=conn)
    if not record:
        raise HTTPException(status_code=404, detail="Recording draft not found or access denied.")
    return _success(record.model_dump())


@compat_router.post("/{draft_id}/autosave")
async def api_autosave_recording_draft(
    draft_id: str,
    payload: RecordingDraftUpdate,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await autosave_recording_draft(
        draft_id=draft_id, payload=payload, current_user=current_user, conn=conn
    )


@router.post("/{draft_id}/ready-for-review")
async def ready_for_review_recording_draft(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    record = recording_draft_service.mark_ready_for_review(draft_id, _user_dict(current_user), conn=conn)
    if not record:
        raise HTTPException(status_code=404, detail="Recording draft not found or access denied.")
    return _success(record.model_dump())


@compat_router.post("/{draft_id}/ready-for-review")
async def api_ready_for_review_recording_draft(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await ready_for_review_recording_draft(
        draft_id=draft_id, current_user=current_user, conn=conn
    )


@router.post("/{draft_id}/submit")
async def submit_recording_draft(
    draft_id: str,
    payload: RecordingSubmissionRequest | RecordingDraftSubmitRequest | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    if isinstance(payload, RecordingSubmissionRequest):
        submission_payload = payload
    elif payload is not None:
        submission_payload = RecordingSubmissionRequest(
            draft_id=draft_id,
            submitted_to=payload.submitted_to,
            target_workflow=payload.target_workflow,
            metadata=payload.metadata,
            confirm_reviewed=bool((payload.metadata or {}).get("confirm_reviewed")),
            force_submit=bool((payload.metadata or {}).get("force_submit")),
            create_chronology_link=bool((payload.metadata or {}).get("create_chronology_link", True)),
        )
    else:
        submission_payload = RecordingSubmissionRequest(draft_id=draft_id)

    result = recording_submission_router_service.submit_draft(
        draft_id, submission_payload, user, conn=conn
    )
    if not result:
        raise HTTPException(status_code=404, detail="Recording draft not found or access denied.")
    return _success(result.model_dump())


@compat_router.post("/{draft_id}/submit")
async def api_submit_recording_draft(
    draft_id: str,
    payload: RecordingDraftSubmitRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await submit_recording_draft(
        draft_id=draft_id, payload=payload, current_user=current_user, conn=conn
    )


@router.post("/{draft_id}/archive")
async def archive_recording_draft(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    record = recording_draft_service.archive_draft(draft_id, _user_dict(current_user), conn=conn)
    if not record:
        raise HTTPException(status_code=404, detail="Recording draft not found or access denied.")
    return _success(record.model_dump())


@compat_router.post("/{draft_id}/archive")
async def api_archive_recording_draft(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await archive_recording_draft(draft_id=draft_id, current_user=current_user, conn=conn)


@router.delete("/{draft_id}")
async def delete_recording_draft(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    record = recording_draft_service.delete_draft(draft_id, _user_dict(current_user), conn=conn)
    if not record:
        raise HTTPException(status_code=404, detail="Recording draft not found or access denied.")
    return _success(record.model_dump())


@compat_router.delete("/{draft_id}")
async def api_delete_recording_draft(
    draft_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await delete_recording_draft(draft_id=draft_id, current_user=current_user, conn=conn)
