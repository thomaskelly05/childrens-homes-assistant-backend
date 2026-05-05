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
    """Small compatibility layer for workspace record lists and creation.

    The real database schema may vary between deployments. This service detects
    existing tables/columns and writes only fields that exist. If no matching
    table exists, it returns a safe mock-style response instead of crashing the
    workspace.
    """

    def list_records(self, *, record_type: str, current_user: dict[str, Any], young_person_id: int | None = None, limit: int = 20) -> dict[str, Any]:
        table = self._table_for(record_type)
        if not table:
            return {"ok": True, "record_type": record_type, "records": [], "warning": "No matching table found."}
        conn = None
        try:
            conn = get_db_connection()
            cols = self._columns(conn, table)
            select_cols = [c for c in ["id", "title", "summary", "content", "body", "notes", "mood", "incident_type", "status", "created_at", "updated_at", "young_person_id", "home_id", "created_by"] if c in cols]
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
            return_sql = "id" if "id" in cols else None
            query = f'INSERT INTO public."{table}" ({col_sql}) VALUES ({", ".join(placeholders)})'
            if return_sql:
                query += ' RETURNING "id"'
            with conn.cursor() as cur:
                cur.execute(query, tuple(params))
                row = cur.fetchone() if return_sql else None
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
