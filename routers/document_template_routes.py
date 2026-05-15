from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from routers.document_os_route_utils import user_from_request
from services.document_template_registry import document_template_registry


router = APIRouter(prefix="/api/document-os/templates", tags=["documents-os"])


@router.get("")
def list_templates(category: str | None = None) -> dict[str, Any]:
    return {"ok": True, "templates": document_template_registry.list_templates(category=category), "uniqueness": document_template_registry.validate_uniqueness()}


@router.get("/roles")
def role_metadata() -> dict[str, Any]:
    return {"ok": True, "roles": document_template_registry.role_metadata()}


@router.get("/{template_id}")
def get_template(template_id: str) -> dict[str, Any]:
    try:
        return {"ok": True, "template": document_template_registry.get_template(template_id)}
    except KeyError:
        raise HTTPException(status_code=404, detail="Document template not found")


@router.post("/{template_id}/blank")
def blank_document(template_id: str, request: Request, context: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"ok": True, "document": document_template_registry.blank_document(template_id, current_user=user_from_request(request), context=context or {})}
