from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from routers.document_os_route_utils import EvidencePayload
from services.inspection_readiness_service import inspection_readiness_service as inspection_os_readiness_service
from services.inspection_pack_service import inspection_pack_service


router = APIRouter(prefix="/inspection", tags=["Inspection readiness"])

MANAGER_ROLES = {"admin", "administrator", "manager", "registered_manager", "ri", "responsible_individual", "provider_admin", "super_admin"}


def _require_manager(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    role = str(current_user.get("role") or "").strip().lower()
    if role not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Manager access required")
    return current_user


def _light_readiness_pack(home_id: Any, current_user: dict[str, Any]) -> dict[str, Any]:
    """Fast default readiness response for page render.

    The full inspection pack composes several ontology/gap services. That is
    useful for exports, but it is too expensive for every page navigation. The
    page primarily needs counts, guardrails and sections, so the default GET is
    intentionally light. Use ?full=true when a manager explicitly needs the full
    draft pack.
    """

    return {
        "ok": True,
        "home_id": home_id,
        "summary": "Inspection readiness is a live manager-review workspace. Full pack generation is available with ?full=true.",
        "sections": [
            {"id": "sccif", "title": "SCCIF evidence", "status": "available", "summary": "Review evidence across experiences, help and protection, and leadership."},
            {"id": "quality_standards", "title": "Quality Standards", "status": "available", "summary": "Check evidence against the Children’s Homes Quality Standards."},
            {"id": "reg44", "title": "Regulation 44", "status": "available", "summary": "Independent visitor evidence and action follow-up."},
            {"id": "reg45", "title": "Regulation 45", "status": "available", "summary": "Quality of care review evidence and manager oversight."},
            {"id": "safeguarding", "title": "Safeguarding and notifications", "status": "available", "summary": "Protection, missing episodes, allegations, complaints and Reg 40 notifications."},
        ],
        "evidence_gaps": [],
        "actions": [],
        "manager_only": True,
        "auto_submit": False,
        "signoff_required": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "registered_manager_name": current_user.get("name") or current_user.get("email"),
        "guardrails": [
            "No automatic Ofsted submission.",
            "No Reg 45 final judgement is generated.",
            "No safeguarding decision is made.",
        ],
    }


@router.get("/readiness")
def inspection_readiness(
    full: bool = Query(False, description="Generate the full draft inspection pack. Default is a fast page-ready summary."),
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


@router.post("/readiness/snapshot")
def inspection_readiness_snapshot(payload: EvidencePayload, current_user: dict[str, Any] = Depends(_require_manager)):
    snapshot = inspection_os_readiness_service.snapshot(records=payload.records)
    return {"ok": True, "home_id": current_user.get("home_id") or current_user.get("selected_home_id"), "snapshot": snapshot}