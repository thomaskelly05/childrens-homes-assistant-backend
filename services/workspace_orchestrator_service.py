from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from db.connection import get_db_connection, release_db_connection
from services.inspection_os_service import InspectionOSService
from services.operational_intelligence_service import build_operational_intelligence


CARE_SOURCES: tuple[dict[str, str], ...] = (
    {"table": "daily_notes", "type": "daily_note", "date": "note_date", "summary": "presentation", "title": "Daily note"},
    {"table": "incidents", "type": "incident", "date": "incident_datetime", "summary": "summary", "title": "Incident"},
    {"table": "safeguarding_records", "type": "safeguarding", "date": "concern_datetime", "summary": "concern_details", "title": "Safeguarding"},
    {"table": "risk_assessments", "type": "risk_assessment", "date": "review_date", "summary": "summary", "title": "Risk assessment"},
    {"table": "missing_episodes", "type": "missing_episode", "date": "start_datetime", "summary": "outcome", "title": "Missing episode"},
    {"table": "keywork_sessions", "type": "keywork", "date": "session_date", "summary": "summary", "title": "Keywork"},
    {"table": "support_plans", "type": "support_plan", "date": "review_date", "summary": "summary", "title": "Support plan"},
    {"table": "health_records", "type": "health", "date": "event_datetime", "summary": "summary", "title": "Health"},
    {"table": "education_records", "type": "education", "date": "record_date", "summary": "education_summary", "title": "Education"},
    {"table": "family_contact_records", "type": "family_contact", "date": "contact_datetime", "summary": "post_contact_presentation", "title": "Family contact"},
)

MANAGER_ROLES = {"manager", "registered_manager", "deputy_manager", "responsible_individual", "ri", "provider_admin", "admin", "super_admin", "superadmin", "administrator"}


