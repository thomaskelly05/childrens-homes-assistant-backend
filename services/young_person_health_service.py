from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException

from services.os_sync_hooks import sync_after_save


class YoungPersonHealthService:
    @staticmethod
    def now_utc() -> datetime:
        return datetime.utcnow()

    @staticmethod
    def ensure_young_person_exists(conn, young_person_id: int) -> dict[str, Any]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, home_id, first_name, last_name
                FROM young_people
                WHERE id = %s
                LIMIT 1
                """,
                (young_person_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Young person not found")
            return row

    @staticmethod
    def full_name(first_name: str | None, last_name: str | None) -> str | None:
        return " ".join([x for x in [first_name, last_name] if x]).strip() or None

    @staticmethod
    def transform_health_record(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row.get("id"),
            "young_person_id": row.get("young_person_id"),
            "record_type": row.get("record_type"),
            "title": row.get("title") or "Health record",
            "summary": row.get("summary"),
            "professional_name": row.get("professional_name"),
            "outcome": row.get("outcome"),
            "follow_up_required": row.get("follow_up_required"),
            "next_action_date": row.get("next_action_date"),
            "event_datetime": row.get("event_datetime"),
            "created_by": row.get("created_by"),
            "created_by_name": YoungPersonHealthService.full_name(
                row.get("created_by_first_name"),
                row.get("created_by_last_name"),
            ),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
            "event_type": "health",
            "narrative": row.get("summary") or row.get("outcome") or "Health record",
            "occurred_at": row.get("event_datetime") or row.get("created_at"),
            "workflow_status": "recorded",
            "quality_standards": ["health_and_wellbeing"],
            "judgement_areas": ["experiences_and_progress"],
        }

    @staticmethod
    def transform_medication_profile(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row.get("id"),
            "young_person_id": row.get("young_person_id"),
            "medication_name": row.get("medication_name"),
            "dosage": row.get("dosage"),
            "route": row.get("route"),
            "frequency": row.get("frequency"),
            "prn_guidance": row.get("prn_guidance"),
            "prescribed_by": row.get("prescribed_by"),
            "start_date": row.get("start_date"),
            "end_date": row.get("end_date"),
            "is_active": row.get("is_active"),
            "notes": row.get("notes"),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        }

    @staticmethod
    def transform_medication_record(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row.get("id"),
            "young_person_id": row.get("young_person_id"),
            "medication_profile_id": row.get("medication_profile_id"),
            "medication_name": row.get("medication_name"),
            "dose": row.get("dose"),
            "route": row.get("route"),
            "status": row.get("status"),
            "refusal_reason": row.get("refusal_reason"),
            "omission_reason": row.get("omission_reason"),
            "error_flag": row.get("error_flag"),
            "error_details": row.get("error_details"),
            "manager_review_status": row.get("manager_review_status"),
            "scheduled_time": row.get("scheduled_time"),
            "administered_time": row.get("administered_time"),
            "administered_by": row.get("administered_by"),
            "administered_by_name": YoungPersonHealthService.full_name(
                row.get("administered_by_first_name"),
                row.get("administered_by_last_name"),
            ),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        }

    @staticmethod
    def _run_os_sync_after_health_record_save(
        conn,
        *,
        record_id: int,
    ) -> None:
        try:
            row = YoungPersonHealthService.get_health_record(conn, record_id)
            record = YoungPersonHealthService.transform_health_record(row)
            sync_after_save(
                source_table="health_records",
                record=record,
                recorded_by_name=record.get("created_by_name"),
            )
        except Exception:
            # Keep the source record write successful even if OS sync fails.
            pass

    @staticmethod
    def get_health_bundle(conn, young_person_id: int) -> dict[str, Any]:
        YoungPersonHealthService.ensure_young_person_exists(conn, young_person_id)

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM young_person_health_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )
            health_profile = cur.fetchone()

            cur.execute(
                """
                SELECT
                    hr.id,
                    hr.young_person_id,
                    hr.record_type,
                    hr.title,
                    hr.summary,
                    hr.professional_name,
                    hr.outcome,
                    hr.follow_up_required,
                    hr.next_action_date,
                    hr.event_datetime,
                    hr.created_by,
                    hr.created_at,
                    hr.updated_at,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM health_records hr
                LEFT JOIN users u ON hr.created_by = u.id
                WHERE hr.young_person_id = %s
                ORDER BY COALESCE(hr.event_datetime, hr.created_at) DESC, hr.id DESC
                """,
                (young_person_id,),
            )
            health_records = cur.fetchall() or []

            cur.execute(
                """
                SELECT *
                FROM medication_profiles
                WHERE young_person_id = %s
                ORDER BY is_active DESC, start_date DESC NULLS LAST, id DESC
                """,
                (young_person_id,),
            )
            medication_profiles = cur.fetchall() or []

            cur.execute(
                """
                SELECT
                    mr.id,
                    mr.young_person_id,
                    mr.medication_profile_id,
                    mr.medication_name,
                    mr.dose,
                    mr.route,
                    mr.status,
                    mr.refusal_reason,
                    mr.omission_reason,
                    mr.error_flag,
                    mr.error_details,
                    mr.manager_review_status,
                    mr.scheduled_time,
                    mr.administered_time,
                    mr.administered_by,
                    mr.created_at,
                    mr.updated_at,
                    u.first_name AS administered_by_first_name,
                    u.last_name AS administered_by_last_name
                FROM medication_records mr
                LEFT JOIN users u ON mr.administered_by = u.id
                WHERE mr.young_person_id = %s
                ORDER BY COALESCE(mr.scheduled_time, mr.created_at) DESC, mr.id DESC
                """,
                (young_person_id,),
            )
            medication_records = cur.fetchall() or []

        return {
            "profile": health_profile or {},
            "health_profile": health_profile or {},
            "health_records": [YoungPersonHealthService.transform_health_record(r) for r in health_records],
            "medication_profiles": [YoungPersonHealthService.transform_medication_profile(r) for r in medication_profiles],
            "medication_records": [YoungPersonHealthService.transform_medication_record(r) for r in medication_records],
            "items": [YoungPersonHealthService.transform_health_record(r) for r in health_records],
        }

    @staticmethod
    def get_health_record(conn, record_id: int) -> dict[str, Any]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    hr.id,
                    hr.young_person_id,
                    yp.home_id,
                    hr.record_type,
                    hr.title,
                    hr.summary,
                    hr.professional_name,
                    hr.outcome,
                    hr.follow_up_required,
                    hr.next_action_date,
                    hr.event_datetime,
                    hr.created_by,
                    hr.created_at,
                    hr.updated_at,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM health_records hr
                INNER JOIN young_people yp ON yp.id = hr.young_person_id
                LEFT JOIN users u ON hr.created_by = u.id
                WHERE hr.id = %s
                LIMIT 1
                """,
                (record_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Health record not found")

        return row

    @staticmethod
    def get_medication_profile(conn, profile_id: int) -> dict[str, Any]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT mp.*, yp.home_id
                FROM medication_profiles mp
                INNER JOIN young_people yp ON yp.id = mp.young_person_id
                WHERE mp.id = %s
                LIMIT 1
                """,
                (profile_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Medication profile not found")

        return row

    @staticmethod
    def get_medication_record(conn, record_id: int) -> dict[str, Any]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    mr.id,
                    mr.young_person_id,
                    yp.home_id,
                    mr.medication_profile_id,
                    mr.medication_name,
                    mr.dose,
                    mr.route,
                    mr.status,
                    mr.refusal_reason,
                    mr.omission_reason,
                    mr.error_flag,
                    mr.error_details,
                    mr.manager_review_status,
                    mr.scheduled_time,
                    mr.administered_time,
                    mr.administered_by,
                    mr.created_at,
                    mr.updated_at,
                    u.first_name AS administered_by_first_name,
                    u.last_name AS administered_by_last_name
                FROM medication_records mr
                INNER JOIN young_people yp ON yp.id = mr.young_person_id
                LEFT JOIN users u ON mr.administered_by = u.id
                WHERE mr.id = %s
                LIMIT 1
                """,
                (record_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Medication record not found")

        return row

    @staticmethod
    def upsert_health_profile(conn, *, young_person_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        YoungPersonHealthService.ensure_young_person_exists(conn, young_person_id)

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM young_person_health_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )
            existing = cur.fetchone()

            if existing:
                cur.execute(
                    """
                    UPDATE young_person_health_profile
                    SET
                        gp_name = %s,
                        gp_contact = %s,
                        dentist_name = %s,
                        dentist_contact = %s,
                        optician_name = %s,
                        optician_contact = %s,
                        allergies = %s,
                        diagnoses = %s,
                        mental_health_summary = %s,
                        medication_summary = %s,
                        consent_notes = %s,
                        updated_at = %s
                    WHERE id = %s
                    RETURNING *
                    """,
                    (
                        payload.get("gp_name"),
                        payload.get("gp_contact"),
                        payload.get("dentist_name"),
                        payload.get("dentist_contact"),
                        payload.get("optician_name"),
                        payload.get("optician_contact"),
                        payload.get("allergies"),
                        payload.get("diagnoses"),
                        payload.get("mental_health_summary"),
                        payload.get("medication_summary"),
                        payload.get("consent_notes"),
                        YoungPersonHealthService.now_utc(),
                        existing["id"],
                    ),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO young_person_health_profile (
                        young_person_id,
                        gp_name,
                        gp_contact,
                        dentist_name,
                        dentist_contact,
                        optician_name,
                        optician_contact,
                        allergies,
                        diagnoses,
                        mental_health_summary,
                        medication_summary,
                        consent_notes,
                        created_at,
                        updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        young_person_id,
                        payload.get("gp_name"),
                        payload.get("gp_contact"),
                        payload.get("dentist_name"),
                        payload.get("dentist_contact"),
                        payload.get("optician_name"),
                        payload.get("optician_contact"),
                        payload.get("allergies"),
                        payload.get("diagnoses"),
                        payload.get("mental_health_summary"),
                        payload.get("medication_summary"),
                        payload.get("consent_notes"),
                        YoungPersonHealthService.now_utc(),
                        YoungPersonHealthService.now_utc(),
                    ),
                )

            row = cur.fetchone()

        conn.commit()
        return row

    @staticmethod
    def create_health_record(
        conn,
        *,
        young_person_id: int,
        payload: dict[str, Any],
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        now = YoungPersonHealthService.now_utc()
        YoungPersonHealthService.ensure_young_person_exists(conn, young_person_id)

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO health_records (
                    young_person_id,
                    record_type,
                    event_datetime,
                    title,
                    summary,
                    professional_name,
                    outcome,
                    follow_up_required,
                    next_action_date,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    young_person_id,
                    payload.get("record_type"),
                    payload.get("event_datetime"),
                    payload.get("title"),
                    payload.get("summary"),
                    payload.get("professional_name"),
                    payload.get("outcome"),
                    payload.get("follow_up_required"),
                    payload.get("next_action_date"),
                    payload.get("created_by") or actor_user_id,
                    now,
                    now,
                ),
            )
            created = cur.fetchone()
            record_id = created["id"]

            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=young_person_id,
                source_table="health_records",
                source_id=record_id,
                event_type="created",
                title=payload.get("title") or "Health record",
                summary=payload.get("summary") or payload.get("outcome") or "Health record recorded",
                narrative=payload.get("summary") or payload.get("outcome") or "Health record recorded",
                category="health",
                subcategory=payload.get("record_type") or "general",
                significance="medium",
                due_date=payload.get("next_action_date"),
                owner_id=payload.get("created_by") or actor_user_id,
                created_by=payload.get("created_by") or actor_user_id,
                workflow={
                    "link_chronology": True,
                    "create_task": bool(payload.get("follow_up_required") or payload.get("next_action_date")),
                    "manager_review": False,
                    "safeguarding": False,
                    "link_support_plans": True,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": "medium",
                    "workflow_status": "recorded",
                    "quality_standards": ["health_and_wellbeing"],
                    "standards_rationale": "Linked from health workflow",
                    "evidence_strength": "medium",
                    "response_actions": payload.get("outcome"),
                    "judgement_areas": ["experiences_and_progress"],
                },
            )

        conn.commit()
        YoungPersonHealthService._run_os_sync_after_health_record_save(conn, record_id=record_id)

        return {
            "message": "Health record created successfully",
            "id": record_id,
            "workflow": workflow_result,
        }

    @staticmethod
    def update_health_record(conn, *, record_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        update_data = dict(payload)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        update_data["updated_at"] = YoungPersonHealthService.now_utc()

        set_parts = []
        values = []
        for field, value in update_data.items():
            set_parts.append(f"{field} = %s")
            values.append(value)

        values.append(record_id)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE health_records
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Health record not found")

        conn.commit()
        YoungPersonHealthService._run_os_sync_after_health_record_save(conn, record_id=record_id)

        return {"message": "Health record updated successfully", "id": row["id"]}

    @staticmethod
    def create_medication_profile(conn, *, young_person_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        now = YoungPersonHealthService.now_utc()
        YoungPersonHealthService.ensure_young_person_exists(conn, young_person_id)

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO medication_profiles (
                    young_person_id,
                    medication_name,
                    dosage,
                    route,
                    frequency,
                    prn_guidance,
                    prescribed_by,
                    start_date,
                    end_date,
                    is_active,
                    notes,
                    created_at,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    young_person_id,
                    payload.get("medication_name"),
                    payload.get("dosage"),
                    payload.get("route"),
                    payload.get("frequency"),
                    payload.get("prn_guidance"),
                    payload.get("prescribed_by"),
                    payload.get("start_date"),
                    payload.get("end_date"),
                    payload.get("is_active", True),
                    payload.get("notes"),
                    now,
                    now,
                ),
            )
            row = cur.fetchone()

        conn.commit()
        return {"message": "Medication profile created successfully", "id": row["id"]}

    @staticmethod
    def update_medication_profile(conn, *, profile_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        update_data = dict(payload)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        update_data["updated_at"] = YoungPersonHealthService.now_utc()

        set_parts = []
        values = []
        for field, value in update_data.items():
            set_parts.append(f"{field} = %s")
            values.append(value)

        values.append(profile_id)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE medication_profiles
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Medication profile not found")

        conn.commit()
        return {"message": "Medication profile updated successfully", "id": row["id"]}

    @staticmethod
    def create_medication_record(conn, *, young_person_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        now = YoungPersonHealthService.now_utc()
        YoungPersonHealthService.ensure_young_person_exists(conn, young_person_id)

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO medication_records (
                    young_person_id,
                    medication_profile_id,
                    scheduled_time,
                    administered_time,
                    medication_name,
                    dose,
                    route,
                    status,
                    refusal_reason,
                    omission_reason,
                    error_flag,
                    error_details,
                    manager_review_status,
                    administered_by,
                    created_at,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    young_person_id,
                    payload.get("medication_profile_id"),
                    payload.get("scheduled_time"),
                    payload.get("administered_time"),
                    payload.get("medication_name"),
                    payload.get("dose"),
                    payload.get("route"),
                    payload.get("status"),
                    payload.get("refusal_reason"),
                    payload.get("omission_reason"),
                    payload.get("error_flag", False),
                    payload.get("error_details"),
                    payload.get("manager_review_status"),
                    payload.get("administered_by"),
                    now,
                    now,
                ),
            )
            row = cur.fetchone()

        conn.commit()
        return {"message": "Medication record created successfully", "id": row["id"]}

    @staticmethod
    def update_medication_record(conn, *, record_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        update_data = dict(payload)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        update_data["updated_at"] = YoungPersonHealthService.now_utc()

        set_parts = []
        values = []
        for field, value in update_data.items():
            set_parts.append(f"{field} = %s")
            values.append(value)

        values.append(record_id)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE medication_records
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Medication record not found")

        conn.commit()
        return {"message": "Medication record updated successfully", "id": row["id"]}
