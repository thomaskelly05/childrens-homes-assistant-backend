from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from routers.document_os_route_utils import user_from_request
from services.document_extraction_service import document_extraction_service


router = APIRouter(prefix="/api/document-os/extraction", tags=["documents-os"])


class ExtractionRequest(BaseModel):
    template_id: str
    source_text: str = ""
    upload: dict[str, Any] = Field(default_factory=dict)


@router.post("")
def extract_document(payload: ExtractionRequest, request: Request) -> dict[str, Any]:
    return document_extraction_service.extract(
        template_id=payload.template_id,
        source_text=payload.source_text,
        upload=payload.upload,
        current_user=user_from_request(request),
    )
