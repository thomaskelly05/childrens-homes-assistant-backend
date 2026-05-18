from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from auth.current_user import get_current_user
from db.connection import get_db
from services.workforce_journey_service import WorkforceJourneyService


router = APIRouter(prefix="/api/workforce-os", tags=["Workforce Journey OS"])
service = WorkforceJourneyService()


class SupervisionActionPayload(BaseModel):
    title: str
    status: str | None = "open"
    priority: str | None = "medium"
    due_date: str | None = None


class SupervisionCreatePayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    staff_id: int | None = None
    home_id: int | None = None
    title: str | None = "Staff supervision"
    status: str | None = Field(default="draft", pattern="^(draft|submitted)$")
    reflection: str | None = None
    notes: str | None = None
    reflective_prompts: list[str] | None = None
    linked_incident_ids: list[int] | None = None
    linked_training_need_ids: list[int] | None = None
    linked_wellbeing_signal_ids: list[int] | None = None
    linked_practice_concern_ids: list[int] | None = None
    actions: list[SupervisionActionPayload] | None = None


class SupervisionReturnPayload(BaseModel):
    return_note: str | None = None


@router.get("/feature-flags")
def workforce_feature_flags(current_user: dict[str, Any] = Depends(get_current_user)):
    return {"ok": True, "feature_flags": service.feature_flags()}


@router.get("/navigation")
def workforce_navigation(current_user: dict[str, Any] = Depends(get_current_user)):
    return {"ok": True, "navigation": service.navigation()}


@router.get("/dashboard")
def workforce_dashboard(conn=Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)):
    return {"ok": True, "data": service.dashboard(conn, current_user=current_user)}


@router.get("/staff")
def workforce_staff(conn=Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)):
    return {"ok": True, "data": service.list_staff(conn, current_user=current_user)}


@router.get("/staff/{staff_id}/profile")
def workforce_staff_profile(staff_id: int, conn=Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)):
    return {"ok": True, "data": service.staff_profile(conn, staff_id=staff_id, current_user=current_user)}


@router.get("/training-matrix")
def workforce_training_matrix(staff_id: int | None = None, conn=Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)):
    return {"ok": True, "data": service.training_matrix(conn, current_user=current_user, staff_id=staff_id)}


@router.get("/induction")
def workforce_induction(staff_id: int | None = None, conn=Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)):
    return {"ok": True, "data": service.induction(conn, current_user=current_user, staff_id=staff_id)}


@router.get("/probation")
def workforce_probation(staff_id: int | None = None, conn=Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)):
    return {"ok": True, "data": service.probation(conn, current_user=current_user, staff_id=staff_id)}


@router.get("/evidence")
def workforce_evidence(conn=Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)):
    return {"ok": True, "data": service.evidence(conn, current_user=current_user)}


@router.get("/supervision")
def workforce_supervision(staff_id: int | None = None, conn=Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)):
    return {"ok": True, "data": service.list_supervision(conn, current_user=current_user, staff_id=staff_id)}


@router.post("/supervision")
def create_workforce_supervision(payload: SupervisionCreatePayload, conn=Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)):
    return {"ok": True, "data": service.create_supervision(conn, payload=payload.model_dump(), current_user=current_user)}


@router.post("/supervision/{supervision_id}/submit")
def submit_workforce_supervision(supervision_id: int, conn=Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)):
    result = service.transition_supervision(conn, supervision_id=supervision_id, transition="submit", current_user=current_user)
    if not result.get("record"):
        raise HTTPException(status_code=404, detail="Supervision record not found.")
    return {"ok": True, "data": result}


@router.post("/supervision/{supervision_id}/review")
def review_workforce_supervision(supervision_id: int, conn=Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)):
    result = service.transition_supervision(conn, supervision_id=supervision_id, transition="review", current_user=current_user)
    if not result.get("record"):
        raise HTTPException(status_code=404, detail="Supervision record not found.")
    return {"ok": True, "data": result}


@router.post("/supervision/{supervision_id}/return")
def return_workforce_supervision(supervision_id: int, payload: SupervisionReturnPayload, conn=Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)):
    result = service.transition_supervision(conn, supervision_id=supervision_id, transition="return", return_note=payload.return_note, current_user=current_user)
    if not result.get("record"):
        raise HTTPException(status_code=404, detail="Supervision record not found.")
    return {"ok": True, "data": result}


@router.post("/supervision/{supervision_id}/archive")
def archive_workforce_supervision(supervision_id: int, conn=Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)):
    result = service.transition_supervision(conn, supervision_id=supervision_id, transition="archive", current_user=current_user)
    if not result.get("record"):
        raise HTTPException(status_code=404, detail="Supervision record not found.")
    return {"ok": True, "data": result}
