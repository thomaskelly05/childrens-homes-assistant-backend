from __future__ import annotations

import json
from copy import deepcopy
from typing import Any

from db.connection import get_db_connection, release_db_connection

# Keep this aligned to the exported IndiCare schema. The service still works
# schema-safely: it selects the first table that actually exists in the DB.
RECORD_TABLES = {
    "daily": ["daily_notes", "daily_records", "young_people_daily_notes"],
    "incident": ["incidents", "incident_records", "young_people_incidents"],
    "safeguarding": ["safeguarding_records", "safeguarding_concerns", "safeguarding_flags", "safeguarding"],
    "missing": ["missing_episodes", "missing_from_care"],
    "keywork": ["keywork_sessions"],
    "direct_work": ["keywork_sessions", "direct_work_plan_sessions"],
    "handover": ["handover_records"],
    "handover_item": ["handover_items"],
    "support_plan": ["support_plans", "behaviour_support_plans"],
    "health": ["wellbeing_checks", "medication_records", "medication_profiles"],
    "education": ["education_attendance_sessions", "pep_meetings"],
    "family_contact": ["contact_arrangements", "communications_log", "young_person_contacts"],
    "review_meeting": ["review_meetings"],
}

LIFECYCLE_STATUSES = {
    "draft",
    "ai_improved",
    "submitted_for_review",
    "changes_requested",
    "approved",
    "archived",
    "rejected",
}

STATUS_COLUMNS = ("status", "workflow_status", "manager_review_status", "approval_status")
REVIEW_COMMENT_COLUMNS = ("manager_comment", "manager_review_comment", "review_comment", "notes")
REVIEWED_BY_COLUMNS = ("reviewed_by", "approved_by", "returned_by")
REVIEWED_AT_COLUMNS = ("reviewed_at", "approved_at", "returned_at")
CREATED_BY_COLUMNS = ("created_by", "author_id", "worker_id", "staff_id", "generated_by")