def _serialise(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _rowdict(row: Any) -> dict[str, Any]:
    return {key: _serialise(value) for key, value in dict(row).items()}


def _safe_int(value: Any) -> int | None:
    try:
        parsed = int(value)
        return parsed if parsed > 0 else None
    except Exception:
        return None


class WorkspaceOrchestratorService:
    """Unified Clearcare-competitor workspace layer.

    This service does not create a second system. It composes existing records,
    documents, actions, inspection OS and operational intelligence into one
    practical workspace for children, staff, managers and Inspection evidence preparation.
    """

    def child_workspace(self, *, young_person_id: int, current_user: dict[str, Any], days: int = 30) -> dict[str, Any]:
        child = self._one("SELECT * FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
        home_id = _safe_int(child.get("home_id") if child else None) or self._home_id(current_user)
        events = self._care_events(young_person_id=young_person_id, home_id=None, days=days, limit=120)
        documents = self._documents(young_person_id=young_person_id, home_id=None, limit=80)
        actions = self._tasks(young_person_id=young_person_id, home_id=None, limit=80)
        approvals = self._approvals_for_documents(documents)
        review_queue = self._manager_review_queue(young_person_id=young_person_id, home_id=None, limit=60)
        inspection = self._safe_inspection_child(young_person_id, current_user)

        return {
            "ok": True,
            "scope": "child",
            "generated_at": self._now(),
            "young_person_id": young_person_id,
            "home_id": home_id,
            "child": child,
            "journey": {
                "recent_events": events,
                "counts": self._counts(events),
                "timeline": events[:40],
                "lived_experience_prompts": [
                    "What has changed for this child recently?",
                    "Where is the child voice visible or missing?",
                    "What risks are increasing or reducing?",
                    "What do adults need to hold in mind today?",
                ],
            },
            "adult_workspace": {
                "today_focus": self._today_focus(events, actions, documents),
                "actions": actions,
                "handover_seed": events[:12],
            },
            "manager_oversight": {
                "review_queue": review_queue,
                "documents_waiting_approval": [d for d in documents if str(d.get("approval_status") or "").lower() in {"pending", "submitted", "changes_requested"}],
                "approvals": approvals,
            },
            "ofsted_readiness": inspection,
            "documents": documents,
            "assistant_context": {
                "suggested_prompts": [
                    "Summarise this child's journey over the last 30 days.",
                    "What should staff know for handover?",
                    "What evidence supports Inspection evidence preparation for this child?",
                    "What manager oversight is missing?",
                ]
            },
        }

    def home_workspace(self, *, home_id: int, current_user: dict[str, Any], days: int = 30) -> dict[str, Any]:
        home = self._one("SELECT * FROM homes WHERE id = %s LIMIT 1", (home_id,))
        young_people = self._rows("SELECT * FROM young_people WHERE home_id = %s ORDER BY first_name, last_name LIMIT 200", (home_id,))
        events = self._care_events(young_person_id=None, home_id=home_id, days=days, limit=200)
        documents = self._documents(young_person_id=None, home_id=home_id, limit=120)
        actions = self._tasks(young_person_id=None, home_id=home_id, limit=120)
        review_queue = self._manager_review_queue(young_person_id=None, home_id=home_id, limit=100)
        inspection = self._safe_inspection_home(home_id, current_user)
        intelligence = self._safe_operational_intelligence("manager", current_user, days)

        return {
            "ok": True,
            "scope": "home",
            "generated_at": self._now(),
            "home_id": home_id,
            "home": home,
            "children": young_people,
            "child_journey_overview": {
                "recent_events": events[:80],
                "counts": self._counts(events),
                "children_count": len(young_people),
            },
            "adult_work_life": {
                "actions": actions,
                "documents_needing_work": [d for d in documents if self._document_needs_work(d)],
                "manager_review_queue": review_queue,
            },
            "manager_oversight": {
                "review_queue": review_queue,
                "open_or_overdue_actions": [a for a in actions if not a.get("completed") and str(a.get("status") or "open").lower() != "done"],
                "leadership_brief": inspection.get("leadership_oversight") if isinstance(inspection, dict) else None,
            },
            "ofsted_ready_at_all_times": {
                "inspection_os": inspection,
                "operational_intelligence": intelligence,
            },
            "documents": documents,
            "assistant_context": {
                "suggested_prompts": [
                    "Give me the home operating brief for today.",
                    "What would Ofsted ask us about this week?",
                    "Which documents need approval or manager comments?",
                    "What patterns are emerging across the home?",
                ]
            },
        }

    def manager_workspace(self, *, current_user: dict[str, Any], days: int = 30) -> dict[str, Any]:
        home_id = self._home_id(current_user)
        if not home_id:
            return {"ok": False, "error": "no_home_context", "detail": "No home_id is available for this manager workspace."}
        return self.home_workspace(home_id=home_id, current_user=current_user, days=days)

    def ofsted_workspace(self, *, home_id: int, current_user: dict[str, Any], days: int = 90) -> dict[str, Any]:
        inspection = self._safe_inspection_home(home_id, current_user)
        intelligence = self._safe_operational_intelligence("manager", current_user, days)
        documents = self._documents(young_person_id=None, home_id=home_id, limit=200)
        actions = self._tasks(young_person_id=None, home_id=home_id, limit=200)

        return {
            "ok": True,
            "scope": "ofsted",
            "generated_at": self._now(),
            "home_id": home_id,
            "inspection_os": inspection,
            "operational_intelligence": intelligence,
            "evidence_workspace": {
                "documents": documents,
                "actions": actions,
                "documents_waiting_approval": [d for d in documents if self._document_needs_work(d)],
                "suggested_evidence_questions": [
                    "Where is child voice visible?",
                    "Where is leadership oversight evidenced?",
                    "Which risks have clear follow-through?",
                    "Which documents are expired, pending approval or weak?",
                ],
            },
        }

    def _care_events(self, *, young_person_id: int | None, home_id: int | None, days: int, limit: int) -> list[dict[str, Any]]:
        start = date.today() - timedelta(days=max(1, min(int(days or 30), 365)))
        output: list[dict[str, Any]] = []
        for source in CARE_SOURCES:
            output.extend(self._source_rows(source, young_person_id=young_person_id, home_id=home_id, start=start, limit=limit))
        return sorted(output, key=lambda item: str(item.get("event_date") or ""), reverse=True)[:limit]

    def _source_rows(self, source: dict[str, str], *, young_person_id: int | None, home_id: int | None, start: date, limit: int) -> list[dict[str, Any]]:
        table = source["table"]
        if not self._table_exists(table):
            return []
        columns = self._columns(table)
        if "id" not in columns:
            return []
        date_col = source["date"] if source["date"] in columns else "created_at" if "created_at" in columns else None
        if not date_col:
            return []
        summary_col = source["summary"] if source["summary"] in columns else None
        select_parts = [
            "id",
            f"'{source['type']}' AS record_type",
            f"'{source['title']}' AS title",
            f'"{date_col}" AS event_date',
            f"'{table}' AS source_table",
            f'COALESCE("{summary_col}"::text, \'\') AS summary' if summary_col else "'' AS summary",
        ]
        for col in ("young_person_id", "home_id", "provider_id", "created_by_user_id", "created_at", "updated_at"):
            select_parts.append(f'"{col}"' if col in columns else f"NULL AS {col}")
        where = [f'"{date_col}" >= %s']
        params: list[Any] = [start]
        if young_person_id and "young_person_id" in columns:
            where.append("young_person_id = %s")
            params.append(young_person_id)
        if home_id and "home_id" in columns:
            where.append("home_id = %s")
            params.append(home_id)
        if "archived" in columns:
            where.append("COALESCE(archived, FALSE) = FALSE")
        params.append(limit)
        return self._rows(f"SELECT {', '.join(select_parts)} FROM public.\"{table}\" WHERE {' AND '.join(where)} ORDER BY \"{date_col}\" DESC NULLS LAST, id DESC LIMIT %s", tuple(params))

    def _documents(self, *, young_person_id: int | None, home_id: int | None, limit: int) -> list[dict[str, Any]]:
        where = ["1=1"]
        params: list[Any] = []
        if young_person_id:
            where.append("young_person_id = %s")
            params.append(young_person_id)
        if home_id:
            where.append("home_id = %s")
            params.append(home_id)
        params.append(limit)
        return self._rows(f"""
            SELECT id, user_id, home_id, young_person_id, staff_id, document_type, title,
                   issue_date, review_date, expiry_date, owner_id, approval_required,
                   approval_status, confidentiality_level, created_at, updated_at, provider_id
            FROM documents
            WHERE {' AND '.join(where)}
            ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
            LIMIT %s
        """, tuple(params))

    def _tasks(self, *, young_person_id: int | None, home_id: int | None, limit: int) -> list[dict[str, Any]]:
        where = ["1=1"]
        params: list[Any] = []
        if young_person_id:
            where.append("young_person_id = %s")
            params.append(young_person_id)
        if home_id:
            where.append("home_id = %s")
            params.append(home_id)
        params.append(limit)
        return self._rows(f"""
            SELECT id, home_id, young_person_id, title, task, task_type, task_date, due_date,
                   priority, status, completed, assigned_to_user_id, assigned_role,
                   source_table, source_id, created_at, updated_at, completed_at
            FROM tasks
            WHERE {' AND '.join(where)}
            ORDER BY completed ASC, due_date ASC NULLS LAST, task_date DESC NULLS LAST, created_at DESC
            LIMIT %s
        """, tuple(params))

    def _approvals_for_documents(self, documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
        ids = [_safe_int(doc.get("id")) for doc in documents]
        ids = [item for item in ids if item]
        if not ids:
            return []
        return self._rows("""
            SELECT * FROM approvals
            WHERE source_table = 'documents' AND source_id = ANY(%s)
            ORDER BY requested_at DESC NULLS LAST, id DESC
            LIMIT 200
        """, (ids,))

    def _manager_review_queue(self, *, young_person_id: int | None, home_id: int | None, limit: int) -> list[dict[str, Any]]:
        if not self._table_exists("manager_review_queue"):
            return []
        columns = self._columns("manager_review_queue")
        where = ["1=1"]
        params: list[Any] = []
        if young_person_id and "young_person_id" in columns:
            where.append("young_person_id = %s")
            params.append(young_person_id)
        if home_id and "home_id" in columns:
            where.append("home_id = %s")
            params.append(home_id)
        params.append(limit)
        return self._rows(f"SELECT * FROM manager_review_queue WHERE {' AND '.join(where)} ORDER BY created_at DESC NULLS LAST, id DESC LIMIT %s", tuple(params))

    def _safe_inspection_child(self, young_person_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
        try:
            return InspectionOSService().child_operating_brief(young_person_id=young_person_id, current_user=current_user)
        except Exception as exc:
            return {"status": "unavailable", "error": str(exc)}

    def _safe_inspection_home(self, home_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
        try:
            return InspectionOSService().home_operating_brief(home_id=home_id, current_user=current_user)
        except Exception as exc:
            return {"status": "unavailable", "error": str(exc)}

    def _safe_operational_intelligence(self, scope: str, current_user: dict[str, Any], days: int) -> dict[str, Any]:
        try:
            return build_operational_intelligence(scope=scope, current_user=current_user, days=days)
        except Exception as exc:
            return {"ok": False, "status": "unavailable", "error": str(exc)}

    def _today_focus(self, events: list[dict[str, Any]], actions: list[dict[str, Any]], documents: list[dict[str, Any]]) -> dict[str, Any]:
        return {
            "latest_records": events[:8],
            "open_actions": [a for a in actions if not a.get("completed")][:10],
            "documents_needing_work": [d for d in documents if self._document_needs_work(d)][:10],
        }

    def _document_needs_work(self, document: dict[str, Any]) -> bool:
        status = str(document.get("approval_status") or "").lower()
        if status in {"pending", "submitted", "changes_requested", "rejected"}:
            return True
        expiry = document.get("expiry_date")
        review = document.get("review_date")
        today = date.today().isoformat()
        return bool((expiry and str(expiry) <= today) or (review and str(review) <= today))

    def _counts(self, events: list[dict[str, Any]]) -> dict[str, int]:
        counts: dict[str, int] = {}
        for event in events:
            key = str(event.get("record_type") or "record")
            counts[key] = counts.get(key, 0) + 1
        return counts

    def _home_id(self, current_user: dict[str, Any]) -> int | None:
        return _safe_int(current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id"))

    def _now(self) -> str:
        return datetime.utcnow().isoformat() + "Z"

    def _table_exists(self, table_name: str) -> bool:
        row = self._one("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s) AS exists", (table_name,))
        return bool(row.get("exists")) if row else False

    def _columns(self, table_name: str) -> set[str]:
        rows = self._rows("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s", (table_name,))
        return {str(row.get("column_name")) for row in rows if row.get("column_name")}

    def _one(self, query: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
        rows = self._rows(query, params)
        return rows[0] if rows else None

    def _rows(self, query: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(query, params)
                return [_rowdict(row) for row in cur.fetchall()]
        except Exception:
            return []
        finally:
            if conn is not None:
                release_db_connection(conn)
