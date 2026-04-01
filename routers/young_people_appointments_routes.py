from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_people_linking_service import YoungPeopleLinkingService
from services.young_person_appointments_service import YoungPersonAppointmentsService

router = APIRouter(prefix="/young-people", tags=["Young People Appointments"])


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
    person = YoungPersonAppointmentsService.ensure_young_person_exists(conn, young_person_id)
    _assert_home_access(current_user, _safe_int(person.get("home_id")))
    return person


def _load_and_check_appointment(conn, appointment_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    row = YoungPersonAppointmentsService.fetch_appointment_by_id(conn, appointment_id)
    _assert_home_access(current_user, _safe_int(row.get("home_id")))
    return row


class AppointmentCreatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str
    description: str | None = None
    appointment_type: str | None = "general"
    start_datetime: str
    end_datetime: str | None = None
    location: str | None = None
    linked_plan_id: int | None = None
    assigned_staff_id: int | None = None
    reminder_minutes_before: int | None = 15
    status: str | None = "scheduled"
    outcome: str | None = None
    notes: str | None = None
    created_by: int | None = None
    archived: bool | None = False


class AppointmentUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str | None = None
    description: str | None = None
    appointment_type: str | None = None
    start_datetime: str | None = None
    end_datetime: str | None = None
    location: str | None = None
    linked_plan_id: int | None = None
    assigned_staff_id: int | None = None
    reminder_minutes_before: int | None = None
    status: str | None = None
    outcome: str | None = None
    notes: str | None = None
    created_by: int | None = None
    archived: bool | None = None


class AppointmentDecisionPayload(BaseModel):
    review_note: str | None = None


@router.get("/{young_person_id}/appointments")
def list_appointments(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(conn, young_person_id, current_user)
    rows = YoungPersonAppointmentsService.list_appointments_for_young_person(
        conn,
        young_person_id=young_person_id,
        archived=False,
    )
    return {"items": rows, "count": len(rows)}


@router.get("/{young_person_id}/appointments/archive")
def list_archived_appointments(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(conn, young_person_id, current_user)
    rows = YoungPersonAppointmentsService.list_appointments_for_young_person(
        conn,
        young_person_id=young_person_id,
        archived=True,
    )
    return {"items": rows, "count": len(rows)}


@router.get("/{young_person_id}/appointments/upcoming")
def list_upcoming_appointments(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(conn, young_person_id, current_user)
    rows = YoungPersonAppointmentsService.list_upcoming_appointments(
        conn,
        young_person_id=young_person_id,
    )
    return {"items": rows, "count": len(rows)}


@router.get("/{young_person_id}/appointments/alerts")
def list_due_appointment_alerts(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(conn, young_person_id, current_user)
    rows = YoungPersonAppointmentsService.list_due_alerts(
        conn,
        young_person_id=young_person_id,
    )
    return {"items": rows, "count": len(rows)}


@router.get("/appointments/{appointment_id}")
def get_appointment(
    appointment_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_appointment(conn, appointment_id, current_user)
    return YoungPersonAppointmentsService.get_appointment(conn, appointment_id)


@router.post("/{young_person_id}/appointments")
def create_appointment(
    young_person_id: int,
    payload: AppointmentCreatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)

    return YoungPersonAppointmentsService.create_appointment(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(exclude_none=True),
        actor_user_id=_safe_int(current_user.get("user_id")),
        linking_service=YoungPeopleLinkingService,
    )


@router.patch("/appointments/{appointment_id}")
@router.put("/appointments/{appointment_id}")
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_appointment(conn, appointment_id, current_user)

    return YoungPersonAppointmentsService.update_appointment(
        conn,
        appointment_id=appointment_id,
        payload=payload.model_dump(exclude_unset=True),
    )


@router.post("/appointments/{appointment_id}/complete")
def complete_appointment(
    appointment_id: int,
    payload: AppointmentDecisionPayload | None = None,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_appointment(conn, appointment_id, current_user)

    return YoungPersonAppointmentsService.complete_appointment(
        conn,
        appointment_id=appointment_id,
        actor_user_id=_safe_int(current_user.get("user_id")),
        outcome=(payload.review_note if payload else None),
        linking_service=YoungPeopleLinkingService,
    )


@router.post("/appointments/{appointment_id}/missed")
def mark_appointment_missed(
    appointment_id: int,
    payload: AppointmentDecisionPayload | None = None,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_appointment(conn, appointment_id, current_user)

    return YoungPersonAppointmentsService.mark_appointment_missed(
        conn,
        appointment_id=appointment_id,
        actor_user_id=_safe_int(current_user.get("user_id")),
        outcome=(payload.review_note if payload else None),
        linking_service=YoungPeopleLinkingService,
    )


@router.post("/appointments/{appointment_id}/cancel")
def cancel_appointment(
    appointment_id: int,
    payload: AppointmentDecisionPayload | None = None,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_appointment(conn, appointment_id, current_user)

    return YoungPersonAppointmentsService.cancel_appointment(
        conn,
        appointment_id=appointment_id,
        actor_user_id=_safe_int(current_user.get("user_id")),
        outcome=(payload.review_note if payload else None),
        linking_service=YoungPeopleLinkingService,
    )


@router.post("/appointments/{appointment_id}/archive")
def archive_appointment(
    appointment_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_appointment(conn, appointment_id, current_user)

    return YoungPersonAppointmentsService.archive_appointment(
        conn,
        appointment_id=appointment_id,
        actor_user_id=_safe_int(current_user.get("user_id")),
        linking_service=YoungPeopleLinkingService,
    )
