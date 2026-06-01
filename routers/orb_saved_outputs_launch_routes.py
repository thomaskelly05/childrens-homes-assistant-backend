from __future__ import annotations

"""Canonical saved outputs API at /saved-outputs/* for ORB Residential."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
from schemas.orb_saved_outputs import OrbSavedOutputCreate, OrbSavedOutputListRequest
from services.orb_saved_output_service import orb_saved_output_service

router = APIRouter(prefix="/saved-outputs", tags=["ORB Saved Outputs"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def _user_id(current_user: dict) -> int:
    uid = current_user.get("user_id") or current_user.get("id")
    if uid is None:
        raise HTTPException(status_code=401, detail="Sign in required")
    return int(uid)


def _reject_os_ids(payload: dict[str, Any]) -> None:
    forbidden_keys = ("child_id", "young_person_id", "staff_id", "home_id", "record_id", "chronology_id")
    for scope in (payload, payload.get("metadata") or {}):
        if not isinstance(scope, dict):
            continue
        for key in forbidden_keys:
            if scope.get(key) is not None:
                raise HTTPException(
                    status_code=400,
                    detail=f"ORB saved outputs must not include {key}.",
                )


@router.get("")
async def list_saved_outputs(
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
    return _success(orb_saved_output_service.list_outputs(_user_id(current_user), request))


@router.post("")
async def create_saved_output(
    body: OrbSavedOutputCreate,
    current_user=Depends(require_standalone_orb_access),
):
    _reject_os_ids(body.model_dump())
    return _success(orb_saved_output_service.create_output(_user_id(current_user), body))


@router.delete("/{output_id}")
async def delete_saved_output(
    output_id: str,
    current_user=Depends(require_standalone_orb_access),
):
    deleted = orb_saved_output_service.delete_output(_user_id(current_user), output_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Saved output not found")
    return _success({"deleted": True, "id": output_id})
