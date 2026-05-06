from __future__ import annotations

import json
from typing import Any

from db.connection import get_db_connection, release_db_connection


RECORD_TABLES = {
    "daily": ["daily_records", "daily_notes", "young_people_daily_notes"],
    "incident": ["incidents", "incident_records", "young_people_incidents"],
    "safeguarding": ["safeguarding_records", "safeguarding_concerns", "safeguarding"],
    "missing": ["missing_episodes", "missing_from_care"],
}


class WorkspaceRecordsService:
    """Schema-aware workspace records and manager review service."""

    def list_records(self, *, record_type: str, current_user: dict[str, Any], young_person_id: int | None = None, limit: int = 20) -> dict[str, Any]:
        table = self._table_for(record_type)
        if not table:
            return {"ok": True, "record_type": record_type, "records": [], "warning": "No matching table found."}
        conn = None
        try:
            conn = get_db_connection()
            cols = self._columns(conn, table)
            select_cols = [c for c in ["id", "title", "summary", "content", "body", "notes", "mood", "incident_type", "status", "created_at", "updated_at", "young_person_id", "home_id", "created_by", "reviewed_by", "reviewed_at", "manager_comment"] if c in cols]
            if not select_cols:
                return {"ok": True, "record_type": record_type, "records": []}
            where = []
            params: list[Any] = []
            if young_person_id and "young_person_id" in cols:
                where.append("young_person_id = %s")
                params.append(young_person_id)
            home_id = self._current_home_id(current_user)
            if home_id and "home_id" in cols:
                where.append("home_id = %s")
                params.append(home_id)
            params.append(max(1, min(limit, 100)))
            where_sql = "WHERE " + " AND ".join(where) if where else ""
            order_col = "updated_at" if "updated_at" in cols else "created_at" if "created_at" in cols else "id"
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

    def review_queue(self, *, current_user: dict[str, Any], limit: int = 50) -> dict[str, Any]:
        all_records: list[dict[str, Any]] = []
        for record_type in RECORD_TABLES:
            result = self.list_records(record_type=record_type, current_user=current_user, limit=limit)
            for record in result.get("records") or []:
                status = str(record.get("status") or "").lower()
                if "review" in status or status in {"draft", "submitted", "pending", ""}:
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
            placeholders = []
            params = []
            for value in values.values():
                if value == "NOW()":
                    placeholders.append("NOW()")
                elif isinstance(value, (dict, list)):
                    placeholders.append("%s::jsonb")
                    params.append(json.dumps(value))
                else:
                    placeholders.append("%s")
                    params.append(value)
            query = f'INSERT INTO public."{table}" ({col_sql}) VALUES ({", ".join(placeholders)})'
            if "id" in cols:
                query += ' RETURNING "id"'
            with conn.cursor() as cur:
                cur.execute(query, tuple(params))
                row = cur.fetchone() if "id" in cols else None
            conn.commit()
            record_id = row.get("id") if isinstance(row, dict) and row else row[0] if row else None
            return {"ok": True, "record_type": record_type, "table": table, "id": record_id}
        except Exception as exc:
            if conn is not None:
                conn.rollback()
            return {"ok": False, "record_type": record_type, "error": repr(exc)}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def review_record(self, *, record_type: str, record_id: int, action: str, comment: str | None, current_user: dict[str, Any]) -> dict[str, Any]:
        table = self._table_for(record_type)
        if not table:
            return {"ok": False, "error": "No matching table found for this record type."}
        action_status = {"approve": "approved", "request_changes": "changes_requested", "reject": "rejected"}.get(action, action)
        conn = None
        try:
            conn = get_db_connection()
            cols = self._columns(conn, table)
            updates: dict[str, Any] = {}
            if "status" in cols:
                updates["status"] = action_status
            if "manager_comment" in cols:
                updates["manager_comment"] = comment
            elif "notes" in cols and comment:
                updates["notes"] = comment
            if "reviewed_by" in cols:
                updates["reviewed_by"] = self._current_user_id(current_user)
            if "reviewed_at" in cols:
                updates["reviewed_at"] = "NOW()"
            if "updated_at" in cols:
                updates["updated_at"] = "NOW()"
            if not updates:
                return {"ok": False, "error": "No compatible review columns found."}
            set_sql = []
            params = []
            for key, value in updates.items():
                if value == "NOW()":
                    set_sql.append(f'"{key}" = NOW()')
                else:
                    set_sql.append(f'"{key}" = %s')
                    params.append(value)
            params.append(record_id)
            with conn.cursor() as cur:
                cur.execute(f'UPDATE public."{table}" SET {", ".join(set_sql)} WHERE id = %s', tuple(params))
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

    def _insert_review_log(self, conn: Any, record_type: str, record_id: int, action: str, comment: str | None, current_user: dict[str, Any]) -> None:
        table = self._first_existing_table(conn, ["manager_review_log", "record_review_log", "audit_log", "leadership_oversight_log"])
        if not table:
            return
        cols = self._columns(conn, table)
        payload = {
            "record_type": record_type,
            "record_id": record_id,
            "action": action,
            "status": action,
            "comment": comment,
            "notes": comment,
            "user_id": self._current_user_id(current_user),
            "home_id": self._current_home_id(current_user),
            "metadata": {"source": "workspace_records_service"},
            "created_at": "NOW()",
        }
        values = {key: value for key, value in payload.items() if key in cols and value is not None}
        if not values:
            return
        col_sql = ", ".join([f'"{key}"' for key in values])
        placeholders = []
        params = []
        for value in values.values():
            if value == "NOW()":
                placeholders.append("NOW()")
            elif isinstance(value, (dict, list)):
                placeholders.append("%s::jsonb")
                params.append(json.dumps(value))
            else:
                placeholders.append("%s")
                params.append(value)
        with conn.cursor() as cur:
            cur.execute(f'INSERT INTO public."{table}" ({col_sql}) VALUES ({", ".join(placeholders)})', tuple(params))

    def _values_for_insert(self, record_type: str, payload: dict[str, Any], current_user: dict[str, Any], cols: set[str]) -> dict[str, Any]:
        base = {
            "title": payload.get("title") or self._title_for(record_type, payload),
            "summary": payload.get("summary") or payload.get("what_happened") or payload.get("description"),
            "content": payload,
            "body": payload.get("what_happened") or payload.get("description") or payload.get("notes"),
            "notes": payload.get("notes") or payload.get("staff_response"),
            "mood": payload.get("mood"),
            "incident_type": payload.get("incident_type") or payload.get("type"),
            "status": payload.get("status") or "submitted_for_review",
            "young_person_id": self._safe_int(payload.get("young_person_id")),
            "home_id": self._safe_int(payload.get("home_id")) or self._current_home_id(current_user),
            "created_by": self._current_user_id(current_user),
            "created_at": "NOW()",
            "updated_at": "NOW()",
        }
        return {key: value for key, value in base.items() if key in cols and value is not None}

    def _normalise(self, row: dict[str, Any], record_type: str) -> dict[str, Any]:
        content = row.get("content") or {}
        if isinstance(content, str):
            try:
                content = json.loads(content)
            except Exception:
                content = {"text": content}
        return {
            "id": row.get("id"),
            "record_type": record_type,
            "title": row.get("title") or row.get("incident_type") or self._title_for(record_type, row),
            "summary": row.get("summary") or row.get("body") or row.get("notes") or (content.get("what_happened") if isinstance(content, dict) else None),
            "status": row.get("status"),
            "mood": row.get("mood"),
            "young_person_id": row.get("young_person_id"),
            "home_id": row.get("home_id"),
            "created_by": row.get("created_by"),
            "reviewed_by": row.get("reviewed_by"),
            "reviewed_at": row.get("reviewed_at"),
            "manager_comment": row.get("manager_comment"),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
            "content": content,
        }

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

    def _title_for(self, record_type: str, payload: dict[str, Any]) -> str:
        labels = {"daily": "Daily record", "incident": "Incident record", "safeguarding": "Safeguarding concern", "missing": "Missing episode"}
        return labels.get(record_type, "Care record")

    def _safe_int(self, value: Any) -> int | None:
        try:
            parsed = int(value)
            return parsed if parsed > 0 else None
        except Exception:
            return None

    def _current_home_id(self, current_user: dict[str, Any]) -> int | None:
        return self._safe_int(current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id"))

    def _current_user_id(self, current_user: dict[str, Any]) -> int | None:
        return self._safe_int(current_user.get("id") or current_user.get("user_id") or current_user.get("sub"))
