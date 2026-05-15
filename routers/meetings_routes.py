from __future__ import annotations

from fastapi import APIRouter

from routers.document_os_route_utils import EvidencePayload
from services.meetings_reviews_service import meetings_reviews_service


router = APIRouter(prefix="/api/document-os/meetings", tags=["documents-os"])


@router.post("/summarise")
def summarise(payload: EvidencePayload):
    return {"ok": True, "meetings": meetings_reviews_service.summarise(records=payload.records)}
