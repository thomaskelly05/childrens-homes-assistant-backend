from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field

from auth.dependencies import get_current_user
from db.connection import get_db
from services.governance_intelligence_service import (
    governance_feature_flags,
    governance_intelligence_service,
    validate_reg44_transition,
)


router = APIRouter(prefix="/api/governance-os", tags=["Governance OS"])


class EvidenceMatrixPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    records: list[dict[str, Any]] = Field(default_factory=list)


class Reg44TransitionPayload(BaseModel):
    current_status: str
    next_status: str


@router.get("/feature-flags")
def governance_feature_flags_route(current_user: dict[str, Any] = Depends(get_current_user)):
    return {"ok": True, "feature_flags": governance_feature_flags()}


@router.get("/audit")
def governance_audit(current_user: dict[str, Any] = Depends(get_current_user)):
    return governance_intelligence_service.audit_summary()


@router.get("/command-centre")
def governance_command_centre(
    days: int = Query(30, ge=1, le=365),
    home_id: int | None = None,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return {
        "ok": True,
        "data": governance_intelligence_service.build_command_centre(
            conn,
            current_user=current_user,
            days=days,
            home_id=home_id,
        ),
    }


@router.post("/evidence-matrix")
def governance_evidence_matrix(payload: EvidenceMatrixPayload, current_user: dict[str, Any] = Depends(get_current_user)):
    evidence_index = governance_intelligence_service.evidence_index_from_payloads(records=payload.records)
    return {"ok": True, "data": governance_intelligence_service.build_evidence_matrix(evidence_index=evidence_index)}


@router.get("/risk")
def governance_risk(
    days: int = Query(30, ge=1, le=365),
    home_id: int | None = None,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    centre = governance_intelligence_service.build_command_centre(conn, current_user=current_user, days=days, home_id=home_id)
    return {"ok": True, "data": centre.get("governance_risk", {})}


@router.get("/reg44")
def governance_reg44(
    home_id: int | None = None,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return {"ok": True, "data": governance_intelligence_service.build_reg44_workflow(conn, current_user=current_user, home_id=home_id)}


@router.post("/reg44/transition/validate")
def governance_reg44_transition_validate(payload: Reg44TransitionPayload, current_user: dict[str, Any] = Depends(get_current_user)):
    return {
        "ok": True,
        "allowed": validate_reg44_transition(payload.current_status, payload.next_status),
        "current_status": payload.current_status,
        "next_status": payload.next_status,
    }


@router.post("/reg45")
def governance_reg45(payload: EvidenceMatrixPayload, current_user: dict[str, Any] = Depends(get_current_user)):
    evidence_index = governance_intelligence_service.evidence_index_from_payloads(records=payload.records)
    return {"ok": True, "data": governance_intelligence_service.build_reg45_review(evidence_index=evidence_index)}


@router.get("/provider-oversight")
def governance_provider_oversight(
    days: int = Query(30, ge=1, le=365),
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    centre = governance_intelligence_service.build_command_centre(conn, current_user=current_user, days=days)
    return {"ok": True, "data": centre.get("provider_oversight", {})}


@router.get("/orb-context")
def governance_orb_context(
    days: int = Query(30, ge=1, le=365),
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    centre = governance_intelligence_service.build_command_centre(conn, current_user=current_user, days=days)
    return {"ok": True, "data": centre.get("orb_governance_summary", {})}


@router.get("/inspection-forecast")
def governance_inspection_forecast(
    days: int = Query(30, ge=1, le=365),
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    centre = governance_intelligence_service.build_command_centre(conn, current_user=current_user, days=days)
    return {"ok": True, "data": centre.get("inspection_readiness", {})}
