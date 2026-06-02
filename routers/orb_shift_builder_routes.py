"""Standalone ORB Shift Builder API — user-supplied notes only."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
from schemas.orb_shift_builder import (
    OrbShiftBuilderGenerateRequest,
    OrbShiftBuilderRequest,
)
from services.orb_shift_builder_service import orb_shift_builder_service

router = APIRouter(prefix="/orb/standalone/shift-builder", tags=["ORB Shift Builder"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def _reject_os_ids(payload: dict[str, Any]) -> None:
    forbidden_keys = (
        "child_id",
        "young_person_id",
        "staff_id",
        "home_id",
        "record_id",
        "chronology_id",
    )
    scopes = [payload, payload.get("metadata") or {}, payload.get("context") or {}]
    for scope in scopes:
        if not isinstance(scope, dict):
            continue
        for key in forbidden_keys:
            if scope.get(key) is not None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Standalone Shift Builder must not include {key}.",
                )


@router.get("/health")
async def shift_builder_health(current_user=Depends(require_standalone_orb_access)):
    return _success(
        {
            "ok": True,
            "feature": "shift_builder",
            "focus_modes": orb_shift_builder_service.list_focus_modes(),
            "context_tags": orb_shift_builder_service.list_context_tags(),
            "standalone": True,
            "live_record_access": False,
        }
    )


@router.get("/focus-modes")
async def shift_builder_focus_modes(current_user=Depends(require_standalone_orb_access)):
    return _success({"focus_modes": orb_shift_builder_service.list_focus_modes()})


@router.get("/context-tags")
async def shift_builder_context_tags(current_user=Depends(require_standalone_orb_access)):
    return _success({"context_tags": orb_shift_builder_service.list_context_tags()})


@router.post("/generate")
async def shift_builder_generate(
    payload: OrbShiftBuilderGenerateRequest,
    current_user=Depends(require_standalone_orb_access),
):
    _reject_os_ids(payload.model_dump())
    try:
        result = await orb_shift_builder_service.generate(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _success(result.model_dump())


@router.post("/prompt-pack")
async def shift_builder_prompt_pack(
    payload: OrbShiftBuilderRequest,
    current_user=Depends(require_standalone_orb_access),
):
    """Legacy prompt-pack workflow (section prompts, no LLM generation)."""
    _reject_os_ids(payload.model_dump())
    result = orb_shift_builder_service.build(payload)
    data = result.model_dump()
    data["standalone"] = True
    data["live_record_access"] = False
    data["os_linked"] = False
    return _success(data)
