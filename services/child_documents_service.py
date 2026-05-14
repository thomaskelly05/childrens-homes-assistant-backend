from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from db.connection import get_db_connection, release_db_connection
from services.document_security_service import scope_matches
from services.document_template_service import document_template_service

DOCUMENT_STATUSES = {"draft", "autosaved", "submitted", "under_review", "amendment_requested", "approved", "escalated", "archived", "ai_improved", "submitted_for_review", "changes_requested", "superseded"}

CORE_DOCUMENT_GROUPS = {
    "Care and placement": ["Placement Plan", "Care Plan"],
    "Safety": ["Risk Assessment", "Missing From Care Plan"],
    "Therapeutic support": ["Behaviour Support Plan", "Communication Profile", "Sensory Profile"],
    "Health and education": ["Health Care Plan", "Personal Education Plan"],
    "Identity": ["Life Story / Identity"],
}

DEFAULT_SECTIONS = {
    "Placement Plan": ["About me", "My day-to-day care", "Routines", "Relationships", "Risks and support", "What adults must do", "Review notes"],
    "Care Plan": ["Legal context", "Care objectives", "Current needs", "Family time", "Health", "Education", "Actions"],
    "Risk Assessment": ["Current risks", "Triggers", "Protective factors", "Control measures", "Escalation plan", "Review evidence"],
    "Behaviour Support Plan": ["Behaviour as communication", "Early signs", "Triggers", "De-escalation", "Repair and reflection", "What works", "Plan updates"],
    "Missing From Care Plan": ["Known risks", "Known locations", "Associates", "Prevention", "Immediate response", "Return-home work", "Learning"],
    "Health Care Plan": ["Health overview", "Medication", "Appointments", "CAMHS / emotional wellbeing", "Sleep and diet", "Actions"],
    "Personal Education Plan": ["Education overview", "Attendance", "Strengths", "Barriers", "Targets", "Support strategies", "Review notes"],
    "Communication Profile": ["How I communicate", "How I show distress", "How adults should communicate", "Choices and wishes", "What not to do"],
    "Sensory Profile": ["Sensory overview", "Triggers", "What helps", "Environment", "Regulation plan", "Review notes"],
    "Life Story / Identity": ["Who I am", "Culture and identity", "Important people", "Memories", "Achievements", "Wishes and feelings"],
}


