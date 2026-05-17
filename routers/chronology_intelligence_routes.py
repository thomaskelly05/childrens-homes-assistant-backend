from __future__ import annotations

from fastapi import APIRouter

from routers.document_os_route_utils import EvidencePayload
from services.chronology_intelligence_service import chronology_intelligence_service
from services.chronology_visualisation_service import chronology_visualisation_service
from services.emotional_wellbeing_timeline_service import emotional_wellbeing_timeline_service
from services.workforce_culture_intelligence_service import workforce_culture_intelligence_service


router = APIRouter(prefix="/api/intelligence-os/chronology", tags=["intelligence-os"])


@router.post("/analyse")
def analyse(payload: EvidencePayload):
    return {"ok": True, "chronology": chronology_intelligence_service.analyse(records=payload.records, young_person_id=payload.context.get("young_person_id"))}


@router.post("/timeline")
def timeline(payload: EvidencePayload):
    return {"ok": True, "timeline": chronology_visualisation_service.timeline(records=payload.records)}


@router.post("/emotional-wellbeing")
def emotional_wellbeing(payload: EvidencePayload):
    return {"ok": True, "timeline": emotional_wellbeing_timeline_service.build(records=payload.records)}


@router.post("/workforce-culture")
def workforce_culture(payload: EvidencePayload):
    return {"ok": True, "workforce": workforce_culture_intelligence_service.analyse(records=payload.records)}
