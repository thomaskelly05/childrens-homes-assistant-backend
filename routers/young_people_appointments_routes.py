from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_person_service import YoungPersonService

router = APIRouter(prefix="/young-people", tags=["Young People Appointments"])


def _safe_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
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
    model_config = ConfigDict(extra="ignore")

    title: str
    appointment_type: str | None = "general"
    appointment_date: str
    end_datetime: str | None = None
    location: str | None = None
    professional_name: str | None = None
    professional_role: str | None = None
    summary: str | None = None
    purpose: str | None = None
    child_voice: str | None = None
    preparation_notes: str | None = None
    outcome_notes: str | None = None
    follow_up_actions: str | None = None
    linked_plan_id: int | None = None
    linked_plan_ids: list[int] | None = None
    status: str | None = "scheduled"
    reminder_minutes_before: int | None = 30
    alert_enabled: bool | None = True
    created_by: int | None = None


class AppointmentUpdatePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = None
    appointment_type: str | None = None
    appointment_date: str | None = None
    end_datetime: str | None = None
    location: str | None = None
    professional_name: str | None = None
    professional_role: str | None = None
    summary: str | None = None
    purpose: str | None = None
    child_voice: str | None = None
    preparation_notes: str | None = None
    outcome_notes: str | None = None
    follow_up_actions: str | None = None
    linked_plan_id: int | None = None
    linked_plan_ids: list[int] | None = None
    status: str | None = None
    reminder_minutes_before: int | None = None
    alert_enabled: bool | None = None


class AppointmentStatusPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    review_note: str | None = None


