from __future__ import annotations

from fastapi import APIRouter

from routers.document_os_route_utils import EvidencePayload
from services.external_professional_collaboration_service import external_professional_collaboration_service


router = APIRouter(prefix="/api/document-os/external-collaboration", tags=["documents-os"])


@router.post("/links")
def links(payload: EvidencePayload):
    return {"ok": True, "collaboration": external_professional_collaboration_service.links(records=payload.records)}
