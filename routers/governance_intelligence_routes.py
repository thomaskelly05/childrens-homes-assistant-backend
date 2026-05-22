from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from auth.dependencies import get_current_user
from db.connection import DatabaseUnavailableError, db_connection
from services.governance_intelligence_service import (
    governance_feature_flags,
    governance_intelligence_service,
    validate_reg44_transition,
)
from services.intelligence.projection_snapshot_service import (
    ProjectionSnapshot,
    projection_snapshot_key,
    projection_snapshot_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/governance-os", tags=["Governance OS"])


class EvidenceMatrixPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    records: list[dict[str, Any]] = Field(default_factory=list)


class Reg44TransitionPayload(BaseModel):
    current_status: str
    next_status: str


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, "", "null", "None"):
            return None
        return int(value)
    except Exception:
        return None


def _home_id(current_user: dict[str, Any], explicit_home_id: int | None = None) -> int | None:
    return explicit_home_id or _safe_int(current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id"))


def _provider_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("provider_id") or current_user.get("providerId"))


def _governance_snapshot_key(current_user: dict[str, Any], *, days: int, home_id: int | None) -> str:
    return projection_snapshot_key("governance", "command-centre", "home", _home_id(current_user, home_id), "provider", _provider_id(current_user), "days", days)


def _build_governance_command_centre(*, current_user: dict[str, Any], days: int, home_id: int | None) -> dict[str, Any]:
    started = time.perf_counter()
    key = _governance_snapshot_key(current_user, days=days, home_id=home_id)

    cache_started = time.perf_counter()
    cached = projection_snapshot_service.get(key)
    cache_ms = round((time.perf_counter() - cache_started) * 1000, 2)
    if cached and not cached.get("stale") and isinstance(cached.get("payload"), dict):
        payload = dict(cached["payload"])
        payload["snapshot"] = {
            "hit": True,
            "projection_key": key,
            "version": cached.get("version"),
            "generated_at": cached.get("generated_at"),
        }
        logger.info(
            "governance_command_centre cache_hit=true cache_ms=%s total_ms=%s",
            cache_ms,
            round((time.perf_counter() - started) * 1000, 2),
        )
        return payload

    build_started = time.perf_counter()
    try:
        payload = governance_intelligence_service.build_command_centre(
            current_user=current_user,
            days=days,
            home_id=home_id,
        )
    except DatabaseUnavailableError as exc:
        build_ms = round((time.perf_counter() - build_started) * 1000, 2)
        logger.warning(
            "governance_command_centre db_unavailable cache_ms=%s build_ms=%s error=%s",
            cache_ms,
            build_ms,
            exc,
        )
        if cached and isinstance(cached.get("payload"), dict):
            payload = dict(cached["payload"])
            payload["degraded"] = True
            payload["message"] = "Governance command centre served from stale snapshot while database is busy."
            payload["snapshot"] = {
                "hit": True,
                "stale": True,
                "projection_key": key,
                "version": cached.get("version"),
                "generated_at": cached.get("generated_at"),
            }
            return payload
        raise HTTPException(status_code=503, detail="Governance command centre temporarily unavailable") from exc
    build_ms = round((time.perf_counter() - build_started) * 1000, 2)

    save_started = time.perf_counter()
    projection_snapshot_service.put(
        ProjectionSnapshot(
            projection_key=key,
            projection_type="command_centre",
            domain="governance",
            payload=payload,
            home_id=_home_id(current_user, home_id),
            provider_id=_provider_id(current_user),
            metadata={"days": days, "source": "governance_intelligence_service.build_command_centre"},
        )
    )
    save_ms = round((time.perf_counter() - save_started) * 1000, 2)
    payload["snapshot"] = {"hit": False, "projection_key": key, "stored": True}
    logger.info(
        "governance_command_centre cache_hit=false cache_ms=%s build_ms=%s save_ms=%s total_ms=%s",
        cache_ms,
        build_ms,
        save_ms,
        round((time.perf_counter() - started) * 1000, 2),
    )
    return payload


@router.get("/feature-flags")
def governance_feature_flags_route(current_user: dict[str, Any] = Depends(get_current_user)):
    return {"ok": True, "feature_flags": governance_feature_flags()}


@router.get("/audit")
def governance_audit(current_user: dict[str, Any] = Depends(get_current_user)):
    return governance_intelligence_service.audit_summary()


@router.get("/command-centre")
def governance_command_centre(
    days: int = Query(14, ge=1, le=365),
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return {
        "ok": True,
        "data": _build_governance_command_centre(
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
    days: int = Query(14, ge=1, le=365),
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    centre = _build_governance_command_centre(current_user=current_user, days=days, home_id=home_id)
    return {"ok": True, "data": centre.get("governance_risk", {})}


@router.get("/reg44")
def governance_reg44(
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    with db_connection() as conn:
        data = governance_intelligence_service.build_reg44_workflow(conn, current_user=current_user, home_id=home_id)
    return {"ok": True, "data": data}


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
    days: int = Query(14, ge=1, le=365),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    centre = _build_governance_command_centre(current_user=current_user, days=days, home_id=None)
    return {"ok": True, "data": centre.get("provider_oversight", {})}


@router.get("/orb-context")
def governance_orb_context(
    days: int = Query(14, ge=1, le=365),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    centre = _build_governance_command_centre(current_user=current_user, days=days, home_id=None)
    return {"ok": True, "data": centre.get("orb_governance_summary", {})}


@router.get("/inspection-forecast")
def governance_inspection_forecast(
    days: int = Query(14, ge=1, le=365),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    centre = _build_governance_command_centre(current_user=current_user, days=days, home_id=None)
    return {"ok": True, "data": centre.get("inspection_readiness", {})}