class WorkspaceRecordsService:
    """Schema-aware universal record lifecycle service.

    This deliberately works with the existing IndiCare schema where possible
    rather than creating duplicate record systems. It supports lifecycle actions
    across tables that expose either `status`, `workflow_status`,
    `manager_review_status` or `approval_status`.
    """

    def list_records(self, *, record_type: str, current_user: dict[str, Any], young_person_id: int | None = None, include_archived: bool = False, limit: int = 20) -> dict[str, Any]:
        table = self._table_for(record_type)
        if not table:
            return {"ok": True, "record_type": record_type, "records": [], "warning": "No matching table found."}
        conn = None
        try:
            conn = get_db_connection()
            cols = self._columns(conn, table)
            select_cols = self._select_cols(cols)
            if not select_cols:
                return {"ok": True, "record_type": record_type, "table": table, "records": []}
            where = []
            params: list[Any] = []
            if young_person_id and "young_person_id" in cols:
                where.append("young_person_id = %s")
                params.append(young_person_id)
            home_id = self._current_home_id(current_user)
            if home_id and "home_id" in cols:
                where.append("home_id = %s")
                params.append(home_id)
            if not include_archived:
                status_col = self._status_col(cols)
                if status_col:
                    where.append(f"COALESCE(\"{status_col}\", '') <> 'archived'")
                if "archived" in cols:
                    where.append("COALESCE(archived, false) = false")
            params.append(max(1, min(limit, 100)))
            where_sql = "WHERE " + " AND ".join(where) if where else ""
            order_col = self._first_col(cols, ["updated_at", "last_edited_at", "created_at", "id"]) or "id"
            quoted_cols = ", ".join([f'"{c}"' for c in select_cols])
            query = f'SELECT {quoted_cols} FROM public."{table}" {where_sql} ORDER BY "{order_col}" DESC NULLS LAST LIMIT %s'
            with conn.cursor() as cur:
                cur.execute(query, tuple(params))
                rows = [dict(row) for row in cur.fetchall()]
            return {"ok": True, "record_type": record_type, "table": table, "records": [self._normalise(row, record_type) for row in rows]}
        except Exception as exc:
            return {"ok": False, "record_type": record_type, "records": [], "error": repr(exc)}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def get_record(self, *, record_type: str, record_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
        table = self._table_for(record_type)
        if not table:
            return {"ok": False, "error": "No matching table found for this record type."}
        conn = None
        try:
            conn = get_db_connection()
            cols = self._columns(conn, table)
            select_cols = self._select_cols(cols)
            quoted_cols = ", ".join([f'"{c}"' for c in select_cols])
            where = ["id = %s"]
            params: list[Any] = [record_id]
            home_id = self._current_home_id(current_user)
            if home_id and "home_id" in cols:
                where.append("home_id = %s")
                params.append(home_id)
            with conn.cursor() as cur:
                cur.execute(f'SELECT {quoted_cols} FROM public."{table}" WHERE {" AND ".join(where)} LIMIT 1', tuple(params))
                row = cur.fetchone()
            if not row:
                return {"ok": False, "error": "Record not found."}
            return {"ok": True, "record_type": record_type, "table": table, "record": self._normalise(dict(row), record_type)}
        except Exception as exc:
            return {"ok": False, "error": repr(exc)}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def review_queue(self, *, current_user: dict[str, Any], limit: int = 50) -> dict[str, Any]:
        all_records: list[dict[str, Any]] = []
        for record_type in RECORD_TABLES:
            result = self.list_records(record_type=record_type, current_user=current_user, include_archived=False, limit=limit)
            for record in result.get("records") or []:
                status = str(record.get("status") or "").lower()
                if "review" in status or status in {"draft", "submitted", "pending", "changes_requested", "ai_improved", "not_required", ""}:
                    all_records.append(record)
        all_records.sort(key=lambda item: str(item.get("updated_at") or item.get("created_at") or ""), reverse=True)
        return {"ok": True, "records": all_records[:limit], "summary": {"total": len(all_records[:limit])}}

    def create_record(self, *, record_type: str, payload: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
        table = self._table_for(record_type)
        if not table:
            return {"ok": False, "error": "No matching table found for this record type.", "record_type": record_type}
        conn = None
        try:
            conn = get_db_connection()
            cols = self._columns(conn, table)
            values = self._values_for_insert(record_type, payload, current_user, cols)
            if not values:
                return {"ok": False, "error": "No compatible columns found for insert.", "record_type": record_type, "table": table}
            col_sql = ", ".join([f'"{key}"' for key in values.keys()])
            placeholders, params = self._placeholders(values.values())
            query = f'INSERT INTO public."{table}" ({col_sql}) VALUES ({", ".join(placeholders)})'
            if "id" in cols:
                query += ' RETURNING "id"'
            with conn.cursor() as cur:
                cur.execute(query, tuple(params))
                row = cur.fetchone() if "id" in cols else None
            conn.commit()
            record_id = row.get("id") if isinstance(row, dict) and row else row[0] if row else None
            self._log_action_safe(record_type, record_id, "created", payload.get("manager_comment") or payload.get("comment"), current_user)
            return {"ok": True, "record_type": record_type, "table": table, "id": record_id, "status": values.get(self._status_col(cols) or "status")}
        except Exception as exc:
            if conn is not None:
                conn.rollback()
            return {"ok": False, "record_type": record_type, "error": repr(exc)}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def update_record(self, *, record_type: str, record_id: int, payload: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
        table = self._table_for(record_type)
        if not table:
            return {"ok": False, "error": "No matching table found for this record type."}
        conn = None
        try:
            conn = get_db_connection()
            cols = self._columns(conn, table)
            existing = self._get_raw(conn, table, cols, record_id, current_user)
            if not existing:
                return {"ok": False, "error": "Record not found."}
            self._insert_version(conn, table, record_type, record_id, existing, "before_update", current_user)
            updates = self._values_for_update(payload, cols)
            if "updated_at" in cols:
                updates["updated_at"] = "NOW()"
            if not updates:
                return {"ok": False, "error": "No compatible columns found for update."}
            self._apply_updates(conn, table, record_id, updates)
            self._insert_review_log(conn, record_type, record_id, "edited", payload.get("comment"), current_user)
            conn.commit()
            return {"ok": True, "record_type": record_type, "id": record_id, "status": updates.get(self._status_col(cols) or "status") or existing.get(self._status_col(cols) or "status")}
        except Exception as exc:
            if conn is not None:
                conn.rollback()
            return {"ok": False, "error": repr(exc)}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def ai_improve_record(self, *, record_type: str, record_id: int, payload: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
        record_result = self.get_record(record_type=record_type, record_id=record_id, current_user=current_user)
        if not record_result.get("ok"):
            return record_result
        record = record_result["record"]
        content = deepcopy(record.get("content") or {})
        improved = self._improve_content(content)
        update_payload = {
            "content": improved,
            "summary": improved.get("what_happened") or improved.get("description") or record.get("summary"),
            "status": "ai_improved",
            "comment": payload.get("comment") or "IndiCare AI improvement applied.",
        }
        update_result = self.update_record(record_type=record_type, record_id=record_id, payload=update_payload, current_user=current_user)
        if not update_result.get("ok"):
            return update_result
        return {"ok": True, "record_type": record_type, "id": record_id, "status": "ai_improved", "suggested_content": improved, "message": "AI improvement applied. Staff should review and edit before submitting."}

    def set_record_status(self, *, record_type: str, record_id: int, status: str, comment: str | None, current_user: dict[str, Any]) -> dict[str, Any]:
        if status not in LIFECYCLE_STATUSES:
            return {"ok": False, "error": f"Unsupported status: {status}"}
        return self.review_record(record_type=record_type, record_id=record_id, action=status, comment=comment, current_user=current_user)

    def review_record(self, *, record_type: str, record_id: int, action: str, comment: str | None, current_user: dict[str, Any]) -> dict[str, Any]:
        table = self._table_for(record_type)
        if not table:
            return {"ok": False, "error": "No matching table found for this record type."}
        action_status = {"approve": "approved", "request_changes": "changes_requested", "reject": "rejected", "submit": "submitted_for_review", "archive": "archived"}.get(action, action)
        conn = None
        try:
            conn = get_db_connection()
            cols = self._columns(conn, table)
            existing = self._get_raw(conn, table, cols, record_id, current_user)
            if not existing:
                return {"ok": False, "error": "Record not found."}
            self._insert_version(conn, table, record_type, record_id, existing, f"before_{action_status}", current_user)
            updates: dict[str, Any] = {}
            status_col = self._status_col(cols)
            if status_col:
                updates[status_col] = action_status
            if action_status == "archived" and "archived" in cols:
                updates["archived"] = True
            comment_col = self._first_col(cols, REVIEW_COMMENT_COLUMNS)
            if comment_col and comment:
                updates[comment_col] = comment
            if action_status in {"approved", "changes_requested", "rejected", "archived"}:
                by_col = self._first_col(cols, REVIEWED_BY_COLUMNS)
                at_col = self._first_col(cols, REVIEWED_AT_COLUMNS)
                if by_col:
                    updates[by_col] = self._current_user_id(current_user)
                if at_col:
                    updates[at_col] = "NOW()"
            if "updated_at" in cols:
                updates["updated_at"] = "NOW()"
            if not updates:
                return {"ok": False, "error": "No compatible review columns found."}
            self._apply_updates(conn, table, record_id, updates)
            self._insert_review_log(conn, record_type, record_id, action_status, comment, current_user)
            conn.commit()
            return {"ok": True, "record_type": record_type, "id": record_id, "status": action_status}
        except Exception as exc:
            if conn is not None:
                conn.rollback()
            return {"ok": False, "error": repr(exc)}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def record_versions(self, *, record_type: str, record_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
        conn = None
        try:
            conn = get_db_connection()
            table = self._first_existing_table(conn, ["record_versions", "record_version_history", "daily_notes_versions", "manager_review_log", "record_workflow_events", "audit_log"])
            if not table:
                return {"ok": True, "record_type": record_type, "record_id": record_id, "versions": []}
            cols = self._columns(conn, table)
            select_cols = ", ".join([f'"{c}"' for c in cols])
            where = []
            params: list[Any] = []
            if "record_type" in cols:
                where.append("record_type = %s")
                params.append(record_type)
            if "record_id" in cols:
                where.append("record_id = %s")
                params.append(record_id)
            elif "daily_note_id" in cols and record_type == "daily":
                where.append("daily_note_id = %s")
                params.append(record_id)
            if not where:
                return {"ok": True, "record_type": record_type, "record_id": record_id, "versions": []}
            order_col = "created_at" if "created_at" in cols else "id" if "id" in cols else None
            order_sql = f' ORDER BY "{order_col}" DESC' if order_col else ""
            with conn.cursor() as cur:
                cur.execute(f'SELECT {select_cols} FROM public."{table}" WHERE {" AND ".join(where)}{order_sql} LIMIT 50', tuple(params))
                rows = [dict(row) for row in cur.fetchall()]
            return {"ok": True, "record_type": record_type, "record_id": record_id, "versions": rows}
        except Exception as exc:
            return {"ok": False, "error": repr(exc)}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def _select_cols(self, cols: set[str]) -> list[str]:
        preferred = [
            "id", "title", "summary", "summary_text", "content", "body", "notes", "description", "mood", "presentation",
            "activities", "education_update", "health_update", "family_update", "behaviour_update", "young_person_voice",
            "child_voice", "staff_response", "child_response", "outcome", "actions_taken", "actions_required", "topic",
            "purpose", "reflective_analysis", "actions_agreed", "incident_type", "severity", "significance", "priority",
            "status", "workflow_status", "manager_review_status", "approval_status", "archived", "created_at", "updated_at",
            "last_edited_at", "submitted_at", "reviewed_at", "approved_at", "returned_at", "young_person_id", "home_id",
            "provider_id", "created_by", "author_id", "worker_id", "staff_id", "generated_by", "reviewed_by", "approved_by",
            "manager_comment", "manager_review_comment", "review_comment", "review_reason", "handover_date", "session_date",
            "incident_datetime", "start_datetime", "return_datetime", "review_date", "due_date", "meeting_date",
        ]
        return [c for c in preferred if c in cols]

    def _values_for_insert(self, record_type: str, payload: dict[str, Any], current_user: dict[str, Any], cols: set[str]) -> dict[str, Any]:
        status = payload.get("status") or payload.get("workflow_status") or "draft"
        content = payload.get("content") if isinstance(payload.get("content"), dict) else payload
        base = {
            "title": payload.get("title") or self._title_for(record_type, payload),
            "topic": payload.get("topic") or payload.get("title") or self._title_for(record_type, payload),
            "summary": payload.get("summary") or payload.get("what_happened") or payload.get("description") or payload.get("notes"),
            "summary_text": payload.get("summary_text") or payload.get("summary") or payload.get("notes"),
            "description": payload.get("description") or payload.get("what_happened") or payload.get("summary"),
            "content": content,
            "body": payload.get("what_happened") or payload.get("description") or payload.get("notes") or payload.get("summary"),
            "notes": payload.get("notes") or payload.get("staff_response"),
            "mood": payload.get("mood"),
            "presentation": payload.get("presentation"),
            "activities": payload.get("activities"),
            "education_update": payload.get("education_update"),
            "health_update": payload.get("health_update"),
            "family_update": payload.get("family_update"),
            "behaviour_update": payload.get("behaviour_update"),
            "young_person_voice": payload.get("young_person_voice") or payload.get("child_voice"),
            "child_voice": payload.get("child_voice") or payload.get("young_person_voice"),
            "staff_response": payload.get("staff_response") or payload.get("adult_response"),
            "outcome": payload.get("outcome"),
            "actions_taken": payload.get("actions_taken"),
            "actions_required": payload.get("actions_required") or payload.get("actions_taken"),
            "purpose": payload.get("purpose"),
            "reflective_analysis": payload.get("reflective_analysis") or payload.get("observations"),
            "actions_agreed": payload.get("actions_agreed") or payload.get("actions_taken"),
            "incident_type": payload.get("incident_type") or payload.get("type"),
            "severity": payload.get("severity"),
            "significance": payload.get("significance"),
            "priority": payload.get("priority"),
            "status": status,
            "workflow_status": status,
            "manager_review_status": payload.get("manager_review_status") or status,
            "approval_status": payload.get("approval_status") or status,
            "young_person_id": self._safe_int(payload.get("young_person_id")),
            "home_id": self._safe_int(payload.get("home_id")) or self._current_home_id(current_user),
            "provider_id": self._current_provider_id(current_user),
            "created_by": self._current_user_id(current_user),
            "author_id": self._current_user_id(current_user),
            "worker_id": self._current_user_id(current_user),
            "staff_id": self._current_user_id(current_user),
            "generated_by": self._current_user_id(current_user),
            "note_date": payload.get("note_date") or "CURRENT_DATE",
            "session_date": payload.get("session_date") or "CURRENT_DATE",
            "handover_date": payload.get("handover_date") or "CURRENT_DATE",
            "shift_type": payload.get("shift_type") or "day",
            "created_at": "NOW()",
            "updated_at": "NOW()",
        }
        return {key: value for key, value in base.items() if key in cols and value is not None}

    def _values_for_update(self, payload: dict[str, Any], cols: set[str]) -> dict[str, Any]:
        content = payload.get("content") if isinstance(payload.get("content"), dict) else {k: v for k, v in payload.items() if k not in {"comment", "manager_comment"}}
        status = payload.get("status") or payload.get("workflow_status")
        base = {
            "title": payload.get("title"),
            "topic": payload.get("topic") or payload.get("title"),
            "summary": payload.get("summary") or payload.get("what_happened") or payload.get("description"),
            "summary_text": payload.get("summary_text") or payload.get("summary") or payload.get("notes"),
            "description": payload.get("description") or payload.get("what_happened") or payload.get("summary"),
            "content": content,
            "body": payload.get("what_happened") or payload.get("description") or payload.get("notes"),
            "notes": payload.get("notes") or payload.get("staff_response"),
            "presentation": payload.get("presentation"),
            "activities": payload.get("activities"),
            "education_update": payload.get("education_update"),
            "health_update": payload.get("health_update"),
            "family_update": payload.get("family_update"),
            "behaviour_update": payload.get("behaviour_update"),
            "young_person_voice": payload.get("young_person_voice") or payload.get("child_voice"),
            "child_voice": payload.get("child_voice") or payload.get("young_person_voice"),
            "staff_response": payload.get("staff_response") or payload.get("adult_response"),
            "outcome": payload.get("outcome"),
            "actions_taken": payload.get("actions_taken"),
            "actions_required": payload.get("actions_required") or payload.get("actions_taken"),
            "reflective_analysis": payload.get("reflective_analysis") or payload.get("observations"),
            "actions_agreed": payload.get("actions_agreed") or payload.get("actions_taken"),
            "incident_type": payload.get("incident_type") or payload.get("type"),
            "status": status,
            "workflow_status": status,
            "manager_review_status": payload.get("manager_review_status") or status,
            "approval_status": payload.get("approval_status") or status,
            "manager_comment": payload.get("manager_comment") or payload.get("comment"),
            "manager_review_comment": payload.get("manager_review_comment") or payload.get("manager_comment") or payload.get("comment"),
            "review_comment": payload.get("review_comment") or payload.get("manager_comment") or payload.get("comment"),
        }
        return {key: value for key, value in base.items() if key in cols and value is not None}

    def _normalise(self, row: dict[str, Any], record_type: str) -> dict[str, Any]:
        content = row.get("content") or {}
        if isinstance(content, str):
            try:
                content = json.loads(content)
            except Exception:
                content = {"text": content}
        if not isinstance(content, dict):
            content = {}
        status_col = self._status_col(set(row.keys()))
        return {
            "id": row.get("id"),
            "record_type": record_type,
            "title": row.get("title") or row.get("topic") or row.get("incident_type") or self._title_for(record_type, row),
            "summary": row.get("summary") or row.get("summary_text") or row.get("body") or row.get("description") or row.get("notes") or row.get("actions_taken") or row.get("purpose") or row.get("reflective_analysis") or (content.get("what_happened") if isinstance(content, dict) else None),
            "status": row.get(status_col) if status_col else row.get("status"),
            "workflow_status": row.get("workflow_status"),
            "mood": row.get("mood"),
            "severity": row.get("severity") or row.get("significance") or row.get("priority"),
            "young_person_id": row.get("young_person_id"),
            "home_id": row.get("home_id"),
            "provider_id": row.get("provider_id"),
            "created_by": row.get("created_by") or row.get("author_id") or row.get("worker_id") or row.get("staff_id") or row.get("generated_by"),
            "reviewed_by": row.get("reviewed_by") or row.get("approved_by"),
            "reviewed_at": row.get("reviewed_at") or row.get("approved_at"),
            "manager_comment": row.get("manager_comment") or row.get("manager_review_comment") or row.get("review_comment"),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at") or row.get("last_edited_at"),
            "occurred_at": row.get("incident_datetime") or row.get("start_datetime") or row.get("session_date") or row.get("handover_date") or row.get("meeting_date"),
            "content": content or {k: v for k, v in row.items() if k not in {"id", "created_at", "updated_at"}},
        }

    def _improve_content(self, content: dict[str, Any]) -> dict[str, Any]:
        improved = deepcopy(content)
        improved.setdefault("ai_review", {})
        improved["ai_review"].update({
            "recording_quality_prompt": "Check facts, child voice, adult response, emotional meaning, outcome and next action.",
            "professional_language_prompt": "Use clear, factual, respectful language. Avoid blame. Describe behaviour as communication where appropriate.",
            "safeguarding_prompt": "If risk is present, include immediate action, who was informed, and follow-up.",
            "ofsted_evidence_prompt": "Show what adults knew, what they did, and what changed for the child.",
        })
        if not improved.get("child_voice"):
            improved["child_voice"] = "[Add the child's words, wishes, feelings, choices or non-verbal communication.]"
        if not improved.get("staff_response") and not improved.get("adult_response"):
            improved["staff_response"] = "[Add what adults did, why they did it, and how the child responded.]"
        if not improved.get("outcome") and not improved.get("actions"):
            improved["outcome"] = "[Add what changed afterwards and any follow-up action required.]"
        return improved

    def _get_raw(self, conn: Any, table: str, cols: set[str], record_id: int, current_user: dict[str, Any]) -> dict[str, Any] | None:
        select_cols = self._select_cols(cols)
        quoted_cols = ", ".join([f'"{c}"' for c in select_cols])
        where = ["id = %s"]
        params: list[Any] = [record_id]
        home_id = self._current_home_id(current_user)
        if home_id and "home_id" in cols:
            where.append("home_id = %s")
            params.append(home_id)
        with conn.cursor() as cur:
            cur.execute(f'SELECT {quoted_cols} FROM public."{table}" WHERE {" AND ".join(where)} LIMIT 1', tuple(params))
            row = cur.fetchone()
        return dict(row) if row else None

    def _apply_updates(self, conn: Any, table: str, record_id: int, updates: dict[str, Any]) -> None:
        set_sql = []
        params = []
        for key, value in updates.items():
            if value in {"NOW()", "CURRENT_DATE"}:
                set_sql.append(f'"{key}" = {value}')
            elif isinstance(value, (dict, list)):
                set_sql.append(f'"{key}" = %s::jsonb')
                params.append(json.dumps(value, default=str))
            else:
                set_sql.append(f'"{key}" = %s')
                params.append(value)
        params.append(record_id)
        with conn.cursor() as cur:
            cur.execute(f'UPDATE public."{table}" SET {", ".join(set_sql)} WHERE id = %s', tuple(params))

    def _insert_version(self, conn: Any, source_table: str, record_type: str, record_id: int, record_snapshot: dict[str, Any], reason: str, current_user: dict[str, Any]) -> None:
        table = self._first_existing_table(conn, ["record_versions", "record_version_history", "daily_notes_versions"])
        if not table:
            return
        cols = self._columns(conn, table)
        payload = {
            "record_type": record_type,
            "record_id": record_id,
            "daily_note_id": record_id if record_type == "daily" else None,
            "source_table": source_table,
            "snapshot": record_snapshot,
            "content": record_snapshot,
            "reason": reason,
            "created_by": self._current_user_id(current_user),
            "user_id": self._current_user_id(current_user),
            "created_at": "NOW()",
        }
        values = {key: value for key, value in payload.items() if key in cols and value is not None}
        if not values:
            return
        col_sql = ", ".join([f'"{key}"' for key in values])
        placeholders, params = self._placeholders(values.values())
        with conn.cursor() as cur:
            cur.execute(f'INSERT INTO public."{table}" ({col_sql}) VALUES ({", ".join(placeholders)})', tuple(params))

    def _insert_review_log(self, conn: Any, record_type: str, record_id: int, action: str, comment: str | None, current_user: dict[str, Any]) -> None:
        table = self._first_existing_table(conn, ["manager_review_log", "record_review_log", "record_workflow_events", "audit_log", "leadership_oversight_log"])
        if not table:
            return
        cols = self._columns(conn, table)
        payload = {
            "record_type": record_type,
            "record_id": record_id,
            "source_id": record_id,
            "action": action,
            "status": action,
            "workflow_status": action,
            "comment": comment,
            "notes": comment,
            "user_id": self._current_user_id(current_user),
            "created_by": self._current_user_id(current_user),
            "home_id": self._current_home_id(current_user),
            "provider_id": self._current_provider_id(current_user),
            "metadata": {"source": "workspace_records_service"},
            "created_at": "NOW()",
        }
        values = {key: value for key, value in payload.items() if key in cols and value is not None}
        if not values:
            return
        col_sql = ", ".join([f'"{key}"' for key in values])
        placeholders, params = self._placeholders(values.values())
        with conn.cursor() as cur:
            cur.execute(f'INSERT INTO public."{table}" ({col_sql}) VALUES ({", ".join(placeholders)})', tuple(params))

    def _log_action_safe(self, record_type: str, record_id: int | None, action: str, comment: str | None, current_user: dict[str, Any]) -> None:
        if not record_id:
            return
        conn = None
        try:
            conn = get_db_connection()
            self._insert_review_log(conn, record_type, record_id, action, comment, current_user)
            conn.commit()
        except Exception:
            if conn is not None:
                conn.rollback()
        finally:
            if conn is not None:
                release_db_connection(conn)

    def _placeholders(self, values: Any) -> tuple[list[str], list[Any]]:
        placeholders: list[str] = []
        params: list[Any] = []
        for value in values:
            if value in {"NOW()", "CURRENT_DATE"}:
                placeholders.append(value)
            elif isinstance(value, (dict, list)):
                placeholders.append("%s::jsonb")
                params.append(json.dumps(value, default=str))
            else:
                placeholders.append("%s")
                params.append(value)
        return placeholders, params

    def _table_for(self, record_type: str) -> str | None:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                for table in RECORD_TABLES.get(record_type, []):
                    cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s) AS exists", (table,))
                    row = cur.fetchone()
                    exists = row.get("exists") if isinstance(row, dict) else row and row[0]
                    if exists:
                        return table
        except Exception:
            return None
        finally:
            if conn is not None:
                release_db_connection(conn)
        return None

    def _first_existing_table(self, conn: Any, names: list[str]) -> str | None:
        with conn.cursor() as cur:
            for name in names:
                cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s) AS exists", (name,))
                row = cur.fetchone()
                exists = row.get("exists") if isinstance(row, dict) else row and row[0]
                if exists:
                    return name
        return None

    def _columns(self, conn: Any, table: str) -> set[str]:
        with conn.cursor() as cur:
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s", (table,))
            return {str(row["column_name"] if isinstance(row, dict) else row[0]) for row in cur.fetchall()}

    def _status_col(self, cols: set[str]) -> str | None:
        return self._first_col(cols, STATUS_COLUMNS)

    def _first_col(self, cols: set[str], names: Any) -> str | None:
        for name in names:
            if name in cols:
                return name
        return None

    def _title_for(self, record_type: str, payload: dict[str, Any]) -> str:
        labels = {
            "daily": "Daily record",
            "incident": "Incident record",
            "safeguarding": "Safeguarding concern",
            "missing": "Missing episode",
            "keywork": "Keywork session",
            "direct_work": "Direct work session",
            "handover": "Shift handover",
            "handover_item": "Handover item",
            "support_plan": "Support plan",
            "health": "Health record",
            "education": "Education record",
            "family_contact": "Family contact",
            "review_meeting": "Review meeting",
        }
        return labels.get(record_type, "Care record")

    def _safe_int(self, value: Any) -> int | None:
        try:
            parsed = int(value)
            return parsed if parsed > 0 else None
        except Exception:
            return None

    def _current_home_id(self, current_user: dict[str, Any]) -> int | None:
        return self._safe_int(current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id"))

    def _current_provider_id(self, current_user: dict[str, Any]) -> int | None:
        return self._safe_int(current_user.get("provider_id") or current_user.get("organisation_id") or current_user.get("org_id"))

    def _current_user_id(self, current_user: dict[str, Any]) -> int | None:
        return self._safe_int(current_user.get("id") or current_user.get("user_id") or current_user.get("sub"))
