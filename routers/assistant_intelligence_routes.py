from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import get_current_user
from services.assistant_intelligence_service import AssistantIntelligenceService

router = APIRouter(prefix="/assistant/intelligence", tags=["assistant-intelligence"])

service = AssistantIntelligenceService()


def _safe_int(value: Any) -> int | None:
    try:
        parsed = int(value)
        return parsed if parsed > 0 else None
    except Exception:
        return None


def _current_home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id"))


@router.get("/home")
def current_home_inspection_brief(
    days: int = 90,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    home_id = _current_home_id(current_user)
    if not home_id:
        raise HTTPException(status_code=400, detail="No home context available")
    return service.home_inspection_brief(home_id=home_id, current_user=current_user, days=days)


@router.get("/home/{home_id}")
def home_inspection_brief(
    home_id: int,
    days: int = 90,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.home_inspection_brief(home_id=home_id, current_user=current_user, days=days)


@router.get("/child/{young_person_id}")
def child_inspection_brief(
    young_person_id: int,
    days: int = 90,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.child_inspection_brief(young_person_id=young_person_id, current_user=current_user, days=days)


@router.get("/reg45")
def current_home_reg45_draft(
    days: int = 180,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    home_id = _current_home_id(current_user)
    if not home_id:
        raise HTTPException(status_code=400, detail="No home context available")
    return service.reg45_draft(home_id=home_id, current_user=current_user, days=days)


@router.get("/reg45/{home_id}")
def reg45_draft(
    home_id: int,
    days: int = 180,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.reg45_draft(home_id=home_id, current_user=current_user, days=days)
