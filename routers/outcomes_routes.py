from __future__ import annotations

from fastapi import APIRouter

from routers.document_os_route_utils import EvidencePayload
from services.outcomes_analytics_service import outcomes_analytics_service


router = APIRouter(prefix="/api/intelligence-os/outcomes", tags=["intelligence-os"])


@router.post("/analytics")
def analytics(payload: EvidencePayload):
    return {"ok": True, "outcomes": outcomes_analytics_service.analyse(records=payload.records)}
