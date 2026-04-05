from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from services.os_sync_hooks import archive_after_status_change, sync_after_save


class YoungPersonAppointmentsService:
    # ---------------------------
    # Helpers
    # ---------------------------

    @staticmethod
    def _safe_datetime(value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value)
        except Exception:
            return None

    @staticmethod
    def _dict(row) -> dict[str, Any]:
        return dict(row) if row else {}

    @staticmethod
    def _run_os_sync_after_save(record: dict[str, Any] | None) -> None:
        if not record:
            return
        try:
            sync_after_save(
                source_table="appointments",
                record=record,
                recorded_by_name=None,
            )
        except Exception:
            # Keep the source record write successful even if OS sync fails.
            pass

    # ---------------------------
    # Core loaders
    # ---------------------------

    @staticmethod
    def ensure_young_person_exists(conn, young_person_id: int) -> dict[str, Any]:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, home_id FROM young_people WHERE id = %s LIMIT 1",
                (young_person_id,),
            )
            row = cur.fetchone()

        if not row:
            raise Exception("Young person not found")

        return dict(row)

    @staticmethod
    def fetch_appointment_by_id(conn, appointment_id: int) -> dict[str, Any]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT a.*, yp.home_id
                FROM appointments a
                JOIN young_people yp ON yp.id = a.young_person_id
                WHERE a.id = %s
                LIMIT 1
                """,
                (appointment_id,),
            )
            row = cur.fetchone()

        if not row:
            raise Exception("Appointment not found")

        return dict(row)

    # ---------------------------
    # List endpoints
    # ---------------------------

    @staticmethod
    def list_appointments_for_young_person(conn, *, young_person_id: int, archived: bool):
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM appointments
                WHERE young_person_id = %s
                  AND COALESCE(archived, false) = %s
                ORDER BY start_datetime DESC, id DESC
                """,
                (young_person_id, archived),
            )
            rows = cur.fetchall() or []

        return [dict(r) for r in rows]

    @staticmethod
    def list_upcoming_appointments(conn, *, young_person_id: int):
        now = datetime.utcnow()

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM appointments
                WHERE young_person_id = %s
                  AND start_datetime >= %s
                  AND status = 'scheduled'
                ORDER BY start_datetime ASC
                """,
                (young_person_id, now),
            )
            rows = cur.fetchall() or []

        return [dict(r) for r in rows]

    @staticmethod
    def list_due_alerts(conn, *, young_person_id: int):
        now = datetime.utcnow()

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM appointments
                WHERE young_person_id = %s
                  AND status = 'scheduled'
                  AND reminder_minutes_before IS NOT NULL
                """,
                (young_person_id,),
            )
            rows = cur.fetchall() or []

        alerts = []

        for row in rows:
            start = row.get("start_datetime")
            reminder = row.get("reminder_minutes_before")

            if not start or reminder is None:
                continue

            trigger_time = start - timedelta(minutes=int(reminder))

            if trigger_time <= now <= start:
                alerts.append(dict(row))

        return alerts

    @staticmethod
    def get_appointment(conn, appointment_id: int):
        return YoungPersonAppointmentsService.fetch_appointment_by_id(conn, appointment_id)

    # ---------------------------
    # Create
    # ---------------------------

    @staticmethod
    def create_appointment(
        conn,
        *,
        young_person_id: int,
        payload: dict,
        actor_user_id: int | None,
        linking_service,
    ):
        start_dt = YoungPersonAppointmentsService._safe_datetime(payload.get("start_datetime"))
        end_dt = YoungPersonAppointmentsService._safe_datetime(payload.get("end_datetime"))

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO appointments (
                    young_person_id,
                    title,
                    description,
                    appointment_type,
                    start_datetime,
                    end_datetime,
                    location,
                    linked_plan_id,
                    assigned_staff_id,
                    reminder_minutes_before,
                    status,
                    outcome,
                    notes,
                    created_by,
                    archived,
                    created_at,
                    updated_at
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, NOW(), NOW())
                RETURNING *
                """,
                (
                    young_person_id,
                    payload.get("title"),
                    payload.get("description"),
                    payload.get("appointment_type"),
                    start_dt,
                    end_dt,
                    payload.get("location"),
                    payload.get("linked_plan_id"),
                    payload.get("assigned_staff_id"),
                    payload.get("reminder_minutes_before"),
                    payload.get("status", "scheduled"),
                    payload.get("outcome"),
                    payload.get("notes"),
                    actor_user_id,
                    payload.get("archived", False),
                ),
            )
            row = cur.fetchone()

        conn.commit()

        # 🔗 Link to plan if exists
        if row and row.get("linked_plan_id"):
            linking_service.link_record(
                conn=conn,
                source_table="appointments",
                source_id=row["id"],
                target_table="support_plans",
                target_id=row["linked_plan_id"],
                reason="appointment_linked_to_plan",
                created_by=actor_user_id,
            )

        appointment = dict(row) if row else None
        YoungPersonAppointmentsService._run_os_sync_after_save(appointment)

        return {"ok": True, "appointment": appointment}

    # ---------------------------
    # Update
    # ---------------------------

    @staticmethod
    def update_appointment(conn, *, appointment_id: int, payload: dict):
        fields = []
        values = []

        for key, value in payload.items():
            if key in {"start_datetime", "end_datetime"}:
                value = YoungPersonAppointmentsService._safe_datetime(value)

            fields.append(f"{key} = %s")
            values.append(value)

        if not fields:
            return {"ok": True}

        values.append(appointment_id)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE appointments
                SET {', '.join(fields)}, updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                values,
            )
            row = cur.fetchone()

        conn.commit()

        appointment = dict(row) if row else None
        YoungPersonAppointmentsService._run_os_sync_after_save(appointment)

        return {"ok": True, "appointment": appointment}

    # ---------------------------
    # Status changes
    # ---------------------------

    @staticmethod
    def _set_status(conn, appointment_id: int, status: str, outcome: str | None):
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE appointments
                SET status = %s,
                    outcome = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (status, outcome, appointment_id),
            )
            row = cur.fetchone()

        conn.commit()

        appointment = dict(row) if row else None
        YoungPersonAppointmentsService._run_os_sync_after_save(appointment)

        return {"ok": True, "appointment": appointment}

    @staticmethod
    def complete_appointment(conn, *, appointment_id: int, actor_user_id: int | None, outcome: str | None, linking_service):
        return YoungPersonAppointmentsService._set_status(conn, appointment_id, "completed", outcome)

    @staticmethod
    def mark_appointment_missed(conn, *, appointment_id: int, actor_user_id: int | None, outcome: str | None, linking_service):
        return YoungPersonAppointmentsService._set_status(conn, appointment_id, "missed", outcome)

    @staticmethod
    def cancel_appointment(conn, *, appointment_id: int, actor_user_id: int | None, outcome: str | None, linking_service):
        return YoungPersonAppointmentsService._set_status(conn, appointment_id, "cancelled", outcome)

    @staticmethod
    def archive_appointment(conn, *, appointment_id: int, actor_user_id: int | None, linking_service):
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE appointments
                SET archived = true, updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (appointment_id,),
            )
            row = cur.fetchone()

        conn.commit()

        appointment = dict(row) if row else None

        try:
            if appointment:
                archive_after_status_change(
                    young_person_id=appointment["young_person_id"],
                    source_table="appointments",
                    source_id=appointment["id"],
                )
        except Exception:
            pass

        return {"ok": True, "appointment": appointment}
