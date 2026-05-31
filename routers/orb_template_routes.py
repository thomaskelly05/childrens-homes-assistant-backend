"""ORB Residential template library and Review This API."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
from services.orb_learning_micro_service import orb_learning_micro_service
from services.orb_review_this_service import orb_review_this_service
from services.orb_template_generation_service import orb_template_generation_service
from services.orb_template_library_registry import orb_template_library_registry
from services.shared_institutional_cognition_runtime import shared_institutional_cognition_runtime

router = APIRouter(prefix="/orb/standalone", tags=["ORB Standalone Templates"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


class OrbTemplateDraftRequest(BaseModel):
    filled_sections: dict[str, str] | None = None
    title: str | None = None


class OrbTemplateExportRequest(BaseModel):
    profile: str = Field(default="pdf")
    filled_sections: dict[str, str] | None = None
    title: str | None = None


class OrbReviewThisRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=500_000)
    document_type: str | None = None
    role: str | None = None
    mode: str | None = "Ask ORB"


class OrbLearningMicroRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=20_000)
    prior_answer: str | None = Field(default=None, max_length=50_000)
    format: str | None = None


@router.get("/templates/health")
async def templates_health(current_user=Depends(require_standalone_orb_access)):
    return _success(
        {
            "status": "ok",
            "template_count": len(orb_template_library_registry.list_templates()),
            "standalone": True,
            "os_records_accessed": False,
        }
    )


@router.get("/templates/categories")
async def list_template_categories(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_template_library_registry.categories())


@router.get("/templates")
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


@router.get("/templates/{template_id}")
async def get_template(template_id: str, current_user=Depends(require_standalone_orb_access)):
    template = orb_template_library_registry.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return _success(template)


@router.post("/templates/{template_id}/generate")
async def generate_template(
    template_id: str,
    title: str | None = Query(default=None),
    current_user=Depends(require_standalone_orb_access),
):
    try:
        return _success(orb_template_generation_service.generate(template_id, title=title))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/templates/{template_id}/draft")
async def create_template_draft(
    template_id: str,
    body: OrbTemplateDraftRequest,
    current_user=Depends(require_standalone_orb_access),
):
    try:
        return _success(
            orb_template_generation_service.create_draft(
                template_id,
                filled_sections=body.filled_sections,
                title=body.title,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/templates/{template_id}/export")
async def export_template(
    template_id: str,
    body: OrbTemplateExportRequest,
    current_user=Depends(require_standalone_orb_access),
):
    try:
        return _success(
            orb_template_generation_service.export(
                template_id,
                profile=body.profile,
                filled_sections=body.filled_sections,
                title=body.title,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/review-this")
async def review_this(
    body: OrbReviewThisRequest,
    current_user=Depends(require_standalone_orb_access),
):
    message = f"Review this {body.document_type or 'document'} for practice quality."
    context = shared_institutional_cognition_runtime.build_context(
        surface="standalone_orb",
        message=message,
        mode=body.mode,
        operational_context={
            "document_text": body.content,
            "document_type": body.document_type,
            "role": body.role,
        },
    )
    return _success(
        {
            "review_sections": orb_review_this_service.REVIEW_SECTIONS,
            "document_type": orb_review_this_service.detect_document_type(
                message, explicit=body.document_type
            ),
            "cognition": context,
            "prompt_guidance": orb_review_this_service.prompt_block(
                message,
                document_type=body.document_type,
                document_text=body.content,
                role=body.role,
            ),
            "standalone": True,
            "os_records_accessed": False,
            "usage_hint": "Send the same content via POST /orb/standalone/conversation with document_text for a full ORB review answer.",
        }
    )


@router.post("/learn/micro-session")
async def learning_micro_session(
    body: OrbLearningMicroRequest,
    current_user=Depends(require_standalone_orb_access),
):
    message = f"Turn this into a 5-minute staff learning session: {body.topic}"
    structure = orb_learning_micro_service.build_structure(message, topic=body.topic)
    context = shared_institutional_cognition_runtime.build_context(
        surface="standalone_orb",
        message=message,
        mode="Ask ORB",
    )
    return _success(
        {
            "structure": structure,
            "prompt_guidance": orb_learning_micro_service.prompt_block(
                message, prior_answer=body.prior_answer
            ),
            "cognition": context,
            "usage_hint": "Use POST /orb/standalone/conversation with the learning request for a full generated session.",
        }
    )
