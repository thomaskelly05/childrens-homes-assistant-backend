from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_people_linking_service import YoungPeopleLinkingService
from services.young_person_risk_service import YoungPersonRiskService

router = APIRouter(prefix="/young-people", tags=["Young People Risk"])


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def _user_home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id"))


def _user_role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower()


def _assert_home_access(current_user: dict[str, Any], record_home_id: int | None) -> None:
    role = _user_role(current_user)
    user_home_id = _user_home_id(current_user)

    if role in {"admin", "provider_admin"}:
        return

    if record_home_id is None:
        raise HTTPException(status_code=403, detail="Home access could not be verified")

    if user_home_id != record_home_id:
        raise HTTPException(status_code=403, detail="You do not have access to this young person")


def _assert_can_edit(current_user: dict[str, Any]) -> None:
    role = _user_role(current_user)
    if role not in {"admin", "provider_admin", "manager", "staff"}:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this record")


def _assert_can_review(current_user: dict[str, Any]) -> None:
    role = _user_role(current_user)
    if role not in {"admin", "provider_admin", "manager"}:
        raise HTTPException(status_code=403, detail="You do not have permission to review this record")


def _load_and_check_young_person(conn, young_person_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    person = YoungPersonRiskService.ensure_young_person_exists(conn, young_person_id)
    _assert_home_access(current_user, _safe_int(person.get("home_id")))
    return person


def _load_and_check_risk(conn, risk_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    row = YoungPersonRiskService.fetch_risk_by_id(conn, risk_id)
    _assert_home_access(current_user, _safe_int(row.get("home_id")))
    return row


def _link_risk_update(conn, *, risk_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    risk = YoungPersonRiskService.get_risk(conn, risk_id)
    severity = str(risk.get("severity") or "medium")
    workflow = YoungPeopleLinkingService.process_record_event(
        conn=conn,
        young_person_id=int(risk["young_person_id"]),
        source_table="risk_assessments",
        source_id=risk_id,
        event_type="updated",
        title=f"{risk.get('title') or 'Risk assessment'} updated",
        summary=risk.get("summary") or risk.get("concern_summary") or "Risk assessment updated",
        narrative="\n".join(
            str(value)
            for value in [
                risk.get("concern_summary"),
                risk.get("known_triggers"),
                risk.get("early_warning_signs"),
                risk.get("contextual_factors"),
                risk.get("current_controls"),
                risk.get("deescalation_strategies"),
                risk.get("response_actions"),
                risk.get("child_views"),
            ]
            if value
        ) or "Risk assessment updated",
        category="risk",
        subcategory=risk.get("category") or "general",
        significance=severity,
        review_date=risk.get("review_date"),
        due_date=risk.get("review_date"),
        owner_id=risk.get("owner_id"),
        created_by=_safe_int(current_user.get("user_id") or current_user.get("id")),
        workflow={
            "link_chronology": True,
            "create_task": bool(risk.get("review_date")),
            "manager_review": True,
            "safeguarding": severity in {"high", "critical"},
            "link_support_plans": True,
            "link_monthly_reviews": True,
            "link_quality_standards": True,
        },
        metadata={
            "severity": severity,
            "workflow_status": risk.get("workflow_status") or risk.get("approval_status") or risk.get("status"),
            "quality_standards": ["protection_of_children"],
            "standards_rationale": "Risk assessment updated and linked for review",
            "evidence_strength": "strong",
            "response_actions": risk.get("response_actions"),
            "judgement_areas": ["helped_and_protected"],
        },
    )
    conn.commit()
    return workflow


class RiskAssessmentCreatePayload(BaseModel):
    category: str
    title: str
    concern_summary: str | None = None
    known_triggers: str | None = None
    early_warning_signs: str | None = None
    contextual_factors: str | None = None
    current_controls: str | None = None
    deescalation_strategies: str | None = None
    response_actions: str | None = None
    child_views: str | None = None
    severity: str | None = "medium"
    likelihood: str | None = "medium"
    review_date: str | None = None
    status: str | None = "active"
    owner_id: int | None = None
    approval_status: str | None = "not_required"
    created_by: int | None = None
    archived: bool | None = False


class RiskAssessmentUpdatePayload(BaseModel):
    category: str | None = None
    title: str | None = None
    concern_summary: str | None = None
    known_triggers: str | None = None
    early_warning_signs: str | None = None
    contextual_factors: str | None = None
    current_controls: str | None = None
    deescalation_strategies: str | None = None
    response_actions: str | None = None
    child_views: str | None = None
    severity: str | None = None
    likelihood: str | None = None
    review_date: str | None = None
    status: str | None = None
    owner_id: int | None = None
    approval_status: str | None = None
    created_by: int | None = None
    archived: bool | None = None


class RiskReviewPayload(BaseModel):
    review_note: str | None = None
    approved_by: int | None = None


@router.get("/{young_person_id}/risk")
def list_risk(young_person_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _load_and_check_young_person(conn, young_person_id, current_user)
    rows = YoungPersonRiskService.list_risk_for_young_person(conn, young_person_id=young_person_id, archived=False)
    return {"items": rows, "count": len(rows)}


@router.get("/{young_person_id}/risk/archive")
def list_archived_risk(young_person_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _load_and_check_young_person(conn, young_person_id, current_user)
    rows = YoungPersonRiskService.list_risk_for_young_person(conn, young_person_id=young_person_id, archived=True)
    return {"items": rows, "count": len(rows)}


@router.get("/risk/{risk_id}")
def get_risk_assessment(risk_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _load_and_check_risk(conn, risk_id, current_user)
    return YoungPersonRiskService.get_risk(conn, risk_id)


@router.post("/{young_person_id}/risk")
def create_risk_assessment(young_person_id: int, payload: RiskAssessmentCreatePayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)
    return YoungPersonRiskService.create_risk_assessment(conn, young_person_id=young_person_id, payload=payload.model_dump(exclude_none=True), actor_user_id=_safe_int(current_user.get("user_id")), linking_service=YoungPeopleLinkingService)


@router.patch("/risk/{risk_id}")
@router.put("/risk/{risk_id}")
def update_risk_assessment(risk_id: int, payload: RiskAssessmentUpdatePayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_risk(conn, risk_id, current_user)
    result = YoungPersonRiskService.update_risk_assessment(conn, risk_id=risk_id, payload=payload.model_dump(exclude_unset=True))
    workflow = _link_risk_update(conn, risk_id=risk_id, current_user=current_user)
    return {**result, "workflow": workflow}


@router.post("/risk/{risk_id}/submit")
@router.put("/risk/{risk_id}/submit")
def submit_risk_assessment(risk_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_risk(conn, risk_id, current_user)
    return YoungPersonRiskService.submit_risk_assessment(conn, risk_id=risk_id, actor_user_id=_safe_int(current_user.get("user_id")), linking_service=YoungPeopleLinkingService)


@router.post("/risk/{risk_id}/approve")
@router.put("/risk/{risk_id}/approve")
def approve_risk_assessment(risk_id: int, payload: RiskReviewPayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_review(current_user)
    _load_and_check_risk(conn, risk_id, current_user)
    approved_by = payload.approved_by or _safe_int(current_user.get("user_id"))
    return YoungPersonRiskService.approve_risk_assessment(conn, risk_id=risk_id, approved_by=approved_by, review_note=payload.review_note, linking_service=YoungPeopleLinkingService)


@router.post("/risk/{risk_id}/return")
@router.put("/risk/{risk_id}/return")
def return_risk_assessment(risk_id: int, payload: RiskReviewPayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_review(current_user)
    _load_and_check_risk(conn, risk_id, current_user)
    return YoungPersonRiskService.return_risk_assessment(conn, risk_id=risk_id, actor_user_id=_safe_int(current_user.get("user_id")), review_note=payload.review_note, linking_service=YoungPeopleLinkingService)


@router.post("/risk/{risk_id}/archive")
@router.put("/risk/{risk_id}/archive")
def archive_risk_assessment(risk_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_review(current_user)
    _load_and_check_risk(conn, risk_id, current_user)
    return YoungPersonRiskService.archive_risk_assessment(conn, risk_id=risk_id, actor_user_id=_safe_int(current_user.get("user_id")), linking_service=YoungPeopleLinkingService)
