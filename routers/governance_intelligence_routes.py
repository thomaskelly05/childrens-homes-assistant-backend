from __future__ import annotations

import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from auth.dependencies import get_current_user
from db.connection import DatabaseUnavailableError, db_connection, is_pool_under_pressure
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
from services.os_cache_service import os_cache_service

logger = logging.getLogger(__name__)

GOVERNANCE_CC_CACHE_TTL_SECONDS = int(os.getenv("GOVERNANCE_COMMAND_CENTRE_CACHE_TTL_SECONDS", "45"))
GOVERNANCE_CC_STALE_SECONDS = int(os.getenv("GOVERNANCE_COMMAND_CENTRE_STALE_SECONDS", "120"))
GOVERNANCE_CC_BUILD_TIMEOUT_MS = int(os.getenv("GOVERNANCE_COMMAND_CENTRE_BUILD_TIMEOUT_MS", "3500"))

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


def _memory_cache_key(current_user: dict[str, Any], *, days: int, home_id: int | None) -> str:
    user_id = current_user.get("id") or current_user.get("user_id") or "anon"
    return f"governance:command-centre:user:{user_id}:home:{_home_id(current_user, home_id)}:days:{days}"


def _attach_cache_fields(payload: dict[str, Any], *, cache_status: str, degraded: bool, warnings: list[str] | None = None) -> dict[str, Any]:
    payload = dict(payload)
    payload["cache_status"] = cache_status
    payload["degraded"] = bool(payload.get("degraded")) or degraded
    if warnings:
        existing = list(payload.get("warnings") or [])
        payload["warnings"] = (existing + warnings)[:12]
    return payload


def _stale_from_projection(key: str, cached: dict[str, Any] | None) -> dict[str, Any] | None:
    if not cached or not isinstance(cached.get("payload"), dict):
        return None
    payload = dict(cached["payload"])
    payload = _attach_cache_fields(
        payload,
        cache_status="stale",
        degraded=True,
        warnings=["Governance command centre served from stale snapshot while database is busy."],
    )
    payload["snapshot"] = {
        "hit": True,
        "stale": True,
        "projection_key": key,
        "version": cached.get("version"),
        "generated_at": cached.get("generated_at"),
    }
    return payload


def _build_governance_command_centre(*, current_user: dict[str, Any], days: int, home_id: int | None) -> dict[str, Any]:
    started = time.perf_counter()
    mem_key = _memory_cache_key(current_user, days=days, home_id=home_id)
    proj_key = _governance_snapshot_key(current_user, days=days, home_id=home_id)

    lookup = os_cache_service.get(mem_key)
    if lookup.hit and isinstance(lookup.value, dict):
        payload = _attach_cache_fields(dict(lookup.value), cache_status=lookup.status, degraded=lookup.stale)
        total_ms = round((time.perf_counter() - started) * 1000, 2)
        logger.info(
            "governance_command_centre endpoint=/api/governance-os/command-centre total_ms=%s cache_status=%s degraded=%s section_count=%s timeout_count=%s warning_count=%s",
            total_ms,
            payload.get("cache_status"),
            payload.get("degraded"),
            len(payload.get("section_status") or {}),
            0,
            len(payload.get("warnings") or []),
        )
        return payload

    proj_cached = projection_snapshot_service.get(proj_key)
    if is_pool_under_pressure():
        stale = lookup.value if lookup.stale and isinstance(lookup.value, dict) else None
        if stale:
            return _attach_cache_fields(dict(stale), cache_status="stale", degraded=True)
        proj_stale = _stale_from_projection(proj_key, proj_cached)
        if proj_stale:
            os_cache_service.set(mem_key, proj_stale, ttl_seconds=GOVERNANCE_CC_CACHE_TTL_SECONDS, stale_ttl_seconds=GOVERNANCE_CC_STALE_SECONDS)
            return proj_stale

    def _build() -> dict[str, Any]:
        with ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(
                governance_intelligence_service.build_command_centre,
                current_user=current_user,
                days=days,
                home_id=home_id,
            )
            try:
                return future.result(timeout=GOVERNANCE_CC_BUILD_TIMEOUT_MS / 1000.0)
            except FuturesTimeoutError as exc:
                raise DatabaseUnavailableError("Governance command centre build timed out") from exc

    build_started = time.perf_counter()
    try:
        payload, cache_lookup = os_cache_service.get_or_build(
            mem_key,
            _build,
            ttl_seconds=GOVERNANCE_CC_CACHE_TTL_SECONDS,
            stale_ttl_seconds=GOVERNANCE_CC_STALE_SECONDS,
            coalesce=True,
        )
    except DatabaseUnavailableError as exc:
        build_ms = round((time.perf_counter() - build_started) * 1000, 2)
        logger.warning(
            "governance_command_centre db_unavailable build_ms=%s error=%s",
            build_ms,
            exc,
        )
        stale_lookup = os_cache_service.get(mem_key)
        if stale_lookup.hit and isinstance(stale_lookup.value, dict):
            return _attach_cache_fields(dict(stale_lookup.value), cache_status="stale", degraded=True)
        proj_stale = _stale_from_projection(proj_key, proj_cached)
        if proj_stale:
            return proj_stale
        raise HTTPException(status_code=503, detail="Governance command centre temporarily unavailable") from exc

    build_ms = round((time.perf_counter() - build_started) * 1000, 2)
    payload = _attach_cache_fields(
        dict(payload),
        cache_status=cache_lookup.status,
        degraded=bool(payload.get("degraded")),
    )

    try:
        projection_snapshot_service.put(
            ProjectionSnapshot(
                projection_key=proj_key,
                projection_type="command_centre",
                domain="governance",
                payload=payload,
                home_id=_home_id(current_user, home_id),
                provider_id=_provider_id(current_user),
                metadata={"days": days, "source": "governance_intelligence_service.build_command_centre"},
            )
        )
        payload["snapshot"] = {"hit": False, "projection_key": proj_key, "stored": True}
    except Exception:
        payload["snapshot"] = {"hit": False, "projection_key": proj_key, "stored": False}

    total_ms = round((time.perf_counter() - started) * 1000, 2)
    logger.info(
        "governance_command_centre endpoint=/api/governance-os/command-centre total_ms=%s cache_status=%s build_ms=%s degraded=%s section_count=%s timeout_count=%s warning_count=%s",
        total_ms,
        payload.get("cache_status"),
        build_ms,
        payload.get("degraded"),
        len(payload.get("section_status") or {}),
        sum(1 for s in (payload.get("section_status") or {}).values() if s.get("timed_out")),
        len(payload.get("warnings") or []),
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
