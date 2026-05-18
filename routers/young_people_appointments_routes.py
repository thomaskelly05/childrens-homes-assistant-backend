from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.current_user import get_current_user
from db.connection import get_db
from services.os_sync_hooks import sync_after_save
from services.workflow_response import gold_standard_response
from services.young_people_linking_service import YoungPeopleLinkingService
from services.young_person_service import YoungPersonService

router = APIRouter(prefix="/young-people", tags=["Young People Appointments"])


class AppointmentCreatePayload(BaseModel):
    title: str
    appointment_type: str | None = "general"
    appointment_date: str | None = None
    end_datetime: str | None = None
    location: str | None = None
    professional_name: str | None = None
    professional_role: str | None = None
    linked_plan_id: int | None = None
    summary: str | None = None
    purpose: str | None = None
    child_voice: str | None = None
    preparation_notes: str | None = None
    outcome_notes: str | None = None
    follow_up_actions: str | None = None
    reminder_minutes_before: int | None = 30
    status: str | None = "scheduled"


class AppointmentUpdatePayload(BaseModel):
    title: str | None = None
    appointment_type: str | None = None
    appointment_date: str | None = None
    end_datetime: str | None = None
    location: str | None = None
    professional_name: str | None = None
    professional_role: str | None = None
    linked_plan_id: int | None = None
    summary: str | None = None
    purpose: str | None = None
    child_voice: str | None = None
    preparation_notes: str | None = None
    outcome_notes: str | None = None
    follow_up_actions: str | None = None
    reminder_minutes_before: int | None = None
    status: str | None = None


class AppointmentReviewPayload(BaseModel):
    review_note: str | None = None


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


def _actor_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("user_id") or current_user.get("id"))


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


