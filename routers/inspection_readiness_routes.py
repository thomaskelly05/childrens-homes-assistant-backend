"""Inspection evidence preparation routes — Reg 44 / Reg 45 evidence support packs."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import psycopg2
from fastapi import APIRouter, Body, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from db.connection import get_db
from routers.document_os_route_utils import EvidencePayload
from schemas.inspection_readiness import (
    InspectionPackSaveRequest,
    InspectionReadinessFilters,
)
from services.document_os_inspection_readiness import (
    inspection_readiness_service as document_inspection_readiness_service,
)
from services.inspection_pack_service import inspection_pack_service
from services.inspection_readiness_service import inspection_readiness_service

logger = logging.getLogger(__name__)

# Legacy document OS / inspection prefix
legacy_router = APIRouter(prefix="/inspection", tags=["Inspection evidence preparation (legacy)"])

# Canonical Inspection evidence preparation workspace
router = APIRouter(prefix="/inspection evidence preparation", tags=["Inspection evidence preparation"])
compat_router = APIRouter(prefix="/api", tags=["Inspection evidence preparation API"])

MANAGER_ROLES = {
    "admin",
    "administrator",
    "manager",
    "registered_manager",
    "ri",
    "responsible_individual",
    "provider_admin",
    "super_admin",
}


def _success(data: Any) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "operational_only": True,
        "standalone_access": False,
        "metadata_only": True,
        "evidence_support_only": True,
    }


def _user_dict(current_user: Any) -> dict[str, Any]:
    if isinstance(current_user, dict):
        return current_user
    return dict(current_user)


def _ensure_manager_access(user: dict[str, Any]) -> None:
    role = str(user.get("role") or "").strip().lower()
    if role not in MANAGER_ROLES and not inspection_readiness_service.enforce_access(user):
        raise HTTPException(status_code=403, detail="Manager or senior oversight access required")


def _require_manager(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    user = _user_dict(current_user)
    _ensure_manager_access(user)
    return user


def _filters_from_query(
    *,
    pack_type: str | None = None,
    child_id: int | None = None,
    staff_id: str | None = None,
    home_id: int | None = None,
    period_start: str | None = None,
    period_end: str | None = None,
    evidence_strength: str | None = None,
    risk: str | None = None,
    limit: int = 100,
) -> InspectionReadinessFilters:
    return InspectionReadinessFilters(
        pack_type=pack_type,  # type: ignore[arg-type]
        child_id=child_id,
        staff_id=staff_id,
        home_id=home_id,
        period_start=period_start,
        period_end=period_end,
        evidence_strength=evidence_strength,  # type: ignore[arg-type]
        risk=risk,  # type: ignore[arg-type]
        limit=limit,
    )


def _light_readiness_pack(home_id: Any, current_user: dict[str, Any]) -> dict[str, Any]:
    return {
        "ok": True,
        "home_id": home_id,
        "summary": "Inspection evidence preparation workspace available at /intelligence/inspection evidence preparation.",
        "sections": [
            {"id": "reg44", "title": "Regulation 44", "status": "available"},
            {"id": "reg45", "title": "Regulation 45", "status": "available"},
            {"id": "sccif", "title": "SCCIF evidence", "status": "available"},
            {"id": "quality_standards", "title": "Quality Standards", "status": "available"},
        ],
        "routes": {"workspace": "/intelligence/inspection evidence preparation"},
        "manager_only": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "guardrails": [
            "No automatic Ofsted submission.",
            "No inspection grade prediction.",
            "Not a compliance decision.",
        ],
    }


# --- Legacy routes (unchanged paths) ---


@legacy_router.get("/readiness")
def inspection_readiness_legacy(
    full: bool = Query(False),
    current_user: dict[str, Any] = Depends(_require_manager),
):
    home_id = current_user.get("home_id") or current_user.get("selected_home_id")
    if not full:
        return _light_readiness_pack(home_id, current_user)
    return inspection_pack_service.build_pack(
        home_id=home_id,
        home_profile={
            "id": home_id,
            "registered_manager_name": current_user.get("name") or current_user.get("email"),
        },
        staff=[],
        children=[],
        records=[],
        documents=[],
    )


@legacy_router.post("/readiness/snapshot")
def inspection_readiness_snapshot(
    payload: EvidencePayload,
    current_user: dict[str, Any] = Depends(_require_manager),
):
    snapshot = document_inspection_readiness_service.snapshot(records=payload.records)
    return {
        "ok": True,
        "home_id": current_user.get("home_id") or current_user.get("selected_home_id"),
        "snapshot": snapshot,
    }


# --- Canonical Inspection evidence preparation routes ---


@router.get("/health")
async def inspection_readiness_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    health = inspection_readiness_service.get_health(conn=conn)
    from services.inspection_pack_registry_service import inspection_pack_registry_service

    payload = health.model_dump()
    payload["disclaimer"] = inspection_pack_registry_service.safe_pack_disclaimer()
    return _success(payload)


@router.get("/dashboard")
async def inspection_readiness_dashboard(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
    child_id: int | None = None,
    staff_id: str | None = None,
    home_id: int | None = None,
    limit: int = Query(100, ge=1, le=200),
):
    user = _user_dict(current_user)
    _ensure_manager_access(user)
    filters = _filters_from_query(child_id=child_id, staff_id=staff_id, home_id=home_id, limit=limit)
    try:
        dashboard = inspection_readiness_service.build_dashboard(user, filters, conn=conn)
    except Exception as exc:
        logger.warning("inspection_readiness_dashboard_route_degraded: %s", exc)
        if conn is not None and isinstance(exc, psycopg2.Error):
            try:
                conn.rollback()
            except Exception:
                pass
        dashboard = inspection_readiness_service.build_degraded_dashboard()
    return _success(dashboard.model_dump(mode="json"))


@router.post("/packs/generate")
async def generate_inspection_pack(
    body: dict[str, Any] = Body(default_factory=dict),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _ensure_manager_access(user)
    pack_type = str(body.get("pack_type") or "reg44")
    if pack_type not in {"reg44", "reg45", "sccif", "quality_standards", "custom"}:
        raise HTTPException(status_code=400, detail="Invalid pack_type")
    filters = InspectionReadinessFilters(
        pack_type=pack_type,  # type: ignore[arg-type]
        period_start=body.get("period_start"),
        period_end=body.get("period_end"),
        child_id=body.get("child_id"),
        staff_id=body.get("staff_id"),
        home_id=body.get("home_id"),
    )
    pack = inspection_readiness_service.generate_pack(pack_type, user, filters, conn=conn)  # type: ignore[arg-type]
    return _success(pack.model_dump(mode="json"))


@router.get("/packs/reg44")
async def get_reg44_pack(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
    period_start: str | None = None,
    period_end: str | None = None,
    child_id: int | None = None,
    staff_id: str | None = None,
    home_id: int | None = None,
):
    filters = _filters_from_query(
        pack_type="reg44",
        period_start=period_start,
        period_end=period_end,
        child_id=child_id,
        staff_id=staff_id,
        home_id=home_id,
    )
    user = _user_dict(current_user)
    _ensure_manager_access(user)
    pack = inspection_readiness_service.generate_reg44_pack(user, filters, conn=conn)
    return _success(pack.model_dump(mode="json"))


@router.get("/packs/reg45")
async def get_reg45_pack(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
    period_start: str | None = None,
    period_end: str | None = None,
    child_id: int | None = None,
    staff_id: str | None = None,
    home_id: int | None = None,
):
    filters = _filters_from_query(
        pack_type="reg45",
        period_start=period_start,
        period_end=period_end,
        child_id=child_id,
        staff_id=staff_id,
        home_id=home_id,
    )
    user = _user_dict(current_user)
    _ensure_manager_access(user)
    pack = inspection_readiness_service.generate_reg45_pack(user, filters, conn=conn)
    return _success(pack.model_dump(mode="json"))


@router.get("/packs/sccif")
async def get_sccif_pack(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _ensure_manager_access(user)
    pack = inspection_readiness_service.generate_sccif_pack(user, conn=conn)
    return _success(pack.model_dump(mode="json"))


@router.get("/packs/quality-standards")
async def get_quality_standards_pack(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _ensure_manager_access(user)
    pack = inspection_readiness_service.generate_quality_standards_pack(user, conn=conn)
    return _success(pack.model_dump(mode="json"))


@router.post("/packs/save")
async def save_inspection_pack(
    request: InspectionPackSaveRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _ensure_manager_access(user)
    pack = request.pack
    if pack is None:
        pack = inspection_readiness_service.generate_pack(
            request.pack_type,
            user,
            InspectionReadinessFilters(
                pack_type=request.pack_type,
                period_start=request.period_start,
                period_end=request.period_end,
                home_id=(request.scope or {}).get("home_id") if request.scope else None,
            ),
            conn=conn,
        )
    response = inspection_readiness_service.save_pack(pack, request, user, conn=conn)
    return _success(response.model_dump(mode="json"))


@router.get("/packs/history")
async def list_inspection_packs(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    user = _user_dict(current_user)
    _ensure_manager_access(user)
    history = inspection_readiness_service.list_pack_history(user, limit=limit, conn=conn)
    return _success({"packs": history})


@router.get("/packs/{pack_id}")
async def get_inspection_pack(
    pack_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _ensure_manager_access(user)
    pack = inspection_readiness_service.get_pack_by_id(pack_id, user, conn=conn)
    if pack is None:
        raise HTTPException(status_code=404, detail="Pack not found")
    return _success(pack.model_dump(mode="json"))


compat_router.include_router(router)