@router.get("/{young_person_id}/appointments")
def list_young_person_appointments(
    young_person_id: int,
    status: str | None = Query(default=None),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    _load_and_check_young_person(young_person_id, current_user)

    try:
        where_sql = "WHERE a.young_person_id = %s"
        params: list[Any] = [young_person_id]

        if status:
            where_sql += " AND LOWER(COALESCE(a.status, 'scheduled')) = %s"
            params.append(str(status).strip().lower())

        with conn.cursor() as cur:
            cur.execute(
                f"""
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
                    a.summary,
                    a.purpose,
                    a.child_voice,
                    a.preparation_notes,
                    a.outcome_notes,
                    a.follow_up_actions,
                    a.linked_plan_id,
                    a.linked_plan_ids,
                    a.status,
                    a.reminder_minutes_before,
                    a.alert_enabled,
                    a.created_by,
                    a.created_at,
                    a.updated_at,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name,
                    sp.title AS linked_plan_title
                FROM young_person_appointments a
                LEFT JOIN users u
                  ON u.id = a.created_by
                LEFT JOIN support_plans sp
                  ON sp.id = a.linked_plan_id
                {where_sql}
                ORDER BY a.appointment_date ASC, a.id DESC
                """,
                params,
            )
            rows = cur.fetchall() or []

        items = []
        for row in rows:
            created_by_name = " ".join(
                [x for x in [row.get("created_by_first_name"), row.get("created_by_last_name")] if x]
            ).strip() or None

            items.append(
                {
                    "id": row.get("id"),
                    "young_person_id": row.get("young_person_id"),
                    "title": row.get("title"),
                    "appointment_type": row.get("appointment_type") or "general",
                    "appointment_date": row.get("appointment_date"),
                    "end_datetime": row.get("end_datetime"),
                    "location": row.get("location"),
                    "professional_name": row.get("professional_name"),
                    "professional_role": row.get("professional_role"),
                    "summary": row.get("summary"),
                    "purpose": row.get("purpose"),
                    "child_voice": row.get("child_voice"),
                    "preparation_notes": row.get("preparation_notes"),
                    "outcome_notes": row.get("outcome_notes"),
                    "follow_up_actions": row.get("follow_up_actions"),
                    "linked_plan_id": row.get("linked_plan_id"),
                    "linked_plan_ids": row.get("linked_plan_ids") or [],
                    "linked_plan_title": row.get("linked_plan_title"),
                    "status": row.get("status") or "scheduled",
                    "workflow_status": row.get("status") or "scheduled",
                    "record_type": "appointment",
                    "record_id": row.get("id"),
                    "recorded_at": row.get("appointment_date"),
                    "recorded_by_name": created_by_name,
                    "reminder_minutes_before": row.get("reminder_minutes_before"),
                    "alert_enabled": row.get("alert_enabled"),
                    "created_by": row.get("created_by"),
                    "created_at": row.get("created_at"),
                    "updated_at": row.get("updated_at"),
                }
            )

        return {
            "items": items,
            "count": len(items),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load appointments: {str(e)}")


@router.get("/appointments/{appointment_id}")
def get_appointment(
    appointment_id: int,
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
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
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    try:
        actor_user_id = _safe_int(current_user.get("user_id"))
        data = payload.model_dump(exclude_none=True)

        linked_plan_id = data.get("linked_plan_id")
        linked_plan_ids = data.get("linked_plan_ids") or ([] if linked_plan_id is None else [linked_plan_id])

        with conn.cursor() as cur:
            if linked_plan_id is not None:
                cur.execute(
                    """
                    SELECT
                        sp.id,
                        yp.home_id
                    FROM support_plans sp
                    JOIN young_people yp
                      ON yp.id = sp.young_person_id
                    WHERE sp.id = %s
                    LIMIT 1
                    """,
                    (linked_plan_id,),
                )
                plan_row = cur.fetchone()

                if not plan_row:
                    raise HTTPException(status_code=404, detail="Linked plan not found")

                _assert_home_access(current_user, _safe_int(plan_row.get("home_id")))

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
                    summary,
                    purpose,
                    child_voice,
                    preparation_notes,
                    outcome_notes,
                    follow_up_actions,
                    linked_plan_id,
                    linked_plan_ids,
                    status,
                    reminder_minutes_before,
                    alert_enabled,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, NOW(), NOW()
                )
                RETURNING *
                """,
                (
                    young_person_id,
                    data.get("title"),
                    data.get("appointment_type", "general"),
                    data.get("appointment_date"),
                    data.get("end_datetime"),
                    data.get("location"),
                    data.get("professional_name"),
                    data.get("professional_role"),
                    data.get("summary"),
                    data.get("purpose"),
                    data.get("child_voice"),
                    data.get("preparation_notes"),
                    data.get("outcome_notes"),
                    data.get("follow_up_actions"),
                    linked_plan_id,
                    linked_plan_ids,
                    data.get("status", "scheduled"),
                    data.get("reminder_minutes_before", 30),
                    bool(data.get("alert_enabled", True)),
                    data.get("created_by") or actor_user_id,
                ),
            )
            row = cur.fetchone()

            if linked_plan_ids:
                for plan_id in linked_plan_ids:
                    cur.execute(
                        """
                        INSERT INTO record_links (
                            young_person_id,
                            from_table,
                            from_id,
                            to_table,
                            to_id,
                            relationship_type,
                            created_by,
                            created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                        """,
                        (
                            young_person_id,
                            "young_person_appointments",
                            row["id"],
                            "support_plans",
                            plan_id,
                            "appointment_linked_to_plan",
                            data.get("created_by") or actor_user_id,
                        ),
                    )

        conn.commit()
        return {
            "ok": True,
            "appointment": dict(row) if row else None,
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create appointment: {str(e)}")


@router.patch("/appointments/{appointment_id}")
@router.put("/appointments/{appointment_id}")
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdatePayload,
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    _assert_can_edit(current_user)
    existing = _load_and_check_appointment(conn, appointment_id, current_user)

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    try:
        linked_plan_id = update_data.get("linked_plan_id", existing.get("linked_plan_id"))
        linked_plan_ids = update_data.get("linked_plan_ids", existing.get("linked_plan_ids") or [])

        if linked_plan_id is not None and not linked_plan_ids:
            linked_plan_ids = [linked_plan_id]

        with conn.cursor() as cur:
            if linked_plan_id is not None:
                cur.execute(
                    """
                    SELECT
                        sp.id,
                        yp.home_id
                    FROM support_plans sp
                    JOIN young_people yp
                      ON yp.id = sp.young_person_id
                    WHERE sp.id = %s
                    LIMIT 1
                    """,
                    (linked_plan_id,),
                )
                plan_row = cur.fetchone()

                if not plan_row:
                    raise HTTPException(status_code=404, detail="Linked plan not found")

                _assert_home_access(current_user, _safe_int(plan_row.get("home_id")))

            update_data["linked_plan_ids"] = linked_plan_ids
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
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update appointment: {str(e)}")


@router.post("/appointments/{appointment_id}/complete")
def complete_appointment(
    appointment_id: int,
    payload: AppointmentStatusPayload | None = None,
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    _assert_can_edit(current_user)
    _load_and_check_appointment(conn, appointment_id, current_user)

    try:
        review_note = payload.review_note if payload else None

        with conn.cursor() as cur:
            if review_note:
                cur.execute(
                    """
                    UPDATE young_person_appointments
                    SET
                        status = 'completed',
                        outcome_notes = COALESCE(outcome_notes, %s),
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                    """,
                    (review_note, appointment_id),
                )
            else:
                cur.execute(
                    """
                    UPDATE young_person_appointments
                    SET
                        status = 'completed',
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                    """,
                    (appointment_id,),
                )
            row = cur.fetchone()

        conn.commit()
        return {
            "ok": True,
            "appointment": dict(row) if row else None,
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to complete appointment: {str(e)}")


@router.post("/appointments/{appointment_id}/cancel")
def cancel_appointment(
    appointment_id: int,
    payload: AppointmentStatusPayload | None = None,
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    _assert_can_edit(current_user)
    _load_and_check_appointment(conn, appointment_id, current_user)

    try:
        review_note = payload.review_note if payload else None

        with conn.cursor() as cur:
            if review_note:
                cur.execute(
                    """
                    UPDATE young_person_appointments
                    SET
                        status = 'cancelled',
                        outcome_notes = COALESCE(outcome_notes, %s),
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                    """,
                    (review_note, appointment_id),
                )
            else:
                cur.execute(
                    """
                    UPDATE young_person_appointments
                    SET
                        status = 'cancelled',
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                    """,
                    (appointment_id,),
                )
            row = cur.fetchone()

        conn.commit()
        return {
            "ok": True,
            "appointment": dict(row) if row else None,
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to cancel appointment: {str(e)}")
