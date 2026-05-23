"""Operational ORB outputs API — OS-linked artefacts; not standalone /orb."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.permissions import require_assistant_access
from db.connection import get_db
from schemas.orb_operational_outputs import (
    OrbOperationalOutputActionLinkRequest,
    OrbOperationalOutputCreate,
    OrbOperationalOutputExportRequest,
    OrbOperationalOutputListRequest,
    OrbOperationalOutputReviewRequest,
    OrbOperationalOutputUpdate,
)
from services.orb_operational_output_service import orb_operational_output_service

router = APIRouter(prefix="/assistant/orb/outputs", tags=["Operational ORB Outputs"])
compat_router = APIRouter(prefix="/api/assistant/orb/outputs", tags=["Operational ORB Outputs API"])


def _success(data: Any) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "os_linked": True,
        "standalone_only": False,
        "permissioned_context": True,
    }


def _current_user_dict(current_user) -> dict[str, Any]:
    if isinstance(current_user, dict):
        return current_user
    return dict(current_user)


@router.get("/health")
async def outputs_health(current_user=Depends(require_assistant_access)):
    _ = current_user
    return _success(orb_operational_output_service.health().model_dump())


@compat_router.get("/health")
async def api_outputs_health(current_user=Depends(require_assistant_access)):
    return await outputs_health(current_user=current_user)


@router.get("/summary")
async def outputs_summary(
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    _ = conn
    return _success(
        orb_operational_output_service.get_summary(_current_user_dict(current_user))
    )


@compat_router.get("/summary")
async def api_outputs_summary(
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await outputs_summary(conn=conn, current_user=current_user)


@router.get("")
async def list_outputs(
    output_type: str | None = None,
    status: str | None = None,
    review_status: str | None = None,
    visibility: str | None = None,
    home_id: int | None = None,
    child_id: int | None = None,
    staff_id: int | None = None,
    tag: str | None = None,
    search: str | None = None,
    include_archived: bool = False,
    awaiting_review_only: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    request = OrbOperationalOutputListRequest(
        output_type=output_type,  # type: ignore[arg-type]
        status=status,  # type: ignore[arg-type]
        review_status=review_status,  # type: ignore[arg-type]
        visibility=visibility,  # type: ignore[arg-type]
        home_id=home_id,
        child_id=child_id,
        staff_id=staff_id,
        tag=tag,
        search=search,
        include_archived=include_archived,
        awaiting_review_only=awaiting_review_only,
        limit=limit,
        offset=offset,
    )
    result = orb_operational_output_service.list_outputs(
        _current_user_dict(current_user), request, conn=conn
    )
    return _success(result.model_dump())


@compat_router.get("")
async def api_list_outputs(
    output_type: str | None = None,
    status: str | None = None,
    review_status: str | None = None,
    visibility: str | None = None,
    home_id: int | None = None,
    child_id: int | None = None,
    staff_id: int | None = None,
    tag: str | None = None,
    search: str | None = None,
    include_archived: bool = False,
    awaiting_review_only: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await list_outputs(
        output_type=output_type,
        status=status,
        review_status=review_status,
        visibility=visibility,
        home_id=home_id,
        child_id=child_id,
        staff_id=staff_id,
        tag=tag,
        search=search,
        include_archived=include_archived,
        awaiting_review_only=awaiting_review_only,
        limit=limit,
        offset=offset,
        conn=conn,
        current_user=current_user,
    )


@router.post("")
async def create_output(
    payload: OrbOperationalOutputCreate,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    record = orb_operational_output_service.create_output(
        payload, _current_user_dict(current_user), conn=conn
    )
    return _success(record.model_dump())


@compat_router.post("")
async def api_create_output(
    payload: OrbOperationalOutputCreate,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await create_output(payload=payload, conn=conn, current_user=current_user)


@router.get("/{output_id}")
async def get_output(
    output_id: str,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    record = orb_operational_output_service.get_output(
        output_id, _current_user_dict(current_user), conn=conn
    )
    if not record:
        raise HTTPException(status_code=404, detail="Operational output not found.")
    return _success(record.model_dump())


@compat_router.get("/{output_id}")
async def api_get_output(
    output_id: str,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await get_output(output_id=output_id, conn=conn, current_user=current_user)


@router.patch("/{output_id}")
async def update_output(
    output_id: str,
    payload: OrbOperationalOutputUpdate,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    record = orb_operational_output_service.update_output(
        output_id, payload, _current_user_dict(current_user), conn=conn
    )
    if not record:
        raise HTTPException(status_code=404, detail="Operational output not found.")
    return _success(record.model_dump())


@compat_router.patch("/{output_id}")
async def api_update_output(
    output_id: str,
    payload: OrbOperationalOutputUpdate,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await update_output(
        output_id=output_id, payload=payload, conn=conn, current_user=current_user
    )


@router.delete("/{output_id}")
async def delete_output(
    output_id: str,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    deleted = orb_operational_output_service.delete_output(
        output_id, _current_user_dict(current_user), conn=conn
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Operational output not found.")
    return _success({"deleted": True, "output_id": output_id})


@compat_router.delete("/{output_id}")
async def api_delete_output(
    output_id: str,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await delete_output(output_id=output_id, conn=conn, current_user=current_user)


@router.post("/{output_id}/archive")
async def archive_output(
    output_id: str,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    record = orb_operational_output_service.archive_output(
        output_id, _current_user_dict(current_user), conn=conn
    )
    if not record:
        raise HTTPException(status_code=404, detail="Operational output not found.")
    return _success(record.model_dump())


@compat_router.post("/{output_id}/archive")
async def api_archive_output(
    output_id: str,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await archive_output(output_id=output_id, conn=conn, current_user=current_user)


@router.post("/{output_id}/export")
async def export_output(
    output_id: str,
    payload: OrbOperationalOutputExportRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    exported = orb_operational_output_service.export_output(
        output_id, payload.format, _current_user_dict(current_user), conn=conn
    )
    if not exported:
        raise HTTPException(status_code=404, detail="Operational output not found.")
    return _success(exported)


@compat_router.post("/{output_id}/export")
async def api_export_output(
    output_id: str,
    payload: OrbOperationalOutputExportRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await export_output(
        output_id=output_id, payload=payload, conn=conn, current_user=current_user
    )


@router.post("/{output_id}/review")
async def mark_for_review(
    output_id: str,
    payload: OrbOperationalOutputReviewRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    record, warning = orb_operational_output_service.mark_for_review(
        output_id, payload, _current_user_dict(current_user), conn=conn
    )
    if not record:
        raise HTTPException(status_code=404, detail="Operational output not found.")
    data = record.model_dump()
    if warning:
        data["warning"] = warning
    return _success(data)


@compat_router.post("/{output_id}/review")
async def api_mark_for_review(
    output_id: str,
    payload: OrbOperationalOutputReviewRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await mark_for_review(
        output_id=output_id, payload=payload, conn=conn, current_user=current_user
    )


@router.post("/{output_id}/reviewed")
async def mark_reviewed(
    output_id: str,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    record = orb_operational_output_service.mark_reviewed(
        output_id, _current_user_dict(current_user), conn=conn
    )
    if not record:
        raise HTTPException(status_code=404, detail="Operational output not found or not permitted.")
    return _success(record.model_dump())


@compat_router.post("/{output_id}/reviewed")
async def api_mark_reviewed(
    output_id: str,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await mark_reviewed(output_id=output_id, conn=conn, current_user=current_user)


@router.post("/{output_id}/link-actions")
async def link_actions(
    output_id: str,
    payload: OrbOperationalOutputActionLinkRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    record = orb_operational_output_service.link_actions(
        output_id, payload.action_ids, _current_user_dict(current_user), conn=conn
    )
    if not record:
        raise HTTPException(status_code=404, detail="Operational output not found.")
    return _success(record.model_dump())


@compat_router.post("/{output_id}/link-actions")
async def api_link_actions(
    output_id: str,
    payload: OrbOperationalOutputActionLinkRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await link_actions(
        output_id=output_id, payload=payload, conn=conn, current_user=current_user
    )
