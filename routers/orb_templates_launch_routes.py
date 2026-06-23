from __future__ import annotations

"""Canonical ORB template library routes at /templates/* (Residential product)."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
from schemas.orb_template_working_document import (
    OrbTemplateSectionOrbHelpRequest,
    OrbTemplateWorkingDocumentBuildRequest,
    OrbTemplateWorkingDocumentSaveRequest,
)
from services.orb_template_generation_service import orb_template_generation_service
from services.orb_template_library_registry import orb_template_library_registry
from services.orb_template_taxonomy_service import orb_template_taxonomy_service
from services.orb_regulation_practice_anchor_service import orb_regulation_practice_anchor_service
from services.orb_template_working_document_service import orb_template_working_document_service

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


@router.get("/taxonomy/search")
async def taxonomy_search(
    q: str = Query(..., min_length=1, max_length=200),
    lifecycle_group: str | None = None,
    station: str | None = None,
    regulation_anchor: str | None = None,
    current_user=Depends(require_standalone_orb_access),
):
    _ = current_user
    return _success(
        {
            "query": q,
            "templates": orb_template_taxonomy_service.search(
                q,
                lifecycle_group=lifecycle_group,
                station=station,
                regulation_anchor=regulation_anchor,
            ),
        }
    )


@router.get("/taxonomy/by-station/{station_id}")
async def taxonomy_by_station(
    station_id: str,
    current_user=Depends(require_standalone_orb_access),
):
    _ = current_user
    return _success(
        {
            "station": station_id,
            "templates": orb_template_taxonomy_service.templates_for_station(station_id),
        }
    )


@router.get("/taxonomy/by-category/{category}")
async def taxonomy_by_category(
    category: str,
    current_user=Depends(require_standalone_orb_access),
):
    _ = current_user
    return _success(
        {
            "category": category,
            "templates": orb_template_taxonomy_service.templates_for_category(category),
        }
    )


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


class WorkingDocumentBuildBody(BaseModel):
    title: str | None = None
    source_station: str = "write"
    context_text: str | None = None
    home_id: str | None = None
    child_id: str | None = None
    linked_home_document_ids: list[str] = Field(default_factory=list)


class WorkingDocumentFromContentBody(BaseModel):
    content: str = Field(..., min_length=1, max_length=500_000)
    source_station: str = "chat"


class WorkingDocumentChartBody(BaseModel):
    document_id: str
    table_id: str
    chart_type: str


class WorkingDocumentOrbHelpBody(BaseModel):
    document_id: str
    section_id: str
    instruction: str = Field(..., min_length=1, max_length=2000)
    current_body: str | None = None


@router.post("/working-document/build")
async def build_working_document(
    body: OrbTemplateWorkingDocumentBuildRequest,
    current_user=Depends(require_standalone_orb_access),
):
    try:
        context = body.model_dump(exclude={"template_id"})
        context["owner_user_id"] = str(getattr(current_user, "id", ""))
        context["user_context"] = {
            "user_id": getattr(current_user, "id", 0),
            "current_user": current_user if isinstance(current_user, dict) else {"id": getattr(current_user, "id", 0)},
        }
        doc = orb_template_working_document_service.build_working_document(
            body.template_id, context
        )
        return _success(doc.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/working-document/search")
async def search_working_document_templates(
    q: str = Query("", max_length=200),
    station: str | None = None,
    current_user=Depends(require_standalone_orb_access),
):
    _ = current_user
    templates = orb_template_taxonomy_service.search(q, station=station) if q else []
    if not templates and not q:
        templates = orb_template_taxonomy_service.templates_for_station(station or "write")
    return _success({"query": q, "station": station or "write", "templates": templates})


@router.get("/working-document/{template_id}/components")
async def suggest_working_document_components(
    template_id: str,
    current_user=Depends(require_standalone_orb_access),
):
    _ = current_user
    try:
        return _success(orb_template_working_document_service.suggest_document_components(template_id))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/working-document/{template_id}/open")
async def open_working_document(
    template_id: str,
    body: WorkingDocumentBuildBody,
    current_user=Depends(require_standalone_orb_access),
):
    try:
        context = body.model_dump()
        context["owner_user_id"] = str(getattr(current_user, "id", ""))
        context["user_context"] = {
            "user_id": getattr(current_user, "id", 0),
            "current_user": current_user if isinstance(current_user, dict) else {"id": getattr(current_user, "id", 0)},
        }
        doc = orb_template_working_document_service.build_working_document(template_id, context)
        return _success(doc.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/working-document/{template_id}/from-answer")
async def convert_answer_to_working_document(
    template_id: str,
    body: WorkingDocumentFromContentBody,
    current_user=Depends(require_standalone_orb_access),
):
    _ = current_user
    try:
        doc = orb_template_working_document_service.convert_answer_to_working_document(
            body.content, template_id, source_station=body.source_station
        )
        return _success(doc.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/working-document/{template_id}/from-dictation")
async def convert_dictation_to_working_document(
    template_id: str,
    body: WorkingDocumentFromContentBody,
    current_user=Depends(require_standalone_orb_access),
):
    _ = current_user
    try:
        doc = orb_template_working_document_service.convert_dictation_to_working_document(
            body.content, template_id, source_station=body.source_station or "dictate"
        )
        return _success(doc.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/working-document/section-orb-help")
async def working_document_section_orb_help(
    body: WorkingDocumentOrbHelpBody,
    current_user=Depends(require_standalone_orb_access),
):
    _ = current_user
    return _success(
        orb_template_working_document_service.update_section_with_orb_help(
            body.document_id,
            body.section_id,
            body.instruction,
            current_body=body.current_body,
        )
    )


@router.post("/working-document/generate-chart")
async def working_document_generate_chart(
    body: WorkingDocumentChartBody,
    current_user=Depends(require_standalone_orb_access),
):
    _ = current_user
    return _success(
        orb_template_working_document_service.generate_chart_from_table(
            body.document_id, body.table_id, body.chart_type
        )
    )


@router.post("/working-document/save")
async def save_working_document(
    body: OrbTemplateWorkingDocumentSaveRequest,
    current_user=Depends(require_standalone_orb_access),
):
    user_id = getattr(current_user, "id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    result = orb_template_working_document_service.save_working_document_to_records_workspace(
        body.document,
        user_id=int(user_id),
        workspace_section=body.workspace_section,
    )
    return _success(result)


@router.get("/working-document/{template_id}/home-documents")
async def list_template_home_documents(
    template_id: str,
    current_user=Depends(require_standalone_orb_access),
):
    user_context = {
        "user_id": getattr(current_user, "id", 0),
        "current_user": current_user if isinstance(current_user, dict) else {"id": getattr(current_user, "id", 0)},
    }
    return _success(
        orb_template_working_document_service.list_relevant_home_documents_for_template(
            template_id, user_context
        )
    )


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
