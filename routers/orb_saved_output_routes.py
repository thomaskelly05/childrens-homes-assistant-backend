"""Standalone ORB saved outputs API — project artefacts only; no OS records."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.orb_product_bootstrap_dependency import require_orb_product_bootstrap_access
from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
from schemas.orb_saved_outputs import (
    OrbSavedOutputCreate,
    OrbSavedOutputExportRequest,
    OrbSavedOutputListRequest,
    OrbSavedOutputReuseRequest,
    OrbSavedOutputUpdate,
)
from services.orb_saved_output_service import (
    MIGRATION_207_PATH,
    SavedOutputSchemaMigrationRequired,
    orb_saved_output_service,
)

router = APIRouter(prefix="/orb/standalone/outputs", tags=["ORB Standalone Saved Outputs"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def _user_id(current_user: dict[str, Any]) -> int:
    uid = current_user.get("user_id") or current_user.get("id")
    if uid is None:
        raise HTTPException(status_code=401, detail="Sign in to use ORB saved outputs")
    return int(uid)


def _reject_os_ids(payload: dict[str, Any]) -> None:
    forbidden_keys = (
        "child_id",
        "young_person_id",
        "staff_id",
        "home_id",
        "record_id",
        "chronology_id",
    )
    scopes = [payload, payload.get("metadata") or {}]
    for scope in scopes:
        if not isinstance(scope, dict):
            continue
        for key in forbidden_keys:
            if scope.get(key) is not None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Standalone ORB saved outputs must not include {key}.",
                )


@router.get("/health")
async def outputs_health(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_saved_output_service.health().model_dump())


@router.get("/summary")
async def outputs_summary(current_user=Depends(require_orb_product_bootstrap_access)):
    return _success(orb_saved_output_service.get_summary(_user_id(current_user)))


@router.get("")
async def list_outputs(
    project_id: str | None = None,
    output_type: str | None = None,
    status: str | None = None,
    tag: str | None = None,
    search: str | None = None,
    include_archived: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(require_standalone_orb_access),
):
    request = OrbSavedOutputListRequest(
        project_id=project_id,
        output_type=output_type,  # type: ignore[arg-type]
        status=status,  # type: ignore[arg-type]
        tag=tag,
        search=search,
        include_archived=include_archived,
        limit=limit,
        offset=offset,
    )
    result = orb_saved_output_service.list_outputs(_user_id(current_user), request)
    return _success(result.model_dump())


@router.post("")
async def create_output(
    payload: OrbSavedOutputCreate,
    current_user=Depends(require_standalone_orb_access),
):
    _reject_os_ids(payload.model_dump())
    try:
        output = orb_saved_output_service.create_output(_user_id(current_user), payload)
    except SavedOutputSchemaMigrationRequired as exc:
        state = orb_saved_output_service.schema_state_for_clients()
        raise HTTPException(
            status_code=503,
            detail={
                "error": "saved_outputs_schema_migration_required",
                "message": exc.message,
                "migration": MIGRATION_207_PATH,
                "missing_columns": state.get("missing_columns") or [],
            },
        ) from exc
    return _success(output.model_dump())


@router.get("/{output_id}")
async def get_output(output_id: str, current_user=Depends(require_standalone_orb_access)):
    output = orb_saved_output_service.get_output(_user_id(current_user), output_id)
    if not output:
        raise HTTPException(status_code=404, detail="Saved output not found")
    return _success(output.model_dump())


@router.patch("/{output_id}")
async def update_output(
    output_id: str,
    payload: OrbSavedOutputUpdate,
    current_user=Depends(require_standalone_orb_access),
):
    _reject_os_ids(payload.model_dump())
    try:
        output = orb_saved_output_service.update_output(_user_id(current_user), output_id, payload)
    except SavedOutputSchemaMigrationRequired as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc
    if not output:
        raise HTTPException(status_code=404, detail="Saved output not found")
    return _success(output.model_dump())


@router.post("/{output_id}/archive")
async def archive_output(output_id: str, current_user=Depends(require_standalone_orb_access)):
    try:
        output = orb_saved_output_service.archive_output(_user_id(current_user), output_id)
    except SavedOutputSchemaMigrationRequired as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc
    if not output:
        raise HTTPException(status_code=404, detail="Saved output not found")
    return _success(output.model_dump())


@router.delete("/{output_id}")
async def delete_output(output_id: str, current_user=Depends(require_standalone_orb_access)):
    try:
        deleted = orb_saved_output_service.delete_output(_user_id(current_user), output_id)
    except SavedOutputSchemaMigrationRequired as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc
    return _success({"deleted": deleted, "output_id": output_id})


@router.post("/{output_id}/export")
async def export_output(
    output_id: str,
    payload: OrbSavedOutputExportRequest,
    current_user=Depends(require_standalone_orb_access),
):
    exported = orb_saved_output_service.export_output(
        _user_id(current_user), output_id, payload.format
    )
    if not exported:
        raise HTTPException(status_code=404, detail="Saved output not found")
    return _success(exported)


@router.post("/{output_id}/reuse")
async def reuse_output(
    output_id: str,
    payload: OrbSavedOutputReuseRequest,
    current_user=Depends(require_standalone_orb_access),
):
    reused = orb_saved_output_service.reuse_output(
        _user_id(current_user), output_id, payload.instruction
    )
    if not reused:
        raise HTTPException(status_code=404, detail="Saved output not found")
    return _success(reused.model_dump())
