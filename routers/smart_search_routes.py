from __future__ import annotations

from fastapi import APIRouter

from routers.document_os_route_utils import EvidencePayload
from services.smart_search_service import smart_search_service


router = APIRouter(prefix="/api/intelligence-os/search", tags=["intelligence-os"])


@router.post("")
def search(payload: EvidencePayload):
    return {"ok": True, "search": smart_search_service.search(query=payload.query or "", records=payload.records)}