def _load_and_check_young_person(
    young_person_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    record = YoungPersonService.get_young_person_by_id(young_person_id)
    if not record:
        raise HTTPException(status_code=404, detail="Young person not found")

    _assert_home_access(current_user, _safe_int(record.get("home_id")))
    return record


def _shape_appointment(row: dict[str, Any]) -> dict[str, Any]:
    item = dict(row or {})
    item["record_type"] = "appointment"
    item["recorded_at"] = item.get("appointment_date") or item.get("created_at")
    item.setdefault("workflow_status", item.get("status") or "scheduled")
    return item


def _load_and_check_appointment(
    conn,
    appointment_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                a.*,
                yp.home_id
            FROM young_person_appointments a
            JOIN young_people yp
              ON yp.id = a.young_person_id
            WHERE a.id = %s
            LIMIT 1
            """,
            (appointment_id,),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Appointment not found")

    item = _shape_appointment(dict(row))
    _assert_home_access(current_user, _safe_int(item.get("home_id")))
    return item


def _link_appointment_event(conn, *, item: dict[str, Any], event_type: str, current_user: dict[str, Any]) -> dict[str, Any]:
    status = str(item.get("status") or "scheduled").lower()
    review_required = status in {"submitted", "returned", "cancelled", "archived"} or bool(item.get("follow_up_actions"))
    workflow = YoungPeopleLinkingService.process_record_event(
        conn=conn,
        young_person_id=int(item["young_person_id"]),
        source_table="young_person_appointments",
        source_id=int(item["id"]),
        event_type=event_type,
        title=f"Appointment {event_type}: {item.get('title') or 'Appointment'}",
        summary=item.get("summary") or item.get("purpose") or item.get("outcome_notes") or f"Appointment {event_type}",
        narrative="\n".join(
            str(value)
            for value in [
                item.get("title"),
                item.get("purpose"),
                item.get("child_voice"),
                item.get("preparation_notes"),
                item.get("outcome_notes"),
                item.get("follow_up_actions"),
            ]
            if value
        ) or f"Appointment {event_type}",
        category="appointment",
        subcategory=item.get("appointment_type") or "general",
        significance="medium" if not review_required else "high",
        due_date=item.get("appointment_date"),
        owner_id=item.get("created_by"),
        created_by=_actor_id(current_user),
        workflow={
            "link_chronology": True,
            "create_task": bool(item.get("follow_up_actions")),
            "manager_review": review_required,
            "safeguarding": False,
            "link_support_plans": bool(item.get("linked_plan_id")),
            "link_monthly_reviews": True,
            "link_quality_standards": True,
        },
        metadata={
            "appointment_type": item.get("appointment_type"),
            "appointment_status": status,
            "professional_name": item.get("professional_name"),
            "professional_role": item.get("professional_role"),
            "quality_standards": ["reg_10_health_and_wellbeing"],
            "standards_rationale": "Linked from young person appointment workflow",
            "evidence_strength": "medium" if not review_required else "high",
        },
    )
    conn.commit()
    return workflow


def _sync_appointment(item: dict[str, Any]) -> dict[str, Any]:
    try:
        ok = sync_after_save("young_person_appointments", item)
        return {"attempted": True, "ok": bool(ok), "source_table": "young_person_appointments"}
    except Exception as error:
        return {"attempted": True, "ok": False, "source_table": "young_person_appointments", "error": str(error)}


def _appointment_response(
    *,
    item: dict[str, Any],
    workflow: dict[str, Any] | None = None,
    sync: dict[str, Any] | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    return gold_standard_response(
        id=item.get("id"),
        item=item,
        message=message,
        workflow=workflow or {},
        sync=sync or {},
        appointment=item,
    )


def _update_appointment_status(conn, appointment_id: int, status: str) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE young_person_appointments
            SET status = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (status, appointment_id),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Appointment not found")

    conn.commit()
    return _shape_appointment(dict(row))


@router.get("/{young_person_id}/appointments")
def list_appointments(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    a.id,
                    a.young_person_id,
                    a.title,
                    a.appointment_type,
                    a.appointment_date,
                    a.end_datetime,
                    a.location,
                    a.professional_name,
                    a.professional_role,
                    a.linked_plan_id,
                    a.summary,
                    a.purpose,
                    a.child_voice,
                    a.preparation_notes,
                    a.outcome_notes,
                    a.follow_up_actions,
                    a.reminder_minutes_before,
                    a.status,
                    a.created_by,
                    a.created_at,
                    a.updated_at
                FROM young_person_appointments a
                WHERE a.young_person_id = %s
                  AND COALESCE(a.status, 'scheduled') <> 'archived'
                ORDER BY a.appointment_date ASC NULLS LAST, a.id DESC
                """,
                (young_person_id,),
            )
            rows = cur.fetchall() or []

        items = [_shape_appointment(dict(row)) for row in rows]
        return {"items": items, "count": len(items)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load appointments: {str(e)}")


@router.get("/{young_person_id}/appointments/archive")
def list_archived_appointments(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT a.*
                FROM young_person_appointments a
                WHERE a.young_person_id = %s
                  AND COALESCE(a.status, '') = 'archived'
                ORDER BY a.updated_at DESC NULLS LAST, a.id DESC
                """,
                (young_person_id,),
            )
            rows = cur.fetchall() or []

        items = [_shape_appointment(dict(row)) for row in rows]
        return {"items": items, "count": len(items)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load archived appointments: {str(e)}")


@router.post("/{young_person_id}/appointments")
def create_appointment(
    young_person_id: int,
    payload: AppointmentCreatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    try:
        actor_user_id = _actor_id(current_user)

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO young_person_appointments (
                    young_person_id,
                    title,
                    appointment_type,
                    appointment_date,
                    end_datetime,
                    location,
                    professional_name,
                    professional_role,
                    linked_plan_id,
                    summary,
                    purpose,
                    child_voice,
                    preparation_notes,
                    outcome_notes,
                    follow_up_actions,
                    reminder_minutes_before,
                    status,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                )
                RETURNING *
                """,
                (
                    young_person_id,
                    payload.title,
                    payload.appointment_type or "general",
                    payload.appointment_date,
                    payload.end_datetime,
                    payload.location,
                    payload.professional_name,
                    payload.professional_role,
                    payload.linked_plan_id,
                    payload.summary,
                    payload.purpose,
                    payload.child_voice,
                    payload.preparation_notes,
                    payload.outcome_notes,
                    payload.follow_up_actions,
                    payload.reminder_minutes_before,
                    payload.status or "scheduled",
                    actor_user_id,
                ),
            )
            row = cur.fetchone()

        conn.commit()
        appointment = _shape_appointment(dict(row) if row else {})
        workflow = _link_appointment_event(conn, item=appointment, event_type="created", current_user=current_user)
        sync = _sync_appointment(appointment)
        return _appointment_response(item=appointment, workflow=workflow, sync=sync, message="Appointment created")

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create appointment: {str(e)}")


@router.get("/appointments/{appointment_id}")
def get_appointment(
    appointment_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        row = _load_and_check_appointment(conn, appointment_id, current_user)
        return _appointment_response(item=row, message="Appointment loaded")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load appointment: {str(e)}")


@router.patch("/appointments/{appointment_id}")
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_appointment(conn, appointment_id, current_user)

    try:
        updates = payload.model_dump(exclude_unset=True)
        if not updates:
            raise HTTPException(status_code=400, detail="No changes provided")

        set_parts: list[str] = []
        values: list[Any] = []

        for field, value in updates.items():
            set_parts.append(f"{field} = %s")
            values.append(value)

        set_parts.append("updated_at = NOW()")
        values.append(appointment_id)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE young_person_appointments
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING *
                """,
                values,
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Appointment not found")

        conn.commit()
        appointment = _shape_appointment(dict(row))
        workflow = _link_appointment_event(conn, item=appointment, event_type="updated", current_user=current_user)
        sync = _sync_appointment(appointment)
        return _appointment_response(item=appointment, workflow=workflow, sync=sync, message="Appointment updated")

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update appointment: {str(e)}")


@router.post("/appointments/{appointment_id}/submit")
@router.put("/appointments/{appointment_id}/submit")
def submit_appointment(
    appointment_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_appointment(conn, appointment_id, current_user)
    appointment = _update_appointment_status(conn, appointment_id, "submitted")
    workflow = _link_appointment_event(conn, item=appointment, event_type="submitted", current_user=current_user)
    sync = _sync_appointment(appointment)
    return _appointment_response(item=appointment, workflow=workflow, sync=sync, message="Appointment submitted")


@router.post("/appointments/{appointment_id}/approve")
@router.put("/appointments/{appointment_id}/approve")
def approve_appointment(
    appointment_id: int,
    payload: AppointmentReviewPayload | None = None,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_appointment(conn, appointment_id, current_user)
    appointment = _update_appointment_status(conn, appointment_id, "approved")
    workflow = _link_appointment_event(conn, item=appointment, event_type="approved", current_user=current_user)
    sync = _sync_appointment(appointment)
    return _appointment_response(item=appointment, workflow=workflow, sync=sync, message="Appointment approved")


@router.post("/appointments/{appointment_id}/return")
@router.put("/appointments/{appointment_id}/return")
def return_appointment(
    appointment_id: int,
    payload: AppointmentReviewPayload | None = None,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_appointment(conn, appointment_id, current_user)
    appointment = _update_appointment_status(conn, appointment_id, "returned")
    workflow = _link_appointment_event(conn, item=appointment, event_type="returned", current_user=current_user)
    sync = _sync_appointment(appointment)
    return _appointment_response(item=appointment, workflow=workflow, sync=sync, message="Appointment returned")


@router.post("/appointments/{appointment_id}/archive")
@router.put("/appointments/{appointment_id}/archive")
def archive_appointment(
    appointment_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_appointment(conn, appointment_id, current_user)
    appointment = _update_appointment_status(conn, appointment_id, "archived")
    workflow = _link_appointment_event(conn, item=appointment, event_type="archived", current_user=current_user)
    sync = _sync_appointment(appointment)
    return _appointment_response(item=appointment, workflow=workflow, sync=sync, message="Appointment archived")


@router.post("/appointments/{appointment_id}/complete")
def complete_appointment(
    appointment_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_appointment(conn, appointment_id, current_user)
    appointment = _update_appointment_status(conn, appointment_id, "completed")
    workflow = _link_appointment_event(conn, item=appointment, event_type="completed", current_user=current_user)
    sync = _sync_appointment(appointment)
    return _appointment_response(item=appointment, workflow=workflow, sync=sync, message="Appointment completed")


@router.post("/appointments/{appointment_id}/cancel")
def cancel_appointment(
    appointment_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_appointment(conn, appointment_id, current_user)
    appointment = _update_appointment_status(conn, appointment_id, "cancelled")
    workflow = _link_appointment_event(conn, item=appointment, event_type="cancelled", current_user=current_user)
    sync = _sync_appointment(appointment)
    return _appointment_response(item=appointment, workflow=workflow, sync=sync, message="Appointment cancelled")
