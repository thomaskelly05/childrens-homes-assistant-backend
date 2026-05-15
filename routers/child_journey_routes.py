from __future__ import annotations

from fastapi import APIRouter

from routers.document_os_route_utils import EvidencePayload
from services.child_journey_synthesis_service import child_journey_synthesis_service
from services.placement_stability_service import placement_stability_service
from services.relational_intelligence_service import relational_intelligence_service


router = APIRouter(prefix="/api/intelligence-os/child-journey", tags=["intelligence-os"])


@router.post("/synthesis")
def synthesis(payload: EvidencePayload):
    return {"ok": True, "summary": child_journey_synthesis_service.synthesise(records=payload.records)}


@router.post("/placement-stability")
def stability(payload: EvidencePayload):
    return {"ok": True, "stability": placement_stability_service.indicators(records=payload.records)}


@router.post("/relational")
def relational(payload: EvidencePayload):
    return {"ok": True, "relational": relational_intelligence_service.analyse(records=payload.records)}


@router.get("/demo")
def synthesis_demo():
    records = [{"title": "Progress", "summary": "Child described trusted adult support, education progress and feeling safer."}]
    return {"ok": True, "summary": child_journey_synthesis_service.synthesise(records=records)}
