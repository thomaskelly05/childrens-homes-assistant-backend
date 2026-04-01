from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_person_service import YoungPersonService

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


def _load_and_check_young_person(
    young_person_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    record = YoungPersonService.get_young_person_by_id(young_person_id)
    if not record:
        raise HTTPException(status_code=404, detail="Young person not found")

    _assert_home_access(current_user, _safe_int(record.get("home_id")))
    return record


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

    _assert_home_access(current_user, _safe_int(row.get("home_id")))
    return dict(row)


class AppointmentCreatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str
    appointment_type: str | None = "general"
    appointment_date: str
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
    model_config = ConfigDict(populate_by_name=True)

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


class AppointmentDecisionPayload(BaseModel):
    review_note: str | None = None


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
                    a.completed_at,
                    a.cancelled_at,
                    a.created_at,
                    a.updated_at
                FROM young_person_appointments a
                WHERE a.young_person_id = %s
                ORDER BY a.appointment_date ASC, a.id DESC
                """,
                (young_person_id,),
            )
            rows = cur.fetchall() or []

        return {
            "items": [dict(row) for row in rows],
            "count": len(rows),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load appointments: {str(e)}")


@router.get("/appointments/{appointment_id}")
def get_appointment(
    appointment_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        row = _load_and_check_appointment(conn, appointment_id, current_user)
        return {
            "ok": True,
            "appointment": row,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load appointment: {str(e)}")


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
        actor_user_id = _safe_int(current_user.get("user_id"))

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
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
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
                    payload.reminder_minutes_before or 30,
                    payload.status or "scheduled",
                    actor_user_id,
                ),
            )
            row = cur.fetchone()

        conn.commit()
        return {
            "ok": True,
            "appointment": dict(row) if row else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create appointment: {str(e)}")


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

    try:
        update_data = payload.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        update_data["updated_at"] = "NOW()"

        set_parts: list[str] = []
        values: list[Any] = []

        for field, value in update_data.items():
            if field == "updated_at":
                set_parts.append("updated_at = NOW()")
            else:
                set_parts.append(f"{field} = %s")
                values.append(value)

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
        return {
            "ok": True,
            "appointment": dict(row),
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update appointment: {str(e)}")


@router.post("/appointments/{appointment_id}/complete")
def complete_appointment(
    appointment_id: int,
    payload: AppointmentDecisionPayload | None = None,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_appointment(conn, appointment_id, current_user)

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE young_person_appointments
                SET
                    status = 'completed',
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (appointment_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Appointment not found")

        conn.commit()
        return {
            "ok": True,
            "appointment": dict(row),
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to complete appointment: {str(e)}")


@router.post("/appointments/{appointment_id}/cancel")
def cancel_appointment(
    appointment_id: int,
    payload: AppointmentDecisionPayload | None = None,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_appointment(conn, appointment_id, current_user)

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE young_person_appointments
                SET
                    status = 'cancelled',
                    cancelled_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (appointment_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Appointment not found")

        conn.commit()
        return {
            "ok": True,
            "appointment": dict(row),
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to cancel appointment: {str(e)}")
