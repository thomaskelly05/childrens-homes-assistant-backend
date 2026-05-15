from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

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


@router.get("/readiness")
def inspection_readiness(current_user: dict[str, Any] = Depends(_require_manager)):
    home_id = current_user.get("home_id") or current_user.get("selected_home_id")
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
