from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from auth.current_user import get_current_user
from db.connection import get_db
from services.workflow_response import gold_standard_response, sync_not_observed
from services.young_people_linking_service import YoungPeopleLinkingService
from services.young_person_incidents_service import YoungPersonIncidentsService

router = APIRouter(prefix="/young-people", tags=["Young People Incidents"])


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
    person = YoungPersonIncidentsService.ensure_young_person_exists(conn, young_person_id)
    _assert_home_access(current_user, _safe_int(person.get("home_id")))
    return person


def _load_and_check_incident(conn, incident_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    row, _ = YoungPersonIncidentsService.fetch_incident_by_id(conn, incident_id)
    _assert_home_access(current_user, _safe_int(row.get("home_id")))
    return row


def _incident_gold_response(
    conn,
    *,
    incident_id: int,
    result: dict[str, Any] | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    result = result or {}
    item = YoungPersonIncidentsService.get_incident(conn, incident_id)
    return gold_standard_response(
        id=incident_id,
        item=item,
        message=message or result.get("message"),
        workflow=result.get("workflow") or {},
        sync=result.get("sync") or sync_not_observed(),
        intelligence=result.get("intelligence"),
        incident=item,
        legacy=result,
    )


class IncidentCreatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    incident_datetime: str | None = None
    occurred_at: str | None = Field(default=None, alias="occurred_at")
    incident_type: str = "other"
    severity: str | None = "medium"
    risk_level: str | None = None
    location: str | None = None
    description: str | None = None
    narrative: str | None = None
    manager_review_status: str | None = "draft"
    workflow_status: str | None = None
    follow_up_required: str | None = None
    outcome: str | None = None
    staff_id: int | None = None
    archived: bool | None = False

    antecedent: str | None = None
    presentation: str | None = None
    staff_response: str | None = None
    trauma_informed_formulation: str | None = None
    child_voice: str | None = None
    restorative_follow_up: str | None = None
    manager_review_comment: str | None = None

    physical_intervention_used: bool | None = False
    physical_intervention_type: str | None = None
    physical_intervention_duration_minutes: int | None = None
    physical_intervention_reason: str | None = None

    body_map_required: bool | None = False
    body_map_json: dict | None = None

    external_notification_required: bool | None = False
    external_notification_details: str | None = None


class IncidentUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    incident_datetime: str | None = None
    occurred_at: str | None = Field(default=None, alias="occurred_at")
    incident_type: str | None = None
    severity: str | None = None
    risk_level: str | None = None
    location: str | None = None
    description: str | None = None
    narrative: str | None = None
    manager_review_status: str | None = None
    workflow_status: str | None = None
    follow_up_required: str | None = None
    outcome: str | None = None
    staff_id: int | None = None
    archived: bool | None = None

    antecedent: str | None = None
    presentation: str | None = None
    staff_response: str | None = None
    trauma_informed_formulation: str | None = None
    child_voice: str | None = None
    restorative_follow_up: str | None = None
    manager_review_comment: str | None = None

    physical_intervention_used: bool | None = None
    physical_intervention_type: str | None = None
    physical_intervention_duration_minutes: int | None = None
    physical_intervention_reason: str | None = None

    body_map_required: bool | None = None
    body_map_json: dict | None = None

    external_notification_required: bool | None = None
    external_notification_details: str | None = None


class IncidentReviewPayload(BaseModel):
    review_note: str | None = None
    approved_by: int | None = None


@router.get("/{young_person_id}/incidents")
def list_incidents(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(conn, young_person_id, current_user)
    rows = YoungPersonIncidentsService.list_incidents_for_young_person(
        conn,
        young_person_id=young_person_id,
        archived=False,
    )
    return {"items": rows, "count": len(rows)}


@router.get("/{young_person_id}/incidents/archive")
def list_archived_incidents(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(conn, young_person_id, current_user)
    rows = YoungPersonIncidentsService.list_incidents_for_young_person(
        conn,
        young_person_id=young_person_id,
        archived=True,
    )
    return {"items": rows, "count": len(rows)}


@router.get("/incidents/{incident_id}")
def get_incident(
    incident_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_incident(conn, incident_id, current_user)
    return YoungPersonIncidentsService.get_incident(conn, incident_id)


@router.post("/{young_person_id}/incidents")
def create_incident(
    young_person_id: int,
    payload: IncidentCreatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)

    result = YoungPersonIncidentsService.create_incident(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(exclude_none=True, by_alias=False),
        actor_user_id=_safe_int(current_user.get("user_id")),
        linking_service=YoungPeopleLinkingService,
    )
    incident_id = _safe_int(result.get("id") if isinstance(result, dict) else None)
    if not incident_id:
        return result
    return _incident_gold_response(conn, incident_id=incident_id, result=result, message="Incident created")


@router.patch("/incidents/{incident_id}")
def update_incident(
    incident_id: int,
    payload: IncidentUpdatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_incident(conn, incident_id, current_user)

    result = YoungPersonIncidentsService.update_incident(
        conn,
        incident_id=incident_id,
        payload=payload.model_dump(exclude_unset=True, by_alias=False),
    )
    return _incident_gold_response(conn, incident_id=incident_id, result=result, message="Incident updated")


@router.post("/incidents/{incident_id}/submit")
def submit_incident(
    incident_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_incident(conn, incident_id, current_user)

    result = YoungPersonIncidentsService.submit_incident(
        conn,
        incident_id=incident_id,
        actor_user_id=_safe_int(current_user.get("user_id")),
        linking_service=YoungPeopleLinkingService,
    )
    return _incident_gold_response(conn, incident_id=incident_id, result=result, message="Incident submitted")


@router.post("/incidents/{incident_id}/approve")
def approve_incident(
    incident_id: int,
    payload: IncidentReviewPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_incident(conn, incident_id, current_user)

    approved_by = payload.approved_by or _safe_int(current_user.get("user_id"))

    result = YoungPersonIncidentsService.approve_incident(
        conn,
        incident_id=incident_id,
        approved_by=approved_by,
        review_note=payload.review_note,
        linking_service=YoungPeopleLinkingService,
    )
    return _incident_gold_response(conn, incident_id=incident_id, result=result, message="Incident approved")


@router.post("/incidents/{incident_id}/return")
def return_incident(
    incident_id: int,
    payload: IncidentReviewPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_incident(conn, incident_id, current_user)

    result = YoungPersonIncidentsService.return_incident(
        conn,
        incident_id=incident_id,
        actor_user_id=_safe_int(current_user.get("user_id")),
        review_note=payload.review_note,
        linking_service=YoungPeopleLinkingService,
    )
    return _incident_gold_response(conn, incident_id=incident_id, result=result, message="Incident returned")


@router.post("/incidents/{incident_id}/archive")
def archive_incident(
    incident_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_incident(conn, incident_id, current_user)

    result = YoungPersonIncidentsService.archive_incident(
        conn,
        incident_id=incident_id,
        actor_user_id=_safe_int(current_user.get("user_id")),
        linking_service=YoungPeopleLinkingService,
    )
    return _incident_gold_response(conn, incident_id=incident_id, result=result, message="Incident archived")


@router.get("/incidents/{incident_id}/export")
def export_incident(
    incident_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_incident(conn, incident_id, current_user)
    return YoungPersonIncidentsService.export_incident(conn, incident_id)
