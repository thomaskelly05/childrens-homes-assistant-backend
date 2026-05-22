from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from auth.dependencies import get_current_user
from schemas.indicare_intelligence import IntelligenceRequest
from services.evidence_graph_intelligence_service import evidence_graph_intelligence_service
from services.indicare_intelligence_spine_service import indicare_intelligence_spine_service
from services.ofsted_judgement_simulation_service import ofsted_judgement_simulation_service
from services.pattern_detection_service import pattern_detection_service
from services.record_quality_intelligence_service import record_quality_intelligence_service
from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE

# Authenticated manager/staff routes — follows manager_intelligence and governance patterns.
router = APIRouter(prefix="/intelligence", tags=["indicare-intelligence-spine"])


class RecordsPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    records: list[dict[str, Any]] = Field(default_factory=list)
    child_id: int | str | None = None
    home_id: int | str | None = None
    days: int = Field(default=30, ge=1, le=365)
    context: dict[str, Any] = Field(default_factory=dict)


@router.get("/health")
def intelligence_health(current_user: dict[str, Any] = Depends(get_current_user)):
    return {
        "success": True,
        "data": {
            "status": "ready",
            "service": "indicare_intelligence_spine",
            "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
            "endpoints": {
                "spine": "POST /intelligence/spine",
                "patterns": "POST /intelligence/patterns",
                "ofsted_simulation": "POST /intelligence/ofsted-simulation",
                "record_quality": "POST /intelligence/record-quality",
                "evidence_graph": "POST /intelligence/evidence-graph",
            },
            "connected_services": [
                "regulatory_ontology_service",
                "ofsted_document_readiness_service",
                "pattern_detection_service",
                "evidence_graph_intelligence_service",
                "ofsted_judgement_simulation_service",
                "record_quality_intelligence_service",
            ],
            "user_id": current_user.get("id"),
        },
    }


@router.post("/spine")
def intelligence_spine(
    payload: IntelligenceRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    _ = current_user
    data = indicare_intelligence_spine_service.build_response(payload)
    return {"success": True, "data": data.model_dump(mode="json")}


@router.post("/patterns")
def intelligence_patterns(
    payload: RecordsPayload,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    _ = current_user
    patterns = pattern_detection_service.detect(
        records=payload.records,
        child_id=payload.child_id,
        home_id=payload.home_id,
        days=payload.days,
    )
    return {"success": True, "data": [p.model_dump(mode="json") for p in patterns]}


@router.post("/ofsted-simulation")
def intelligence_ofsted_simulation(
    payload: RecordsPayload,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    _ = current_user
    simulation = ofsted_judgement_simulation_service.simulate(payload.records)
    return {"success": True, "data": [s.model_dump(mode="json") for s in simulation]}


@router.post("/record-quality")
def intelligence_record_quality(
    payload: RecordsPayload,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    _ = current_user
    reviews = record_quality_intelligence_service.review_records(payload.records)
    return {"success": True, "data": [r.model_dump(mode="json") for r in reviews]}


@router.post("/evidence-graph")
def intelligence_evidence_graph(
    payload: RecordsPayload,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    _ = current_user
    graph = evidence_graph_intelligence_service.build(payload.records, child_id=payload.child_id)
    return {"success": True, "data": graph.model_dump(mode="json")}
