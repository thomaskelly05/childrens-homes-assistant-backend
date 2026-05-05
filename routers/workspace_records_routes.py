from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from services.workspace_records_service import WorkspaceRecordsService

router = APIRouter(prefix="/workspace-records", tags=["workspace-records"])

service = WorkspaceRecordsService()


@router.get("/{record_type}")
def list_records(
    record_type: str,
    young_person_id: Optional[int] = None,
    limit: int = 20,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.list_records(record_type=record_type, current_user=current_user, young_person_id=young_person_id, limit=limit)


@router.post("/{record_type}")
def create_record(
    record_type: str,
    payload: dict[str, Any],
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.create_record(record_type=record_type, payload=payload, current_user=current_user)