class ChildDocumentsService:
    """SharePoint-style child document library for IndiCare."""

    def ensure_schema(self, conn: Any) -> None:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS child_documents (
                    id SERIAL PRIMARY KEY,
                    young_person_id INTEGER NOT NULL,
                    home_id INTEGER,
                    provider_id INTEGER,
                    document_type TEXT NOT NULL,
                    document_group TEXT NOT NULL DEFAULT 'General',
                    title TEXT NOT NULL,
                    auto_title TEXT,
                    editable_title TEXT,
                    status TEXT NOT NULL DEFAULT 'draft',
                    sections JSONB NOT NULL DEFAULT '{}'::jsonb,
                    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                    document_date DATE NOT NULL DEFAULT CURRENT_DATE,
                    created_time TIME NOT NULL DEFAULT CURRENT_TIME,
                    created_by INTEGER,
                    updated_by INTEGER,
                    reviewed_by INTEGER,
                    reviewed_at TIMESTAMPTZ,
                    archived_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_child_documents_child_date ON child_documents (young_person_id, document_date DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_child_documents_group ON child_documents (document_group)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_child_documents_status ON child_documents (status)")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS child_document_versions (
                    id SERIAL PRIMARY KEY,
                    document_id INTEGER NOT NULL REFERENCES child_documents(id) ON DELETE CASCADE,
                    version_number INTEGER NOT NULL,
                    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
                    reason TEXT,
                    created_by INTEGER,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_child_document_versions_doc ON child_document_versions (document_id, version_number DESC)")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS child_document_comments (
                    id SERIAL PRIMARY KEY,
                    document_id INTEGER NOT NULL REFERENCES child_documents(id) ON DELETE CASCADE,
                    comment TEXT NOT NULL,
                    comment_type TEXT NOT NULL DEFAULT 'review',
                    created_by INTEGER,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_child_document_comments_doc ON child_document_comments (document_id, created_at DESC)")

    def list_documents(self, *, current_user: dict[str, Any], young_person_id: int | None = None, group: str | None = None, status: str | None = None, query: str | None = None, date_from: str | None = None, date_to: str | None = None, include_archived: bool = False, limit: int = 100) -> dict[str, Any]:
        conn = None
        try:
            conn = get_db_connection()
            self.ensure_schema(conn)
            where = []
            params: list[Any] = []
            if young_person_id:
                where.append("young_person_id = %s")
                params.append(young_person_id)
            home_id = self._current_home_id(current_user)
            if home_id:
                where.append("(home_id = %s OR home_id IS NULL)")
                params.append(home_id)
            else:
                provider_id = self._current_provider_id(current_user)
                role = str(current_user.get("role") or "").strip().lower()
                if provider_id and role in {"admin", "super_admin", "superadmin", "founder", "owner", "provider_admin", "responsible_individual", "ri"}:
                    where.append("provider_id = %s")
                    params.append(provider_id)
                elif role not in {"admin", "super_admin", "superadmin", "founder", "owner"}:
                    where.append("1 = 0")
            if group:
                where.append("document_group = %s")
                params.append(group)
            if status:
                where.append("status = %s")
                params.append(status)
            elif not include_archived:
                where.append("status <> 'archived'")
            if query:
                where.append("(title ILIKE %s OR document_type ILIKE %s OR editable_title ILIKE %s)")
                params.extend([f"%{query}%", f"%{query}%", f"%{query}%"])
            if date_from:
                where.append("document_date >= %s")
                params.append(date_from)
            if date_to:
                where.append("document_date <= %s")
                params.append(date_to)
            where_sql = "WHERE " + " AND ".join(where) if where else ""
            params.append(max(1, min(limit, 250)))
            with conn.cursor() as cur:
                cur.execute(f"SELECT * FROM child_documents {where_sql} ORDER BY document_date DESC, created_time DESC, updated_at DESC LIMIT %s", tuple(params))
                rows = [dict(row) for row in cur.fetchall()]
            return {"ok": True, "documents": [self._normalise(row) for row in rows], "groups": self._groups(rows), "calendar": self._calendar(rows)}
        except Exception as exc:
            return {"ok": False, "error": repr(exc), "documents": []}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def create_document(self, *, payload: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
        conn = None
        try:
            conn = get_db_connection()
            self.ensure_schema(conn)
            doc_type = payload.get("document_type") or payload.get("name") or "Child Document"
            young_person_id = self._safe_int(payload.get("young_person_id"))
            if young_person_id is None:
                return {"ok": False, "error": "Child documents require an active child context"}
            group = payload.get("document_group") or self._group_for(doc_type)
            auto_title = self._auto_title(doc_type, payload.get("child_name"), payload.get("document_date"))
            title = payload.get("title") or payload.get("editable_title") or auto_title
            sections = payload.get("sections") or self._blank_sections(doc_type)
            metadata = payload.get("metadata") or {}
            status = payload.get("status") if payload.get("status") in DOCUMENT_STATUSES else "draft"
            requested_scope = {
                "home_id": self._safe_int(payload.get("home_id")) or self._current_home_id(current_user),
                "provider_id": self._safe_int(payload.get("provider_id")) or self._current_provider_id(current_user),
            }
            if not scope_matches(current_user, requested_scope):
                return {"ok": False, "error": "Permission denied"}
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO child_documents (young_person_id, home_id, provider_id, document_type, document_group, title, auto_title, editable_title, status, sections, metadata, document_date, created_time, created_by, updated_by)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s,COALESCE(%s::time, CURRENT_TIME),%s,%s)
                    RETURNING *
                    """,
                    (young_person_id, requested_scope["home_id"], requested_scope["provider_id"], doc_type, group, title, auto_title, payload.get("editable_title") or title, status, json.dumps(sections), json.dumps(metadata), payload.get("document_date") or datetime.utcnow().date().isoformat(), payload.get("created_time"), self._current_user_id(current_user), self._current_user_id(current_user)),
                )
                row = dict(cur.fetchone())
                self._insert_version(cur, row["id"], row, "created", current_user)
            conn.commit()
            return {"ok": True, "document": self._normalise(row)}
        except Exception as exc:
            if conn is not None:
                conn.rollback()
            return {"ok": False, "error": repr(exc)}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def get_document(self, *, document_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
        conn = None
        try:
            conn = get_db_connection()
            self.ensure_schema(conn)
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM child_documents WHERE id = %s LIMIT 1", (document_id,))
                row = cur.fetchone()
            if not row:
                return {"ok": False, "error": "Document not found"}
            row = dict(row)
            if not scope_matches(current_user, row):
                return {"ok": False, "error": "Permission denied"}
            return {"ok": True, "document": self._normalise(row)}
        except Exception as exc:
            return {"ok": False, "error": repr(exc)}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def update_document(self, *, document_id: int, payload: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
        conn = None
        try:
            conn = get_db_connection()
            self.ensure_schema(conn)
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM child_documents WHERE id = %s LIMIT 1", (document_id,))
                existing = cur.fetchone()
                if not existing:
                    return {"ok": False, "error": "Document not found"}
                existing = dict(existing)
                if not scope_matches(current_user, existing):
                    return {"ok": False, "error": "Permission denied"}
                self._insert_version(cur, document_id, existing, payload.get("version_reason") or "before_update", current_user)
                status = payload.get("status") if payload.get("status") in DOCUMENT_STATUSES else existing.get("status")
                cur.execute(
                    """
                    UPDATE child_documents
                    SET title = COALESCE(%s, title), editable_title = COALESCE(%s, editable_title), document_group = COALESCE(%s, document_group), status = COALESCE(%s, status), sections = COALESCE(%s::jsonb, sections), metadata = COALESCE(%s::jsonb, metadata), document_date = COALESCE(%s, document_date), created_time = COALESCE(%s::time, created_time), updated_by = %s, updated_at = NOW(), reviewed_by = CASE WHEN %s IN ('approved','changes_requested') THEN %s ELSE reviewed_by END, reviewed_at = CASE WHEN %s IN ('approved','changes_requested') THEN NOW() ELSE reviewed_at END, archived_at = CASE WHEN %s = 'archived' THEN NOW() ELSE archived_at END
                    WHERE id = %s RETURNING *
                    """,
                    (payload.get("title"), payload.get("editable_title"), payload.get("document_group"), status, json.dumps(payload.get("sections")) if payload.get("sections") is not None else None, json.dumps(payload.get("metadata")) if payload.get("metadata") is not None else None, payload.get("document_date"), payload.get("created_time"), self._current_user_id(current_user), status, self._current_user_id(current_user), status, status, document_id),
                )
                row = dict(cur.fetchone())
            conn.commit()
            return {"ok": True, "document": self._normalise(row)}
        except Exception as exc:
            if conn is not None:
                conn.rollback()
            return {"ok": False, "error": repr(exc)}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def add_comment(self, *, document_id: int, comment: str, current_user: dict[str, Any], comment_type: str = "review") -> dict[str, Any]:
        conn = None
        try:
            conn = get_db_connection()
            self.ensure_schema(conn)
            with conn.cursor() as cur:
                document = self._load_document_for_access(cur, document_id)
                if not document or not scope_matches(current_user, document):
                    return {"ok": False, "error": "Permission denied"}
                cur.execute("INSERT INTO child_document_comments (document_id, comment, comment_type, created_by) VALUES (%s,%s,%s,%s) RETURNING *", (document_id, comment, comment_type, self._current_user_id(current_user)))
                row = dict(cur.fetchone())
            conn.commit()
            return {"ok": True, "comment": row}
        except Exception as exc:
            if conn is not None:
                conn.rollback()
            return {"ok": False, "error": repr(exc)}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def versions(self, *, document_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
        conn = None
        try:
            conn = get_db_connection()
            self.ensure_schema(conn)
            with conn.cursor() as cur:
                document = self._load_document_for_access(cur, document_id)
                if not document or not scope_matches(current_user, document):
                    return {"ok": False, "error": "Permission denied", "versions": []}
                cur.execute("SELECT * FROM child_document_versions WHERE document_id = %s ORDER BY version_number DESC LIMIT 50", (document_id,))
                versions = [dict(row) for row in cur.fetchall()]
            return {"ok": True, "versions": versions}
        except Exception as exc:
            return {"ok": False, "error": repr(exc), "versions": []}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def comments(self, *, document_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
        conn = None
        try:
            conn = get_db_connection()
            self.ensure_schema(conn)
            with conn.cursor() as cur:
                document = self._load_document_for_access(cur, document_id)
                if not document or not scope_matches(current_user, document):
                    return {"ok": False, "error": "Permission denied", "comments": []}
                cur.execute("SELECT * FROM child_document_comments WHERE document_id = %s ORDER BY created_at DESC LIMIT 100", (document_id,))
                comments = [dict(row) for row in cur.fetchall()]
            return {"ok": True, "comments": comments}
        except Exception as exc:
            return {"ok": False, "error": repr(exc), "comments": []}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def calendar(self, *, current_user: dict[str, Any], young_person_id: int | None = None, month: str | None = None) -> dict[str, Any]:
        date_from = date_to = None
        if month and len(month) == 7:
            date_from = f"{month}-01"
            year, mon = [int(part) for part in month.split("-")]
            next_year, next_mon = (year + 1, 1) if mon == 12 else (year, mon + 1)
            date_to = f"{next_year:04d}-{next_mon:02d}-01"
        result = self.list_documents(current_user=current_user, young_person_id=young_person_id, date_from=date_from, date_to=date_to, include_archived=True, limit=250)
        if not result.get("ok"):
            return result
        return {"ok": True, "calendar": result.get("calendar", {}), "documents": result.get("documents", [])}

    def _normalise(self, row: dict[str, Any]) -> dict[str, Any]:
        row = dict(row)
        for key in ["sections", "metadata"]:
            if isinstance(row.get(key), str):
                try:
                    row[key] = json.loads(row[key])
                except Exception:
                    row[key] = {}
        return row

    def _insert_version(self, cur: Any, document_id: int, snapshot: dict[str, Any], reason: str, current_user: dict[str, Any]) -> None:
        cur.execute("SELECT COALESCE(MAX(version_number), 0) + 1 FROM child_document_versions WHERE document_id = %s", (document_id,))
        row = cur.fetchone()
        version_number = row[0] if not isinstance(row, dict) else next(iter(row.values()))
        cur.execute("INSERT INTO child_document_versions (document_id, version_number, snapshot, reason, created_by) VALUES (%s,%s,%s::jsonb,%s,%s)", (document_id, version_number, json.dumps(snapshot, default=str), reason, self._current_user_id(current_user)))

    def _load_document_for_access(self, cur: Any, document_id: int) -> dict[str, Any] | None:
        cur.execute("SELECT id, home_id, provider_id, young_person_id FROM child_documents WHERE id = %s LIMIT 1", (document_id,))
        row = cur.fetchone()
        return dict(row) if row else None

    def _auto_title(self, doc_type: str, child_name: str | None, document_date: str | None) -> str:
        date = document_date or datetime.utcnow().date().isoformat()
        who = child_name or "Young person"
        return f"{who} - {doc_type} - {date}"

    def _blank_sections(self, doc_type: str) -> dict[str, str]:
        template_id = f"child_{doc_type.lower().replace('/', ' ').replace('&', 'and').replace('-', ' ').replace(' ', '_')}"
        try:
            return document_template_service.blank_sections(template_id)
        except Exception:
            pass
        return {section: "" for section in DEFAULT_SECTIONS.get(doc_type, ["Overview", "Needs", "Risks", "Actions", "Review notes"])}

    def _group_for(self, doc_type: str) -> str:
        for group, docs in CORE_DOCUMENT_GROUPS.items():
            if doc_type in docs:
                return group
        return "General"

    def _groups(self, rows: list[dict[str, Any]]) -> dict[str, int]:
        groups: dict[str, int] = {}
        for row in rows:
            key = row.get("document_group") or "General"
            groups[key] = groups.get(key, 0) + 1
        return groups

    def _calendar(self, rows: list[dict[str, Any]]) -> dict[str, int]:
        calendar: dict[str, int] = {}
        for row in rows:
            key = str(row.get("document_date"))
            calendar[key] = calendar.get(key, 0) + 1
        return calendar

    def _safe_int(self, value: Any) -> int | None:
        try:
            parsed = int(value)
            return parsed if parsed > 0 else None
        except Exception:
            return None

    def _current_user_id(self, current_user: dict[str, Any]) -> int | None:
        return self._safe_int(current_user.get("id") or current_user.get("user_id") or current_user.get("sub"))

    def _current_home_id(self, current_user: dict[str, Any]) -> int | None:
        return self._safe_int(current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id"))

    def _current_provider_id(self, current_user: dict[str, Any]) -> int | None:
        return self._safe_int(current_user.get("provider_id"))
