from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from routers.document_os_route_utils import user_from_request
from services.document_template_service import document_template_service


router = APIRouter(prefix="/api/document-os/templates", tags=["documents-os"])


@router.get("")
def list_templates(category: str | None = None, scope: str | None = None, query: str | None = None) -> dict[str, Any]:
    templates = [_as_document_os_template(template.model_dump(mode="json")) for template in document_template_service.list_templates(category=category, scope=scope, query=query)]
    ids = [template["template_id"] for template in templates]
    duplicates = sorted({template_id for template_id in ids if ids.count(template_id) > 1})
    return {"ok": True, "templates": templates, "uniqueness": {"ok": not duplicates, "template_count": len(ids), "duplicate_template_ids": duplicates}}


@router.get("/roles")
def role_metadata() -> dict[str, Any]:
    return {
        "ok": True,
        "roles": {
            "rsw": {"label": "RSW", "level": "child", "can_sign_off": False, "safeguarding_sensitive": False},
            "senior_rsw": {"label": "Senior RSW", "level": "home", "can_sign_off": False, "safeguarding_sensitive": True},
            "registered_manager": {"label": "Registered Manager", "level": "home", "can_sign_off": True, "safeguarding_sensitive": True},
            "responsible_individual": {"label": "Responsible Individual", "level": "provider", "can_sign_off": True, "safeguarding_sensitive": True},
        },
    }


@router.get("/{template_id}")
def get_template(template_id: str) -> dict[str, Any]:
    try:
        return {"ok": True, "template": _as_document_os_template(document_template_service.get_template(template_id).model_dump(mode="json"))}
    except KeyError:
        raise HTTPException(status_code=404, detail="Document template not found")


@router.post("/{template_id}/blank")
def blank_document(template_id: str, request: Request, context: dict[str, Any] | None = None) -> dict[str, Any]:
    try:
        template = document_template_service.get_template(template_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Document template not found")
    user = user_from_request(request)
    sections = document_template_service.blank_sections(template_id)
    return {
        "ok": True,
        "document": {
            "template_id": template_id,
            "title": template.title,
            "status": "draft",
            "editable": True,
            "draft_only": True,
            "auto_finalised": False,
            "signoff_required": bool(template.signoff_requirements),
            "sections": sections,
            "fields": sections,
            "links": [],
            "created_by": user.get("id") or user.get("user_id") or user.get("sub"),
            "metadata": {"context": context or {}, "safety_notice": "Draft for human review; never auto-finalised.", "regulatory_links": template.regulatory_links, "quality_standard_links": template.quality_standard_links, "sccif_links": template.sccif_links},
        },
    }


def _as_document_os_template(template: dict[str, Any]) -> dict[str, Any]:
    sections = template.get("required_sections") or []
    return {
        **template,
        "supports_digital_form": True,
        "supports_upload_extraction": True,
        "editable": True,
        "manager_signoff_required": bool(template.get("signoff_requirements")),
        "human_review_required": True,
        "ai_outputs_draft_only": True,
        "fields": [{"field_id": section["section_id"], "label": section["title"], "required": section.get("required", True)} for section in sections],
        "metadata": {
            "quality_standards": template.get("quality_standard_links", []),
            "sccif": template.get("sccif_links", []),
            "regulations": template.get("regulatory_links", []),
            "provider_oversight": True,
            "safeguarding_sensitive": any("safeguarding" in link.lower() or "protection" in link.lower() or "Regulation 12".lower() in link.lower() for link in template.get("regulatory_links", [])),
        },
    }
