"""Structured high-risk recording templates — operational /record only."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import get_current_user
from schemas.recording_structured_forms import (
    RecordingStructuredSummaryRequest,
    RecordingStructuredTemplateListResponse,
    RecordingStructuredTemplateResponse,
    RecordingStructuredValidateRequest,
)
from services.recording_structured_template_registry import recording_structured_template_registry

router = APIRouter(prefix="/recording-templates", tags=["Recording Structured Templates"])
compat_router = APIRouter(prefix="/api/recording-templates", tags=["Recording Structured Templates API"])


def _success(data: Any) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "operational_only": True,
        "standalone_access": False,
    }


@router.get("/health")
async def recording_templates_health(current_user: dict[str, Any] = Depends(get_current_user)):
    _ = current_user
    templates = recording_structured_template_registry.list_templates()
    return _success(
        {
            "status": "ready",
            "service": "recording_structured_template_registry",
            "template_count": len(templates),
            "operational_only": True,
            "standalone_access": False,
        }
    )


@compat_router.get("/health")
async def api_recording_templates_health(current_user: dict[str, Any] = Depends(get_current_user)):
    return await recording_templates_health(current_user=current_user)


@router.get("")
async def list_recording_templates(current_user: dict[str, Any] = Depends(get_current_user)):
    _ = current_user
    items = recording_structured_template_registry.list_templates()
    payload = RecordingStructuredTemplateListResponse(items=items, total=len(items))
    return _success(payload.model_dump())


@compat_router.get("")
async def api_list_recording_templates(current_user: dict[str, Any] = Depends(get_current_user)):
    return await list_recording_templates(current_user=current_user)


@router.get("/{form_id}")
async def get_recording_template(form_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    _ = current_user
    template = recording_structured_template_registry.get_template(form_id=form_id)
    if not template:
        raise HTTPException(status_code=404, detail="Structured recording template not found.")
    return _success(RecordingStructuredTemplateResponse(template=template).model_dump())


@compat_router.get("/{form_id}")
async def api_get_recording_template(form_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    return await get_recording_template(form_id=form_id, current_user=current_user)


@router.post("/{form_id}/validate")
async def validate_recording_template(
    form_id: str,
    payload: RecordingStructuredValidateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    _ = current_user
    template = recording_structured_template_registry.get_template(form_id=form_id)
    if not template:
        raise HTTPException(status_code=404, detail="Structured recording template not found.")
    result = recording_structured_template_registry.validate_template_data(template, payload.values)
    return _success(result.model_dump())


@compat_router.post("/{form_id}/validate")
async def api_validate_recording_template(
    form_id: str,
    payload: RecordingStructuredValidateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return await validate_recording_template(form_id=form_id, payload=payload, current_user=current_user)


@router.post("/{form_id}/summary")
async def summarise_recording_template(
    form_id: str,
    payload: RecordingStructuredSummaryRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    _ = current_user
    template = recording_structured_template_registry.get_template(form_id=form_id)
    if not template:
        raise HTTPException(status_code=404, detail="Structured recording template not found.")
    form_data = recording_structured_template_registry.build_form_data(template, payload.values)
    return _success(form_data.model_dump())


@compat_router.post("/{form_id}/summary")
async def api_summarise_recording_template(
    form_id: str,
    payload: RecordingStructuredSummaryRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return await summarise_recording_template(form_id=form_id, payload=payload, current_user=current_user)
