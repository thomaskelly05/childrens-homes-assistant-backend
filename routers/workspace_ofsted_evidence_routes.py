from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import get_current_user
from services.ofsted_evidence_engine_service import OfstedEvidenceEngineService
from services.workspace_orchestrator_service import WorkspaceOrchestratorService

router = APIRouter(prefix="/workspace/ofsted-evidence", tags=["workspace-ofsted-evidence"])

workspace_service = WorkspaceOrchestratorService()
evidence_service = OfstedEvidenceEngineService()


def _safe_int(value: Any) -> int | None:
    try:
        parsed = int(value)
        return parsed if parsed > 0 else None
    except Exception:
        return None


def _current_home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id"))


@router.get("/home")
def get_current_home_ofsted_evidence(
    days: int = 90,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    home_id = _current_home_id(current_user)
    if not home_id:
        raise HTTPException(status_code=400, detail="No home context available for current user")
    workspace = workspace_service.home_workspace(home_id=home_id, current_user=current_user, days=days)
    return evidence_service.build_home_evidence(workspace)


@router.get("/home/{home_id}")
def get_home_ofsted_evidence(
    home_id: int,
    days: int = 90,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    workspace = workspace_service.home_workspace(home_id=home_id, current_user=current_user, days=days)
    return evidence_service.build_home_evidence(workspace)


@router.get("/child/{young_person_id}")
def get_child_ofsted_evidence(
    young_person_id: int,
    days: int = 90,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    workspace = workspace_service.child_workspace(young_person_id=young_person_id, current_user=current_user, days=days)
    return evidence_service.build_child_evidence(workspace)
