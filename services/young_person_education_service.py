from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException

from services.os_sync_hooks import sync_after_save


class YoungPersonEducationService:
    @staticmethod
    def now_utc() -> datetime:
        return datetime.utcnow()

    @staticmethod
    def _meaningful_text(value: Any) -> str | None:
        text = str(value or "").strip()
        if not text:
            return None

        normalised = text.lower().strip().rstrip(".")
        if normalised in {"none", "no", "n/a", "na", "nil", "nothing", "not applicable"}:
            return None

        return text

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
    def transform_education_record(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row.get("id"),
            "young_person_id": row.get("young_person_id"),
            "home_id": row.get("home_id"),
            "record_date": row.get("record_date"),
            "occurred_at": row.get("record_date") or row.get("created_at"),
            "attendance_status": row.get("attendance_status"),
            "provision_name": row.get("provision_name"),
            "behaviour_summary": row.get("behaviour_summary"),
            "learning_engagement": row.get("learning_engagement"),
            "issue_raised": row.get("issue_raised"),
            "action_taken": row.get("action_taken"),
            "professional_involved": row.get("professional_involved"),
            "achievement_note": row.get("achievement_note"),
            "created_by": row.get("created_by"),
            "created_by_name": YoungPersonEducationService.full_name(
                row.get("created_by_first_name"),
                row.get("created_by_last_name"),
            ),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
            "title": row.get("provision_name") or "Education record",
            "summary": row.get("achievement_note") or row.get("behaviour_summary") or "Education update",
            "narrative": row.get("achievement_note") or row.get("behaviour_summary") or "Education update",
            "event_type": "education",
            "workflow_status": "recorded",
            "quality_standards": ["education"],
            "judgement_areas": ["experiences_and_progress"],
        }

    @staticmethod
    def _run_os_sync_after_education_record_save(
        conn,
        *,
        record_id: int,
    ) -> None:
        try:
            row = YoungPersonEducationService.get_education_record_row(conn, record_id)
            record = YoungPersonEducationService.transform_education_record(row)
            sync_after_save(
                source_table="education_records",
                record=record,
                recorded_by_name=record.get("created_by_name"),
            )
        except Exception:
            pass

    @staticmethod
    def get_education_bundle(conn, young_person_id: int) -> dict[str, Any]:
        YoungPersonEducationService.ensure_young_person_exists(conn, young_person_id)

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM young_person_education_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )
            education_profile = cur.fetchone()

            cur.execute(
                """
                SELECT
                    er.id,
                    er.young_person_id,
                    yp.home_id,
                    er.record_date,
                    er.attendance_status,
                    er.provision_name,
                    er.behaviour_summary,
                    er.learning_engagement,
                    er.issue_raised,
                    er.action_taken,
                    er.professional_involved,
                    er.achievement_note,
                    er.created_by,
                    er.created_at,
                    er.updated_at,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM education_records er
                INNER JOIN young_people yp ON yp.id = er.young_person_id
                LEFT JOIN users u ON er.created_by = u.id
                WHERE er.young_person_id = %s
                ORDER BY er.record_date DESC NULLS LAST, er.created_at DESC, er.id DESC
                """,
                (young_person_id,),
            )
            records = cur.fetchall() or []

        transformed = [YoungPersonEducationService.transform_education_record(r) for r in records]

        return {
            "profile": education_profile or {},
            "education_profile": education_profile or {},
            "education_records": transformed,
            "items": transformed,
        }

    @staticmethod
    def get_education_record_row(conn, record_id: int) -> dict[str, Any]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    er.*,
                    yp.home_id,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM education_records er
                INNER JOIN young_people yp ON yp.id = er.young_person_id
                LEFT JOIN users u ON er.created_by = u.id
                WHERE er.id = %s
                LIMIT 1
                """,
                (record_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Education record not found")

        return row

    @staticmethod
    def get_education_record(conn, record_id: int) -> dict[str, Any]:
        row = YoungPersonEducationService.get_education_record_row(conn, record_id)
        return YoungPersonEducationService.transform_education_record(row)

    @staticmethod
    def upsert_education_profile(conn, *, young_person_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        YoungPersonEducationService.ensure_young_person_exists(conn, young_person_id)
        now = YoungPersonEducationService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM young_person_education_profile
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
                    UPDATE young_person_education_profile
                    SET
                        school_name = %s,
                        year_group = %s,
                        education_status = %s,
                        sen_status = %s,
                        ehcp_details = %s,
                        designated_teacher = %s,
                        attendance_baseline = %s,
                        pep_status = %s,
                        support_summary = %s,
                        updated_at = %s
                    WHERE id = %s
                    RETURNING *
                    """,
                    (
                        payload.get("school_name"),
                        payload.get("year_group"),
                        payload.get("education_status"),
                        payload.get("sen_status"),
                        payload.get("ehcp_details"),
                        payload.get("designated_teacher"),
                        payload.get("attendance_baseline"),
                        payload.get("pep_status"),
                        payload.get("support_summary"),
                        now,
                        existing["id"],
                    ),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO young_person_education_profile (
                        young_person_id,
                        school_name,
                        year_group,
                        education_status,
                        sen_status,
                        ehcp_details,
                        designated_teacher,
                        attendance_baseline,
                        pep_status,
                        support_summary,
                        created_at,
                        updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        young_person_id,
                        payload.get("school_name"),
                        payload.get("year_group"),
                        payload.get("education_status"),
                        payload.get("sen_status"),
                        payload.get("ehcp_details"),
                        payload.get("designated_teacher"),
                        payload.get("attendance_baseline"),
                        payload.get("pep_status"),
                        payload.get("support_summary"),
                        now,
                        now,
                    ),
                )

            row = cur.fetchone()

        conn.commit()
        return row

    @staticmethod
    def create_education_record(
        conn,
        *,
        young_person_id: int,
        payload: dict[str, Any],
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        now = YoungPersonEducationService.now_utc()
        YoungPersonEducationService.ensure_young_person_exists(conn, young_person_id)

        issue_raised = YoungPersonEducationService._meaningful_text(payload.get("issue_raised"))
        action_taken = YoungPersonEducationService._meaningful_text(payload.get("action_taken"))

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO education_records (
                    young_person_id,
                    record_date,
                    attendance_status,
                    provision_name,
                    behaviour_summary,
                    learning_engagement,
                    issue_raised,
                    action_taken,
                    professional_involved,
                    achievement_note,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    young_person_id,
                    payload.get("record_date"),
                    payload.get("attendance_status"),
                    payload.get("provision_name"),
                    payload.get("behaviour_summary"),
                    payload.get("learning_engagement"),
                    payload.get("issue_raised"),
                    payload.get("action_taken"),
                    payload.get("professional_involved"),
                    payload.get("achievement_note"),
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
                source_table="education_records",
                source_id=record_id,
                event_type="created",
                title=payload.get("provision_name") or "Education record",
                summary=payload.get("achievement_note") or payload.get("behaviour_summary") or "Education update",
                narrative=payload.get("achievement_note") or payload.get("behaviour_summary") or "Education update",
                category="education",
                subcategory=payload.get("attendance_status") or "general",
                significance="medium",
                due_date=payload.get("record_date"),
                owner_id=payload.get("created_by") or actor_user_id,
                created_by=payload.get("created_by") or actor_user_id,
                workflow={
                    "link_chronology": True,
                    "create_task": bool(issue_raised or action_taken),
                    "manager_review": False,
                    "safeguarding": False,
                    "link_support_plans": True,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": "medium",
                    "workflow_status": payload.get("workflow_status") or payload.get("status") or "recorded",
                    "quality_standards": ["education"],
                    "standards_rationale": "Linked from education workflow",
                    "evidence_strength": "medium",
                    "response_actions": action_taken,
                    "judgement_areas": ["experiences_and_progress"],
                },
            )

        conn.commit()
        YoungPersonEducationService._run_os_sync_after_education_record_save(conn, record_id=record_id)

        return {
            "message": "Education record created successfully",
            "id": record_id,
            "workflow": workflow_result,
        }

    @staticmethod
    def update_education_record(conn, *, record_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        update_data = dict(payload)

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided")

        update_data["updated_at"] = YoungPersonEducationService.now_utc()

        set_parts = []
        values = []
        for field, value in update_data.items():
            set_parts.append(f"{field} = %s")
            values.append(value)

        values.append(record_id)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE education_records
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Record not found")

        conn.commit()
        YoungPersonEducationService._run_os_sync_after_education_record_save(conn, record_id=record_id)

        return {"message": "Education record updated successfully", "id": row["id"]}
