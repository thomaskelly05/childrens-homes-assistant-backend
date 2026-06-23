from __future__ import annotations

"""Canonical ORB Records Workspace API at /orb/records-workspace/*."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
from schemas.orb_records_workspace import (
    OrbRecordWorkspaceCreate,
    OrbRecordWorkspaceListRequest,
    OrbRecordWorkspaceUpdate,
)
from services.orb_records_workspace_service import orb_records_workspace_service

router = APIRouter(prefix="/orb/records-workspace", tags=["ORB Records Workspace"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def _user_id(current_user: dict) -> int:
    uid = current_user.get("user_id") or current_user.get("id")
    if uid is None:
        raise HTTPException(status_code=401, detail="Sign in required")
    return int(uid)


def _role(current_user: dict) -> str | None:
    return current_user.get("role")


@router.get("/health")
async def workspace_health(current_user=Depends(require_standalone_orb_access)):
    _ = current_user
    return _success(orb_records_workspace_service.health())


@router.get("/summary")
async def workspace_summary(current_user=Depends(require_standalone_orb_access)):
    return _success(
        orb_records_workspace_service.summary(_user_id(current_user), role=_role(current_user))
    )


@router.get("/items")
async def list_workspace_items(
    section: str | None = None,
    status: str | None = None,
    template_id: str | None = None,
    source_station: str | None = None,
    search: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(require_standalone_orb_access),
):
    request = OrbRecordWorkspaceListRequest(
        section=section,  # type: ignore[arg-type]
        status=status,  # type: ignore[arg-type]
        template_id=template_id,
        source_station=source_station,  # type: ignore[arg-type]
        search=search,
        limit=limit,
        offset=offset,
    )
    return _success(
        orb_records_workspace_service.list_items(
            _user_id(current_user),
            request,
            role=_role(current_user),
        )
    )


@router.post("/items")
async def create_workspace_item(
    body: OrbRecordWorkspaceCreate,
    current_user=Depends(require_standalone_orb_access),
):
    item = orb_records_workspace_service.create_item(
        _user_id(current_user),
        body,
        role=_role(current_user),
    )
    return _success(item)


@router.get("/items/{item_id}")
async def get_workspace_item(
    item_id: str,
    current_user=Depends(require_standalone_orb_access),
):
    item = orb_records_workspace_service.get_item(_user_id(current_user), item_id, role=_role(current_user))
    if not item:
        raise HTTPException(status_code=404, detail="Workspace item not found")
    return _success(item)


@router.patch("/items/{item_id}")
async def update_workspace_item(
    item_id: str,
    body: OrbRecordWorkspaceUpdate,
    current_user=Depends(require_standalone_orb_access),
):
    try:
        item = orb_records_workspace_service.update_item(_user_id(current_user), item_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="Workspace item not found")
    return _success(item)


@router.delete("/items/{item_id}")
async def delete_workspace_item(
    item_id: str,
    current_user=Depends(require_standalone_orb_access),
):
    archived = orb_records_workspace_service.archive_item(_user_id(current_user), item_id)
    if not archived:
        raise HTTPException(status_code=404, detail="Workspace item not found")
    return _success({"archived": True, "item": archived})


@router.post("/items/{item_id}/review")
async def review_workspace_item(
    item_id: str,
    current_user=Depends(require_standalone_orb_access),
):
    item = orb_records_workspace_service.review_item(_user_id(current_user), item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Workspace item not found")
    return _success(item)


@router.post("/items/{item_id}/finalise")
async def finalise_workspace_item(
    item_id: str,
    current_user=Depends(require_standalone_orb_access),
):
    try:
        item = orb_records_workspace_service.finalise_item(_user_id(current_user), item_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="Workspace item not found")
    return _success(item)
