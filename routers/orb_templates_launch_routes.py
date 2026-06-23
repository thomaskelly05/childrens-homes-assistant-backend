from __future__ import annotations

"""Canonical ORB template library routes at /templates/* (Residential product)."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
from services.orb_template_generation_service import orb_template_generation_service
from services.orb_template_library_registry import orb_template_library_registry
from services.orb_template_taxonomy_service import orb_template_taxonomy_service
from services.orb_regulation_practice_anchor_service import orb_regulation_practice_anchor_service

router = APIRouter(prefix="/templates", tags=["ORB Templates"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


class TemplateGenerateBody(BaseModel):
    template_id: str = Field(..., min_length=1, max_length=120)
    title: str | None = None


class TemplateExportBody(BaseModel):
    template_id: str = Field(..., min_length=1, max_length=120)
    filled_sections: dict[str, str] | None = None
    title: str | None = None


@router.get("/categories")
async def template_categories(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_template_library_registry.categories())


@router.get("")
async def list_templates(
    category: str | None = None,
    search: str | None = None,
    current_user=Depends(require_standalone_orb_access),
):
    return _success(
        {
            "templates": orb_template_library_registry.list_templates(category=category, search=search),
            "categories": orb_template_library_registry.categories(),
        }
    )


@router.post("/generate")
async def generate_template(body: TemplateGenerateBody, current_user=Depends(require_standalone_orb_access)):
    try:
        return _success(orb_template_generation_service.generate(body.template_id, title=body.title))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/export/pdf")
async def export_pdf(body: TemplateExportBody, current_user=Depends(require_standalone_orb_access)):
    try:
        return _success(
            orb_template_generation_service.export(
                body.template_id,
                profile="pdf",
                filled_sections=body.filled_sections,
                title=body.title,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/export/docx")
async def export_docx(body: TemplateExportBody, current_user=Depends(require_standalone_orb_access)):
    try:
        return _success(
            orb_template_generation_service.export(
                body.template_id,
                profile="docx",
                filled_sections=body.filled_sections,
                title=body.title,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/taxonomy/lifecycle-groups")
async def taxonomy_lifecycle_groups(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_template_taxonomy_service.lifecycle_groups())


@router.get("/taxonomy/coverage")
async def taxonomy_coverage(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_template_taxonomy_service.coverage_report())


@router.get("/taxonomy/station-wiring")
async def taxonomy_station_wiring(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_template_taxonomy_service.station_wiring_plan())


@router.get("/taxonomy/regulation-anchors")
async def taxonomy_regulation_anchors(current_user=Depends(require_standalone_orb_access)):
    return _success(
        {
            "anchors": orb_regulation_practice_anchor_service.list_anchors(),
            "disclaimer": orb_regulation_practice_anchor_service.disclaimer(),
        }
    )


@router.get("/taxonomy")
async def list_taxonomy(
    lifecycle_group: str | None = None,
    station: str | None = None,
    regulation_anchor: str | None = None,
    search: str | None = None,
    include_enriched: bool = False,
    current_user=Depends(require_standalone_orb_access),
):
    return _success(
        {
            "templates": orb_template_taxonomy_service.list_taxonomy(
                lifecycle_group=lifecycle_group,
                station=station,
                regulation_anchor=regulation_anchor,
                search=search,
                include_enriched=include_enriched,
            ),
            "lifecycle_groups": orb_template_taxonomy_service.lifecycle_groups(),
        }
    )


@router.get("/taxonomy/{template_id}")
async def get_taxonomy_entry(
    template_id: str,
    current_user=Depends(require_standalone_orb_access),
):
    entry = orb_template_taxonomy_service.get_taxonomy_entry(template_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Template taxonomy entry not found")
    return _success(entry)


@router.get("/{template_id}")
async def get_template(template_id: str, current_user=Depends(require_standalone_orb_access)):
    template = orb_template_library_registry.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return _success(template)


@router.post("/{template_id}/generate")
async def generate_template_by_id(
    template_id: str,
    title: str | None = None,
    current_user=Depends(require_standalone_orb_access),
):
    try:
        return _success(orb_template_generation_service.generate(template_id, title=title))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


class TemplateExportByIdBody(TemplateExportBody):
    profile: str = Field(default="pdf")


@router.post("/{template_id}/export")
async def export_template_by_id(
    template_id: str,
    body: TemplateExportByIdBody,
    current_user=Depends(require_standalone_orb_access),
):
    profile = body.profile.lower()
    if profile not in {"pdf", "docx", "markdown", "html"}:
        raise HTTPException(status_code=400, detail="profile must be pdf, docx, markdown or html")
    try:
        return _success(
            orb_template_generation_service.export(
                template_id,
                profile=profile,
                filled_sections=body.filled_sections,
                title=body.title,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
