from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException

from services.os_sync_hooks import archive_after_status_change, sync_after_save


class YoungPersonKeyworkService:
    VALID_STATUSES = {"draft", "submitted", "approved", "returned", "archived"}

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
    def normalise_status(value: str | None) -> str:
        v = (value or "").strip().lower()
        if v in YoungPersonKeyworkService.VALID_STATUSES:
            return v
        return "draft"

    @staticmethod
    def full_name(first_name: str | None, last_name: str | None) -> str | None:
        return " ".join([x for x in [first_name, last_name] if x]).strip() or None

    @staticmethod
    def transform_keywork_row(row: dict[str, Any]) -> dict[str, Any]:
        status = YoungPersonKeyworkService.normalise_status(row.get("status"))

        return {
            "id": row.get("id"),
            "young_person_id": row.get("young_person_id"),
            "home_id": row.get("home_id"),
            "session_date": row.get("session_date"),
            "worker_id": row.get("worker_id"),
            "worker_name": YoungPersonKeyworkService.full_name(
                row.get("worker_first_name"),
                row.get("worker_last_name"),
            ),
            "topic": row.get("topic"),
            "purpose": row.get("purpose"),
            "summary": row.get("summary"),
            "child_voice": row.get("child_voice"),
            "reflective_analysis": row.get("reflective_analysis"),
            "actions_agreed": row.get("actions_agreed"),
            "next_session_date": row.get("next_session_date"),
            "status": status,
            "archived": row.get("archived", False),
            "manager_review_comment": row.get("manager_review_comment"),
            "submitted_at": row.get("submitted_at"),
            "approved_at": row.get("approved_at"),
            "returned_at": row.get("returned_at"),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
            "title": f"Keywork: {row.get('topic') or 'Session'}",
            "narrative": row.get("summary") or "Keywork session recorded",
            "event_type": "keywork",
            "workflow_status": status,
            "requires_manager_review": True,
            "quality_standards": ["positive_relationships", "wishes_and_feelings"],
            "judgement_areas": ["experiences_and_progress"],
        }

    @staticmethod
    def select_sql(where: str) -> str:
        return f"""
            SELECT
                k.*,
                yp.home_id,
                u.first_name AS worker_first_name,
                u.last_name AS worker_last_name
            FROM keywork_sessions k
            INNER JOIN young_people yp ON yp.id = k.young_person_id
            LEFT JOIN users u ON k.worker_id = u.id
            {where}
        """

    @staticmethod
    def get_keywork_row(conn, keywork_id: int) -> dict[str, Any]:
        with conn.cursor() as cur:
            cur.execute(
                YoungPersonKeyworkService.select_sql("WHERE k.id = %s LIMIT 1"),
                (keywork_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Keywork session not found")

        return row

    @staticmethod
    def get_keywork(conn, keywork_id: int) -> dict[str, Any]:
        row = YoungPersonKeyworkService.get_keywork_row(conn, keywork_id)
        return YoungPersonKeyworkService.transform_keywork_row(row)

    @staticmethod
    def _run_os_sync_after_save(
        conn,
        *,
        keywork_id: int,
    ) -> None:
        try:
            keywork = YoungPersonKeyworkService.get_keywork(conn, keywork_id)
            sync_after_save(
                source_table="keywork_sessions",
                record=keywork,
                recorded_by_name=keywork.get("worker_name"),
            )
        except Exception:
            # Keep the source record write successful even if OS sync fails.
            pass

    @staticmethod
    def list_keywork(conn, young_person_id: int) -> list[dict[str, Any]]:
        YoungPersonKeyworkService.ensure_young_person_exists(conn, young_person_id)

        with conn.cursor() as cur:
            cur.execute(
                YoungPersonKeyworkService.select_sql(
                    """
                    WHERE k.young_person_id = %s
                      AND COALESCE(k.archived, FALSE) = FALSE
                    ORDER BY k.session_date DESC, k.created_at DESC, k.id DESC
                    """
                ),
                (young_person_id,),
            )
            rows = cur.fetchall() or []

        return [YoungPersonKeyworkService.transform_keywork_row(r) for r in rows]

    @staticmethod
    def build_keywork_summary(payload: dict[str, Any]) -> str:
        parts = [
            payload.get("topic"),
            payload.get("summary"),
            payload.get("child_voice"),
            payload.get("actions_agreed"),
        ]
        text = " | ".join([str(x).strip() for x in parts if x and str(x).strip()])
        return text or "Keywork session recorded"

    @staticmethod
    def build_keywork_narrative(payload: dict[str, Any]) -> str:
        parts = [
            f"Topic: {payload.get('topic')}" if payload.get("topic") else None,
            f"Purpose: {payload.get('purpose')}" if payload.get("purpose") else None,
            f"Summary: {payload.get('summary')}" if payload.get("summary") else None,
            f"Child voice: {payload.get('child_voice')}" if payload.get("child_voice") else None,
            f"Reflective analysis: {payload.get('reflective_analysis')}" if payload.get("reflective_analysis") else None,
            f"Actions agreed: {payload.get('actions_agreed')}" if payload.get("actions_agreed") else None,
        ]
        return "\n".join([p for p in parts if p]) or "Keywork session recorded"

    @staticmethod
    def create_keywork(
        conn,
        *,
        young_person_id: int,
        payload: dict[str, Any],
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        now = YoungPersonKeyworkService.now_utc()
        YoungPersonKeyworkService.ensure_young_person_exists(conn, young_person_id)

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO keywork_sessions (
                    young_person_id,
                    session_date,
                    worker_id,
                    topic,
                    purpose,
                    summary,
                    child_voice,
                    reflective_analysis,
                    actions_agreed,
                    next_session_date,
                    status,
                    archived,
                    created_by,
                    updated_by,
                    created_at,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    young_person_id,
                    payload.get("session_date"),
                    payload.get("worker_id") or actor_user_id,
                    payload.get("topic"),
                    payload.get("purpose"),
                    payload.get("summary"),
                    payload.get("child_voice"),
                    payload.get("reflective_analysis"),
                    payload.get("actions_agreed"),
                    payload.get("next_session_date"),
                    YoungPersonKeyworkService.normalise_status(payload.get("status")),
                    bool(payload.get("archived", False)),
                    actor_user_id,
                    actor_user_id,
                    now,
                    now,
                ),
            )
            created = cur.fetchone()
            keywork_id = created["id"]

            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=young_person_id,
                source_table="keywork_sessions",
                source_id=keywork_id,
                event_type="created",
                title=f"Keywork: {payload.get('topic') or 'Session'}",
                summary=YoungPersonKeyworkService.build_keywork_summary(payload),
                narrative=YoungPersonKeyworkService.build_keywork_narrative(payload),
                category="keywork",
                subcategory=payload.get("topic") or "keywork",
                significance="medium",
                due_date=payload.get("next_session_date"),
                owner_id=payload.get("worker_id") or actor_user_id,
                created_by=actor_user_id,
                workflow={
                    "link_chronology": True,
                    "create_task": bool(payload.get("actions_agreed") or payload.get("next_session_date")),
                    "manager_review": YoungPersonKeyworkService.normalise_status(payload.get("status")) in {"submitted", "approved"},
                    "safeguarding": False,
                    "link_support_plans": True,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": "medium",
                    "workflow_status": YoungPersonKeyworkService.normalise_status(payload.get("status")),
                    "quality_standards": ["positive_relationships", "wishes_and_feelings"],
                    "standards_rationale": "Linked from keywork workflow",
                    "evidence_strength": "medium",
                    "response_actions": payload.get("actions_agreed"),
                    "judgement_areas": ["experiences_and_progress"],
                },
            )

        conn.commit()
        YoungPersonKeyworkService._run_os_sync_after_save(conn, keywork_id=keywork_id)

        return {
            "message": "Keywork session created successfully",
            "id": keywork_id,
            "workflow": workflow_result,
        }

    @staticmethod
    def update_keywork(conn, *, keywork_id: int, payload: dict[str, Any], actor_user_id: int | None) -> dict[str, Any]:
        update_data = dict(payload)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields")

        if "status" in update_data and update_data["status"] is not None:
            update_data["status"] = YoungPersonKeyworkService.normalise_status(update_data["status"])

        update_data["updated_at"] = YoungPersonKeyworkService.now_utc()
        update_data["updated_by"] = actor_user_id

        set_parts = []
        values = []
        for key, value in update_data.items():
            set_parts.append(f"{key} = %s")
            values.append(value)

        values.append(keywork_id)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE keywork_sessions
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Keywork session not found")

        conn.commit()
        YoungPersonKeyworkService._run_os_sync_after_save(conn, keywork_id=keywork_id)

        return {"ok": True, "id": row["id"]}

    @staticmethod
    def submit_keywork(
        conn,
        *,
        keywork_id: int,
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        row = YoungPersonKeyworkService.get_keywork_row(conn, keywork_id)
        now = YoungPersonKeyworkService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE keywork_sessions
                SET status = %s,
                    submitted_at = %s,
                    updated_at = %s,
                    updated_by = %s
                WHERE id = %s
                RETURNING id
                """,
                ("submitted", now, now, actor_user_id, keywork_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonKeyworkService.transform_keywork_row(row)
            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="keywork_sessions",
                source_id=keywork_id,
                event_type="submitted",
                title=f"Keywork: {row.get('topic') or 'Session'} submitted",
                summary=transformed["summary"] or "Keywork session submitted",
                narrative=transformed["narrative"] or "Keywork session submitted",
                category="keywork",
                subcategory=row.get("topic") or "keywork",
                significance="medium",
                due_date=row.get("next_session_date"),
                owner_id=row.get("worker_id"),
                created_by=actor_user_id,
                workflow={
                    "link_chronology": True,
                    "create_task": False,
                    "manager_review": True,
                    "safeguarding": False,
                    "link_support_plans": True,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": "medium",
                    "workflow_status": "submitted",
                    "quality_standards": ["positive_relationships", "wishes_and_feelings"],
                    "standards_rationale": "Keywork submitted for review",
                    "evidence_strength": "medium",
                    "judgement_areas": ["experiences_and_progress"],
                },
            )

        conn.commit()
        YoungPersonKeyworkService._run_os_sync_after_save(conn, keywork_id=keywork_id)

        return {"status": "submitted", "id": updated["id"], "workflow": workflow_result}

    @staticmethod
    def approve_keywork(
        conn,
        *,
        keywork_id: int,
        approved_by: int | None,
        review_note: str | None,
        linking_service,
    ) -> dict[str, Any]:
        row = YoungPersonKeyworkService.get_keywork_row(conn, keywork_id)
        now = YoungPersonKeyworkService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE keywork_sessions
                SET status = %s,
                    manager_review_comment = %s,
                    approved_at = %s,
                    reviewed_by = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("approved", review_note, now, approved_by, now, keywork_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonKeyworkService.transform_keywork_row(row)
            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="keywork_sessions",
                source_id=keywork_id,
                event_type="approved",
                title=f"Keywork: {row.get('topic') or 'Session'} approved",
                summary=transformed["summary"] or "Keywork session approved",
                narrative=review_note or transformed["narrative"] or "Keywork session approved",
                category="keywork",
                subcategory=row.get("topic") or "keywork",
                significance="medium",
                due_date=row.get("next_session_date"),
                owner_id=row.get("worker_id"),
                created_by=approved_by,
                workflow={
                    "link_chronology": True,
                    "create_task": False,
                    "manager_review": False,
                    "safeguarding": False,
                    "link_support_plans": True,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": "medium",
                    "workflow_status": "approved",
                    "quality_standards": ["positive_relationships", "wishes_and_feelings"],
                    "standards_rationale": "Keywork approved",
                    "evidence_strength": "strong",
                    "manager_review_comment": review_note,
                    "judgement_areas": ["experiences_and_progress"],
                },
            )

        conn.commit()
        YoungPersonKeyworkService._run_os_sync_after_save(conn, keywork_id=keywork_id)

        return {"status": "approved", "id": updated["id"], "workflow": workflow_result}

    @staticmethod
    def return_keywork(
        conn,
        *,
        keywork_id: int,
        actor_user_id: int | None,
        review_note: str | None,
        linking_service,
    ) -> dict[str, Any]:
        row = YoungPersonKeyworkService.get_keywork_row(conn, keywork_id)
        now = YoungPersonKeyworkService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE keywork_sessions
                SET status = %s,
                    manager_review_comment = %s,
                    returned_at = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("returned", review_note, now, now, keywork_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonKeyworkService.transform_keywork_row(row)
            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="keywork_sessions",
                source_id=keywork_id,
                event_type="returned",
                title=f"Keywork: {row.get('topic') or 'Session'} returned",
                summary=transformed["summary"] or "Keywork session returned",
                narrative=review_note or "Keywork session returned for revision",
                category="keywork",
                subcategory=row.get("topic") or "keywork",
                significance="medium",
                due_date=row.get("next_session_date"),
                owner_id=row.get("worker_id"),
                created_by=actor_user_id,
                workflow={
                    "link_chronology": True,
                    "create_task": True,
                    "manager_review": True,
                    "safeguarding": False,
                    "link_support_plans": True,
                    "link_monthly_reviews": False,
                    "link_quality_standards": False,
                },
                metadata={
                    "severity": "medium",
                    "workflow_status": "returned",
                    "response_actions": review_note,
                    "manager_review_comment": review_note,
                },
            )

        conn.commit()
        YoungPersonKeyworkService._run_os_sync_after_save(conn, keywork_id=keywork_id)

        return {"status": "returned", "id": updated["id"], "workflow": workflow_result}

    @staticmethod
    def archive_keywork(
        conn,
        *,
        keywork_id: int,
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        row = YoungPersonKeyworkService.get_keywork_row(conn, keywork_id)
        now = YoungPersonKeyworkService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE keywork_sessions
                SET archived = TRUE,
                    status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("archived", now, keywork_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonKeyworkService.transform_keywork_row(row)
            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="keywork_sessions",
                source_id=keywork_id,
                event_type="archived",
                title=f"Keywork: {row.get('topic') or 'Session'} archived",
                summary=transformed["summary"] or "Keywork session archived",
                narrative="Keywork session archived",
                category="keywork",
                subcategory=row.get("topic") or "keywork",
                significance="low",
                due_date=row.get("next_session_date"),
                owner_id=row.get("worker_id"),
                created_by=actor_user_id,
                workflow={
                    "link_chronology": True,
                    "create_task": False,
                    "manager_review": False,
                    "safeguarding": False,
                    "link_support_plans": False,
                    "link_monthly_reviews": False,
                    "link_quality_standards": False,
                },
                metadata={
                    "severity": "low",
                    "workflow_status": "archived",
                },
            )

        conn.commit()

        try:
            archive_after_status_change(
                young_person_id=row["young_person_id"],
                source_table="keywork_sessions",
                source_id=keywork_id,
            )
        except Exception:
            pass

        return {"status": "archived", "id": updated["id"], "workflow": workflow_result}
