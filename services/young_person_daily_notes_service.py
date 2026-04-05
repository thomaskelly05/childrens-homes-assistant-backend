from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException

from services.os_sync_hooks import archive_after_status_change, sync_after_save


class YoungPersonDailyNotesService:
    @staticmethod
    def now_utc() -> datetime:
        return datetime.utcnow()

    @staticmethod
    def full_name(first_name: str | None, last_name: str | None) -> str | None:
        return " ".join([x for x in [first_name, last_name] if x]).strip() or None

    @staticmethod
    def normalise_workflow_status(value: str | None) -> str:
        v = (value or "").strip().lower()
        if v in {"draft", "submitted", "approved", "returned", "reviewed", "completed", "archived"}:
            return v
        return "draft"

    @staticmethod
    def workflow_display_status(value: str | None) -> str:
        v = YoungPersonDailyNotesService.normalise_workflow_status(value)
        if v == "reviewed":
            return "approved"
        return v

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
    def fetch_daily_note_select_sql(where_sql: str) -> str:
        return f"""
            SELECT
                dn.id,
                dn.young_person_id,
                dn.home_id,
                dn.note_date,
                dn.shift_type,
                dn.mood,
                dn.presentation,
                dn.activities,
                dn.education_update,
                dn.health_update,
                dn.family_update,
                dn.behaviour_update,
                dn.young_person_voice,
                dn.positives,
                dn.actions_required,
                dn.significance,
                dn.workflow_status,
                dn.manager_review_comment,
                dn.approved_by,
                dn.approved_at,
                dn.returned_at,
                dn.submitted_at,
                dn.last_edited_at,
                dn.author_id,
                dn.created_at,
                dn.updated_at,
                u.first_name AS author_first_name,
                u.last_name AS author_last_name,
                a.first_name AS approved_by_first_name,
                a.last_name AS approved_by_last_name
            FROM daily_notes dn
            LEFT JOIN users u ON dn.author_id = u.id
            LEFT JOIN users a ON dn.approved_by = a.id
            {where_sql}
        """

    @staticmethod
    def transform_daily_note_row(row: dict[str, Any]) -> dict[str, Any]:
        author_name = YoungPersonDailyNotesService.full_name(
            row.get("author_first_name"),
            row.get("author_last_name"),
        )
        approved_by_name = YoungPersonDailyNotesService.full_name(
            row.get("approved_by_first_name"),
            row.get("approved_by_last_name"),
        )
        workflow_status = YoungPersonDailyNotesService.workflow_display_status(
            row.get("workflow_status")
        )

        summary_parts = [
            row.get("positives"),
            row.get("presentation"),
            row.get("behaviour_update"),
            row.get("actions_required"),
        ]
        summary = " | ".join([str(x).strip() for x in summary_parts if x and str(x).strip()])

        return {
            "id": row.get("id"),
            "young_person_id": row.get("young_person_id"),
            "home_id": row.get("home_id"),
            "note_date": row.get("note_date"),
            "recorded_at": row.get("note_date"),
            "shift_type": row.get("shift_type"),
            "mood": row.get("mood"),
            "presentation": row.get("presentation"),
            "activities": row.get("activities"),
            "education_update": row.get("education_update"),
            "health_update": row.get("health_update"),
            "family_update": row.get("family_update"),
            "behaviour_update": row.get("behaviour_update"),
            "young_person_voice": row.get("young_person_voice"),
            "child_voice": row.get("young_person_voice"),
            "positives": row.get("positives"),
            "actions_required": row.get("actions_required"),
            "significance": row.get("significance") or "standard",
            "workflow_status": workflow_status,
            "manager_review_comment": row.get("manager_review_comment"),
            "approved_by": row.get("approved_by"),
            "approved_by_name": approved_by_name,
            "approved_at": row.get("approved_at"),
            "returned_at": row.get("returned_at"),
            "submitted_at": row.get("submitted_at"),
            "last_edited_at": row.get("last_edited_at"),
            "author_id": row.get("author_id"),
            "author_name": author_name,
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
            "title": f"{(row.get('shift_type') or 'Shift').replace('_', ' ').title()} daily note",
            "summary": summary or "Daily note recorded",
            "narrative": summary or "Daily note recorded",
            "event_type": "daily_note",
            "requires_manager_review": True,
            "quality_standards": ["quality_and_purpose_of_care"],
            "judgement_areas": ["experiences_and_progress"],
            "version_no": 1,
        }

    @staticmethod
    def fetch_daily_note_by_id(conn, daily_note_id: int) -> dict[str, Any]:
        with conn.cursor() as cur:
            cur.execute(
                YoungPersonDailyNotesService.fetch_daily_note_select_sql("WHERE dn.id = %s LIMIT 1"),
                (daily_note_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Daily note not found")
            return row

    @staticmethod
    def build_daily_note_summary(
        *,
        presentation: str | None,
        activities: str | None,
        education_update: str | None,
        health_update: str | None,
        family_update: str | None,
        behaviour_update: str | None,
        actions_required: str | None,
        positives: str | None,
    ) -> str:
        parts = [
            positives,
            presentation,
            activities,
            education_update,
            health_update,
            family_update,
            behaviour_update,
            actions_required,
        ]
        text = " | ".join([str(x).strip() for x in parts if x and str(x).strip()])
        return text or "Daily note recorded"

    @staticmethod
    def build_daily_note_narrative(
        *,
        mood: str | None,
        presentation: str | None,
        activities: str | None,
        education_update: str | None,
        health_update: str | None,
        family_update: str | None,
        behaviour_update: str | None,
        young_person_voice: str | None,
        positives: str | None,
        actions_required: str | None,
    ) -> str:
        parts = [
            f"Mood: {mood}" if mood else None,
            f"Presentation: {presentation}" if presentation else None,
            f"Activities: {activities}" if activities else None,
            f"Education: {education_update}" if education_update else None,
            f"Health: {health_update}" if health_update else None,
            f"Family: {family_update}" if family_update else None,
            f"Behaviour: {behaviour_update}" if behaviour_update else None,
            f"Young person voice: {young_person_voice}" if young_person_voice else None,
            f"Positives: {positives}" if positives else None,
            f"Actions required: {actions_required}" if actions_required else None,
        ]
        return "\n".join([p for p in parts if p]) or "Daily note recorded"

    @staticmethod
    def build_daily_note_title(shift_type: str | None, note_date: str | None) -> str:
        shift = (shift_type or "shift").replace("_", " ").title()
        date_part = note_date or "undated"
        return f"{shift} daily note - {date_part}"

    @staticmethod
    def _run_os_sync_after_save(
        conn,
        *,
        daily_note_id: int,
    ) -> None:
        try:
            note = YoungPersonDailyNotesService.get_daily_note(conn, daily_note_id)
            sync_after_save(
                source_table="daily_notes",
                record=note,
                recorded_by_name=note.get("author_name"),
            )
        except Exception:
            # Keep the source record write successful even if OS sync fails.
            pass

    @staticmethod
    def list_daily_notes_for_young_person(
        conn,
        *,
        young_person_id: int,
        archived: bool = False,
    ) -> list[dict[str, Any]]:
        YoungPersonDailyNotesService.ensure_young_person_exists(conn, young_person_id)

        where_sql = """
            WHERE dn.young_person_id = %s
              AND LOWER(COALESCE(dn.workflow_status, 'draft')) NOT IN ('completed', 'archived')
            ORDER BY dn.note_date DESC, dn.created_at DESC, dn.id DESC
        """
        if archived:
            where_sql = """
                WHERE dn.young_person_id = %s
                  AND LOWER(COALESCE(dn.workflow_status, '')) IN ('completed', 'archived')
                ORDER BY dn.note_date DESC, dn.created_at DESC, dn.id DESC
            """

        with conn.cursor() as cur:
            cur.execute(
                YoungPersonDailyNotesService.fetch_daily_note_select_sql(where_sql),
                (young_person_id,),
            )
            rows = cur.fetchall() or []
            return [YoungPersonDailyNotesService.transform_daily_note_row(r) for r in rows]

    @staticmethod
    def get_daily_note(conn, daily_note_id: int) -> dict[str, Any]:
        row = YoungPersonDailyNotesService.fetch_daily_note_by_id(conn, daily_note_id)
        return YoungPersonDailyNotesService.transform_daily_note_row(row)

    @staticmethod
    def create_daily_note(
        conn,
        *,
        young_person_id: int,
        payload: dict[str, Any],
        author_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        now = YoungPersonDailyNotesService.now_utc()
        person = YoungPersonDailyNotesService.ensure_young_person_exists(conn, young_person_id)

        note_date = payload.get("note_date") or payload.get("recorded_at")
        if not note_date:
            raise HTTPException(status_code=400, detail="note_date is required")

        young_person_voice = payload.get("young_person_voice")
        if young_person_voice is None:
            young_person_voice = payload.get("child_voice")

        home_id = payload.get("home_id") or person.get("home_id")
        workflow_status = YoungPersonDailyNotesService.normalise_workflow_status(
            payload.get("workflow_status")
        )

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO daily_notes (
                    young_person_id,
                    home_id,
                    note_date,
                    shift_type,
                    mood,
                    presentation,
                    activities,
                    education_update,
                    health_update,
                    family_update,
                    behaviour_update,
                    young_person_voice,
                    positives,
                    actions_required,
                    significance,
                    workflow_status,
                    manager_review_comment,
                    approved_by,
                    approved_at,
                    returned_at,
                    submitted_at,
                    last_edited_at,
                    author_id,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s
                )
                RETURNING id
                """,
                (
                    young_person_id,
                    home_id,
                    note_date,
                    payload.get("shift_type"),
                    payload.get("mood"),
                    payload.get("presentation"),
                    payload.get("activities"),
                    payload.get("education_update"),
                    payload.get("health_update"),
                    payload.get("family_update"),
                    payload.get("behaviour_update"),
                    young_person_voice,
                    payload.get("positives"),
                    payload.get("actions_required"),
                    payload.get("significance"),
                    workflow_status,
                    payload.get("manager_review_comment"),
                    payload.get("approved_by"),
                    payload.get("approved_at"),
                    payload.get("returned_at"),
                    payload.get("submitted_at"),
                    payload.get("last_edited_at") or now,
                    payload.get("author_id") or author_id,
                    now,
                    now,
                ),
            )
            created = cur.fetchone()
            daily_note_id = created["id"]

            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=young_person_id,
                source_table="daily_notes",
                source_id=daily_note_id,
                event_type="created",
                title=payload.get("title")
                or YoungPersonDailyNotesService.build_daily_note_title(payload.get("shift_type"), note_date),
                summary=YoungPersonDailyNotesService.build_daily_note_summary(
                    presentation=payload.get("presentation"),
                    activities=payload.get("activities"),
                    education_update=payload.get("education_update"),
                    health_update=payload.get("health_update"),
                    family_update=payload.get("family_update"),
                    behaviour_update=payload.get("behaviour_update"),
                    actions_required=payload.get("actions_required"),
                    positives=payload.get("positives"),
                ),
                narrative=payload.get("narrative")
                or YoungPersonDailyNotesService.build_daily_note_narrative(
                    mood=payload.get("mood"),
                    presentation=payload.get("presentation"),
                    activities=payload.get("activities"),
                    education_update=payload.get("education_update"),
                    health_update=payload.get("health_update"),
                    family_update=payload.get("family_update"),
                    behaviour_update=payload.get("behaviour_update"),
                    young_person_voice=young_person_voice,
                    positives=payload.get("positives"),
                    actions_required=payload.get("actions_required"),
                ),
                category="daily_note",
                subcategory=payload.get("shift_type") or "daily_note",
                significance=payload.get("significance") or "medium",
                due_date=note_date,
                owner_id=payload.get("author_id") or author_id,
                created_by=payload.get("author_id") or author_id,
                workflow={
                    "link_chronology": bool(payload.get("link_to_chronology", True)),
                    "create_task": bool(payload.get("create_follow_up_task", False))
                    or bool(payload.get("actions_required")),
                    "manager_review": bool(payload.get("manager_review_needed", False))
                    or workflow_status in {"submitted", "approved"},
                    "safeguarding": bool(payload.get("safeguarding_concern", False)),
                    "link_support_plans": bool(payload.get("link_to_support_plans", False)),
                    "link_monthly_reviews": bool(payload.get("link_monthly_reviews", False)),
                    "link_quality_standards": bool(payload.get("link_quality_standards", True)),
                },
                metadata={
                    "severity": payload.get("significance") or "medium",
                    "workflow_status": workflow_status,
                    "shift_type": payload.get("shift_type"),
                    "note_date": note_date,
                    "quality_standards": ["quality_and_purpose_of_care"]
                    if payload.get("link_quality_standards", True)
                    else [],
                    "standards_rationale": "Linked from daily note workflow",
                    "evidence_strength": "medium",
                    "response_actions": payload.get("actions_required"),
                    "judgement_areas": ["experiences_and_progress"],
                },
            )

        conn.commit()
        YoungPersonDailyNotesService._run_os_sync_after_save(conn, daily_note_id=daily_note_id)

        return {
            "message": "Daily note created successfully",
            "id": daily_note_id,
            "workflow": workflow_result,
        }

    @staticmethod
    def update_daily_note(
        conn,
        *,
        daily_note_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        update_data = dict(payload)

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        if "child_voice" in update_data:
            update_data["young_person_voice"] = update_data.pop("child_voice")

        if "recorded_at" in update_data:
            update_data["note_date"] = update_data.pop("recorded_at")

        update_data.pop("title", None)
        update_data.pop("narrative", None)

        if "workflow_status" in update_data and update_data["workflow_status"] is not None:
            update_data["workflow_status"] = YoungPersonDailyNotesService.normalise_workflow_status(
                update_data["workflow_status"]
            )

        now = YoungPersonDailyNotesService.now_utc()
        update_data["updated_at"] = now
        update_data["last_edited_at"] = now

        set_parts = []
        values = []

        for field, value in update_data.items():
            set_parts.append(f"{field} = %s")
            values.append(value)

        values.append(daily_note_id)

        query = f"""
            UPDATE daily_notes
            SET {", ".join(set_parts)}
            WHERE id = %s
            RETURNING id
        """

        with conn.cursor() as cur:
            cur.execute(query, values)
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Daily note not found")

        conn.commit()
        YoungPersonDailyNotesService._run_os_sync_after_save(conn, daily_note_id=daily_note_id)

        return {"message": "Daily note updated successfully", "id": row["id"]}

    @staticmethod
    def submit_daily_note(
        conn,
        *,
        daily_note_id: int,
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        row = YoungPersonDailyNotesService.fetch_daily_note_by_id(conn, daily_note_id)
        now = YoungPersonDailyNotesService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE daily_notes
                SET
                    workflow_status = %s,
                    submitted_at = %s,
                    updated_at = %s,
                    last_edited_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("submitted", now, now, now, daily_note_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonDailyNotesService.transform_daily_note_row(row)

            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="daily_notes",
                source_id=daily_note_id,
                event_type="submitted",
                title=f"{(row.get('shift_type') or 'Shift').replace('_', ' ').title()} daily note submitted",
                summary=transformed["summary"],
                narrative=transformed["narrative"],
                category="daily_note",
                subcategory=row.get("shift_type") or "daily_note",
                significance=row.get("significance") or "medium",
                due_date=row.get("note_date"),
                owner_id=row.get("author_id"),
                created_by=actor_user_id or row.get("author_id"),
                workflow={
                    "link_chronology": True,
                    "create_task": False,
                    "manager_review": True,
                    "safeguarding": False,
                    "link_support_plans": False,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": row.get("significance") or "medium",
                    "workflow_status": "submitted",
                    "shift_type": row.get("shift_type"),
                    "note_date": str(row.get("note_date")) if row.get("note_date") else None,
                    "quality_standards": ["quality_and_purpose_of_care"],
                    "standards_rationale": "Daily note submitted for workflow review",
                    "evidence_strength": "medium",
                    "judgement_areas": ["experiences_and_progress"],
                },
            )

        conn.commit()
        YoungPersonDailyNotesService._run_os_sync_after_save(conn, daily_note_id=daily_note_id)

        return {
            "ok": True,
            "status": "submitted",
            "id": updated["id"],
            "workflow": workflow_result,
        }

    @staticmethod
    def approve_daily_note(
        conn,
        *,
        daily_note_id: int,
        approved_by: int | None,
        review_note: str | None,
        linking_service,
    ) -> dict[str, Any]:
        row = YoungPersonDailyNotesService.fetch_daily_note_by_id(conn, daily_note_id)
        now = YoungPersonDailyNotesService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE daily_notes
                SET
                    workflow_status = %s,
                    manager_review_comment = %s,
                    approved_by = %s,
                    approved_at = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("approved", review_note, approved_by, now, now, daily_note_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonDailyNotesService.transform_daily_note_row(row)

            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="daily_notes",
                source_id=daily_note_id,
                event_type="approved",
                title=f"{(row.get('shift_type') or 'Shift').replace('_', ' ').title()} daily note approved",
                summary=transformed["summary"],
                narrative=review_note or transformed["narrative"],
                category="daily_note",
                subcategory=row.get("shift_type") or "daily_note",
                significance=row.get("significance") or "medium",
                due_date=row.get("note_date"),
                owner_id=row.get("author_id"),
                created_by=approved_by,
                workflow={
                    "link_chronology": True,
                    "create_task": False,
                    "manager_review": False,
                    "safeguarding": False,
                    "link_support_plans": False,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": row.get("significance") or "medium",
                    "workflow_status": "approved",
                    "shift_type": row.get("shift_type"),
                    "note_date": str(row.get("note_date")) if row.get("note_date") else None,
                    "quality_standards": ["quality_and_purpose_of_care"],
                    "standards_rationale": "Daily note approved",
                    "evidence_strength": "strong",
                    "judgement_areas": ["experiences_and_progress"],
                    "manager_review_comment": review_note,
                },
            )

        conn.commit()
        YoungPersonDailyNotesService._run_os_sync_after_save(conn, daily_note_id=daily_note_id)

        return {
            "ok": True,
            "status": "approved",
            "id": updated["id"],
            "workflow": workflow_result,
        }

    @staticmethod
    def return_daily_note(
        conn,
        *,
        daily_note_id: int,
        actor_user_id: int | None,
        review_note: str | None,
        linking_service,
    ) -> dict[str, Any]:
        row = YoungPersonDailyNotesService.fetch_daily_note_by_id(conn, daily_note_id)
        now = YoungPersonDailyNotesService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE daily_notes
                SET
                    workflow_status = %s,
                    manager_review_comment = %s,
                    returned_at = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("returned", review_note, now, now, daily_note_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonDailyNotesService.transform_daily_note_row(row)

            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="daily_notes",
                source_id=daily_note_id,
                event_type="returned",
                title=f"{(row.get('shift_type') or 'Shift').replace('_', ' ').title()} daily note returned",
                summary=transformed["summary"],
                narrative=review_note or "Daily note returned for revision",
                category="daily_note",
                subcategory=row.get("shift_type") or "daily_note",
                significance=row.get("significance") or "medium",
                due_date=row.get("note_date"),
                owner_id=row.get("author_id"),
                created_by=actor_user_id,
                workflow={
                    "link_chronology": True,
                    "create_task": True,
                    "manager_review": True,
                    "safeguarding": False,
                    "link_support_plans": False,
                    "link_monthly_reviews": False,
                    "link_quality_standards": False,
                },
                metadata={
                    "severity": row.get("significance") or "medium",
                    "workflow_status": "returned",
                    "shift_type": row.get("shift_type"),
                    "note_date": str(row.get("note_date")) if row.get("note_date") else None,
                    "response_actions": review_note,
                    "manager_review_comment": review_note,
                },
            )

        conn.commit()
        YoungPersonDailyNotesService._run_os_sync_after_save(conn, daily_note_id=daily_note_id)

        return {
            "ok": True,
            "status": "returned",
            "id": updated["id"],
            "review_note": review_note or "",
            "workflow": workflow_result,
        }

    @staticmethod
    def archive_daily_note(
        conn,
        *,
        daily_note_id: int,
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        row = YoungPersonDailyNotesService.fetch_daily_note_by_id(conn, daily_note_id)
        now = YoungPersonDailyNotesService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE daily_notes
                SET
                    workflow_status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("archived", now, daily_note_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonDailyNotesService.transform_daily_note_row(row)

            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="daily_notes",
                source_id=daily_note_id,
                event_type="archived",
                title=f"{(row.get('shift_type') or 'Shift').replace('_', ' ').title()} daily note archived",
                summary=transformed["summary"],
                narrative="Daily note archived",
                category="daily_note",
                subcategory=row.get("shift_type") or "daily_note",
                significance=row.get("significance") or "low",
                due_date=row.get("note_date"),
                owner_id=row.get("author_id"),
                created_by=actor_user_id or row.get("author_id"),
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
                    "severity": row.get("significance") or "low",
                    "workflow_status": "archived",
                    "shift_type": row.get("shift_type"),
                    "note_date": str(row.get("note_date")) if row.get("note_date") else None,
                },
            )

        conn.commit()

        try:
            archive_after_status_change(
                young_person_id=row["young_person_id"],
                source_table="daily_notes",
                source_id=daily_note_id,
            )
        except Exception:
            pass

        return {
            "ok": True,
            "status": "archived",
            "id": updated["id"],
            "workflow": workflow_result,
        }
