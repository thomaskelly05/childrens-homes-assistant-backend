from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from services.workspace_records_service import WorkspaceRecordsService

router = APIRouter(prefix="/workspace-records", tags=["workspace-records"])

service = WorkspaceRecordsService()


@router.get("/review/queue")
def review_queue(
    limit: int = 50,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.review_queue(current_user=current_user, limit=limit)


@router.get("/{record_type}")
def list_records(
    record_type: str,
    young_person_id: Optional[int] = None,
    include_archived: bool = False,
    limit: int = 20,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.list_records(
        record_type=record_type,
        current_user=current_user,
        young_person_id=young_person_id,
        include_archived=include_archived,
        limit=limit,
    )


@router.post("/{record_type}")
def create_record(
    record_type: str,
    payload: dict[str, Any],
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.create_record(record_type=record_type, payload=payload, current_user=current_user)


@router.get("/{record_type}/{record_id}")
def get_record(
    record_type: str,
    record_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.get_record(record_type=record_type, record_id=record_id, current_user=current_user)


@router.patch("/{record_type}/{record_id}")
def update_record(
    record_type: str,
    record_id: int,
    payload: dict[str, Any],
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.update_record(record_type=record_type, record_id=record_id, payload=payload, current_user=current_user)


@router.post("/{record_type}/{record_id}/ai-improve")
def ai_improve_record(
    record_type: str,
    record_id: int,
    payload: dict[str, Any] | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.ai_improve_record(record_type=record_type, record_id=record_id, payload=payload or {}, current_user=current_user)


@router.post("/{record_type}/{record_id}/submit")
def submit_record(
    record_type: str,
    record_id: int,
    payload: dict[str, Any] | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.set_record_status(record_type=record_type, record_id=record_id, status="submitted_for_review", comment=(payload or {}).get("comment"), current_user=current_user)


@router.post("/{record_type}/{record_id}/review")
def review_record(
    record_type: str,
    record_id: int,
    payload: dict[str, Any],
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.review_record(
        record_type=record_type,
        record_id=record_id,
        action=payload.get("action") or payload.get("status") or "approve",
        comment=payload.get("comment") or payload.get("manager_comment"),
        current_user=current_user,
    )


@router.post("/{record_type}/{record_id}/archive")
def archive_record(
    record_type: str,
    record_id: int,
    payload: dict[str, Any] | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.set_record_status(record_type=record_type, record_id=record_id, status="archived", comment=(payload or {}).get("comment"), current_user=current_user)


@router.get("/{record_type}/{record_id}/versions")
def record_versions(
    record_type: str,
    record_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.record_versions(record_type=record_type, record_id=record_id, current_user=current_user)
