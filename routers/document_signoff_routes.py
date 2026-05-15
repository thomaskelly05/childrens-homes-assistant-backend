from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from routers.document_os_route_utils import user_from_request
from services.document_signoff_service import document_signoff_service


router = APIRouter(prefix="/api/document-os/signoff", tags=["documents-os"])


class SignoffRequest(BaseModel):
    document: dict[str, Any]
    target_status: str
    comments: str | None = None
    evidence_reviewed: list[dict[str, Any]] = Field(default_factory=list)


@router.get("/statuses")
def statuses() -> dict[str, Any]:
    return {"ok": True, "statuses": document_signoff_service.STATUSES}


@router.post("")
def transition(payload: SignoffRequest, request: Request) -> dict[str, Any]:
    result = document_signoff_service.transition(
        document=payload.document,
        target_status=payload.target_status,
        comments=payload.comments,
        evidence_reviewed=payload.evidence_reviewed,
        current_user=user_from_request(request),
    )
    return {"ok": True, **result}
