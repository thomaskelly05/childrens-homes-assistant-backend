"""SCCIF and Quality Standards alignment routes — authenticated OS, metadata only."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.sccif_alignment import SccifAlignmentFilters
from services.sccif_alignment_registry_service import sccif_alignment_registry_service
from services.sccif_alignment_service import sccif_alignment_service

router = APIRouter(prefix="/sccif-alignment", tags=["SCCIF Alignment"])
compat_router = APIRouter(prefix="/api/sccif-alignment", tags=["SCCIF Alignment API"])


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


def _require_alignment_view(current_user: dict[str, Any]) -> None:
    if not sccif_alignment_service.enforce_access(current_user):
        raise HTTPException(
            status_code=403,
            detail="SCCIF alignment requires manager or senior oversight role.",
        )


def _filters_from_query(
    *,
    child_id: int | None = None,
    staff_id: str | None = None,
    home_id: int | None = None,
    judgement_area: str | None = None,
    quality_standard: str | None = None,
    evidence_strength: str | None = None,
    risk: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 100,
) -> SccifAlignmentFilters:
    return SccifAlignmentFilters(
        child_id=child_id,
        staff_id=staff_id,
        home_id=home_id,
        judgement_area=judgement_area,  # type: ignore[arg-type]
        quality_standard=quality_standard,  # type: ignore[arg-type]
        evidence_strength=evidence_strength,  # type: ignore[arg-type]
        risk=risk,  # type: ignore[arg-type]
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )


@router.get("/health")
async def sccif_alignment_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    health = sccif_alignment_service.get_health(conn=conn)
    payload = health.model_dump()
    payload["disclaimer"] = sccif_alignment_registry_service.safe_alignment_disclaimer()
    return _success(payload)


@compat_router.get("/health")
async def api_sccif_alignment_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await sccif_alignment_health(current_user=current_user, conn=conn)


@router.get("/dashboard")
async def sccif_alignment_dashboard(
    child_id: int | None = None,
    staff_id: str | None = None,
    home_id: int | None = None,
    judgement_area: str | None = None,
    quality_standard: str | None = None,
    evidence_strength: str | None = None,
    risk: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = Query(100, ge=1, le=200),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_alignment_view(user)
    filt = _filters_from_query(
        child_id=child_id,
        staff_id=staff_id,
        home_id=home_id,
        judgement_area=judgement_area,
        quality_standard=quality_standard,
        evidence_strength=evidence_strength,
        risk=risk,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )
    dashboard = sccif_alignment_service.build_dashboard(user, filt, conn=conn)
    return _success(dashboard.model_dump())


@compat_router.get("/dashboard")
async def api_sccif_alignment_dashboard(
    child_id: int | None = None,
    staff_id: str | None = None,
    home_id: int | None = None,
    judgement_area: str | None = None,
    quality_standard: str | None = None,
    evidence_strength: str | None = None,
    risk: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = Query(100, ge=1, le=200),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await sccif_alignment_dashboard(
        child_id=child_id,
        staff_id=staff_id,
        home_id=home_id,
        judgement_area=judgement_area,
        quality_standard=quality_standard,
        evidence_strength=evidence_strength,
        risk=risk,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        current_user=current_user,
        conn=conn,
    )


@router.get("/judgements")
async def sccif_alignment_judgements(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = conn
    user = _user_dict(current_user)
    _require_alignment_view(user)
    return _success({
        "judgement_areas": sccif_alignment_registry_service.list_judgement_areas(),
        "disclaimer": sccif_alignment_registry_service.safe_alignment_disclaimer(),
    })


@compat_router.get("/judgements")
async def api_sccif_alignment_judgements(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await sccif_alignment_judgements(current_user=current_user, conn=conn)


@router.get("/quality-standards")
async def sccif_alignment_quality_standards(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = conn
    user = _user_dict(current_user)
    _require_alignment_view(user)
    return _success({
        "quality_standards": sccif_alignment_registry_service.list_quality_standards(),
        "disclaimer": sccif_alignment_registry_service.safe_alignment_disclaimer(),
    })


@compat_router.get("/quality-standards")
async def api_sccif_alignment_quality_standards(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await sccif_alignment_quality_standards(current_user=current_user, conn=conn)


@router.get("/evidence")
async def sccif_alignment_evidence(
    child_id: int | None = None,
    staff_id: str | None = None,
    home_id: int | None = None,
    judgement_area: str | None = None,
    quality_standard: str | None = None,
    evidence_strength: str | None = None,
    risk: str | None = None,
    limit: int = Query(100, ge=1, le=200),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_alignment_view(user)
    filt = _filters_from_query(
        child_id=child_id,
        staff_id=staff_id,
        home_id=home_id,
        judgement_area=judgement_area,
        quality_standard=quality_standard,
        evidence_strength=evidence_strength,
        risk=risk,
        limit=limit,
    )
    dashboard = sccif_alignment_service.build_dashboard(user, filt, conn=conn)
    return _success([item.model_dump() for item in dashboard.evidence_items])


@compat_router.get("/evidence")
async def api_sccif_alignment_evidence(
    child_id: int | None = None,
    staff_id: str | None = None,
    home_id: int | None = None,
    judgement_area: str | None = None,
    quality_standard: str | None = None,
    evidence_strength: str | None = None,
    risk: str | None = None,
    limit: int = Query(100, ge=1, le=200),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await sccif_alignment_evidence(
        child_id=child_id,
        staff_id=staff_id,
        home_id=home_id,
        judgement_area=judgement_area,
        quality_standard=quality_standard,
        evidence_strength=evidence_strength,
        risk=risk,
        limit=limit,
        current_user=current_user,
        conn=conn,
    )


@router.get("/gaps")
async def sccif_alignment_gaps(
    child_id: int | None = None,
    staff_id: str | None = None,
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _require_alignment_view(user)
    filt = _filters_from_query(child_id=child_id, staff_id=staff_id, home_id=home_id)
    dashboard = sccif_alignment_service.build_dashboard(user, filt, conn=conn)
    return _success([gap.model_dump() for gap in dashboard.evidence_gaps])


@compat_router.get("/gaps")
async def api_sccif_alignment_gaps(
    child_id: int | None = None,
    staff_id: str | None = None,
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await sccif_alignment_gaps(
        child_id=child_id,
        staff_id=staff_id,
        home_id=home_id,
        current_user=current_user,
        conn=conn,
    )
