from __future__ import annotations

from collections import Counter
from typing import Any

from db.connection import get_db_connection, release_db_connection
from services.ofsted_evidence_engine_service import OfstedEvidenceEngineService
from services.workspace_orchestrator_service import WorkspaceOrchestratorService


class ManagerIntelligenceService:
    """Manager intelligence dashboard for the home.

    This combines workspace records, Ofsted evidence, document gaps and assistant
    usage into a practical oversight dashboard for registered managers and RIs.
    """

    def __init__(self) -> None:
        self.workspace = WorkspaceOrchestratorService()
        self.evidence = OfstedEvidenceEngineService()

    def build_dashboard(self, *, current_user: dict[str, Any], days: int = 30, home_id: int | None = None) -> dict[str, Any]:
        resolved_home_id = home_id or self._current_home_id(current_user)
        if not resolved_home_id:
            return {"ok": False, "error": "no_home_context", "detail": "No home context is available."}

        workspace = self.workspace.home_workspace(home_id=resolved_home_id, current_user=current_user, days=days)
        evidence = self.evidence.build_home_evidence(workspace)
        events = workspace.get("child_journey_overview", {}).get("recent_events") or []
        documents = workspace.get("documents") or []
        review_queue = workspace.get("manager_oversight", {}).get("review_queue") or []
        actions = workspace.get("manager_oversight", {}).get("open_or_overdue_actions") or []

        return {
            "ok": True,
            "home_id": resolved_home_id,
            "days": days,
            "summary": {
                "risk_status": self._risk_status(events, review_queue),
                "evidence_cards": (evidence.get("summary") or {}).get("total_cards", 0),
                "evidence_gaps": len(evidence.get("gaps") or []),
                "review_queue": len(review_queue),
                "open_actions": len(actions),
            },
            "risks": self._risk_analysis(events, review_queue),
            "evidence_gaps": evidence.get("gaps") or [],
            "assistant_insights": self._assistant_usage(resolved_home_id, days),
            "document_gaps": self._document_gaps(documents),
            "recommended_actions": self._recommended_actions(events, review_queue, evidence.get("gaps") or []),
        }

    def _risk_analysis(self, events: list[dict[str, Any]], review_queue: list[dict[str, Any]]) -> dict[str, Any]:
        counts = self._counts(events)
        incident_count = counts.get("incident", 0) + counts.get("incidents", 0)
        safeguarding_count = counts.get("safeguarding", 0) + counts.get("safeguarding_records", 0)
        missing_count = counts.get("missing_episode", 0) + counts.get("missing_episodes", 0)
        high_review_items = [item for item in review_queue if self._is_high_risk_review(item)]
        return {
            "status": self._risk_status(events, review_queue),
            "incident_count": incident_count,
            "safeguarding_count": safeguarding_count,
            "missing_count": missing_count,
            "high_priority_review_items": len(high_review_items),
            "signals": self._risk_signals(incident_count, safeguarding_count, missing_count, len(high_review_items)),
        }

    def _risk_status(self, events: list[dict[str, Any]], review_queue: list[dict[str, Any]]) -> str:
        analysis_counts = self._counts(events)
        safeguarding = analysis_counts.get("safeguarding", 0) + analysis_counts.get("safeguarding_records", 0)
        missing = analysis_counts.get("missing_episode", 0) + analysis_counts.get("missing_episodes", 0)
        incidents = analysis_counts.get("incident", 0) + analysis_counts.get("incidents", 0)
        high_review = any(self._is_high_risk_review(item) for item in review_queue)
        if safeguarding or missing >= 2 or high_review:
            return "high"
        if incidents >= 3 or review_queue:
            return "medium"
        return "low"

    def _risk_signals(self, incidents: int, safeguarding: int, missing: int, high_review: int) -> list[dict[str, str]]:
        signals = []
        if safeguarding:
            signals.append({"level": "high", "message": f"{safeguarding} safeguarding record(s) visible", "action": "Check oversight, external notifications and follow-up."})
        if missing >= 2:
            signals.append({"level": "high", "message": f"{missing} missing episode(s) visible", "action": "Review missing plan, return work and patterns."})
        if incidents >= 3:
            signals.append({"level": "medium", "message": f"{incidents} incident record(s) visible", "action": "Review triggers, staff response and behaviour plans."})
        if high_review:
            signals.append({"level": "high", "message": f"{high_review} high-risk item(s) awaiting review", "action": "Prioritise manager review immediately."})
        if not signals:
            signals.append({"level": "low", "message": "No high-level risk signal returned by current workspace sample", "action": "Continue sampling records and checking child voice."})
        return signals

    def _document_gaps(self, documents: list[dict[str, Any]]) -> list[dict[str, str]]:
        text = " ".join(f"{doc.get('title', '')} {doc.get('document_type', '')}" for doc in documents).lower()
        required = {
            "Behaviour support": ["behaviour", "pbs", "support plan"],
            "Risk assessment": ["risk assessment", "risk"],
            "Placement plan": ["placement plan"],
            "Missing from care": ["missing"],
            "Medication": ["medication", "mar"],
            "Safeguarding": ["safeguarding"],
        }
        gaps = []
        for area, keywords in required.items():
            if not any(keyword in text for keyword in keywords):
                gaps.append({"area": area, "gap": f"No obvious approved/current {area.lower()} document found in the workspace document set."})
        return gaps

    def _assistant_usage(self, home_id: int, days: int) -> list[dict[str, Any]]:
        conn = None
        try:
            conn = get_db_connection()
            table = self._first_existing_table(conn, ["assistant_query_log", "ai_interactions", "assistant_audit_log"])
            if not table:
                return [{"question": "No assistant usage log table found", "count": 0, "insight": "Create assistant_query_log or map existing AI log fields for richer staff uncertainty insights."}]
            cols = self._columns(conn, table)
            question_col = "question" if "question" in cols else "prompt" if "prompt" in cols else None
            if not question_col:
                return [{"question": "Assistant log present but no question/prompt column found", "count": 0, "insight": "Add question/prompt field to support usage analytics."}]
            where = []
            params: list[Any] = []
            if "home_id" in cols:
                where.append("home_id = %s")
                params.append(home_id)
            if "created_at" in cols:
                where.append("created_at >= NOW() - (%s || ' days')::interval")
                params.append(days)
            where_sql = "WHERE " + " AND ".join(where) if where else ""
            with conn.cursor() as cur:
                cur.execute(
                    f'SELECT "{question_col}" AS question, COUNT(*) AS count FROM public."{table}" {where_sql} GROUP BY "{question_col}" ORDER BY COUNT(*) DESC LIMIT 10',
                    tuple(params),
                )
                rows = [dict(row) for row in cur.fetchall()]
            return [
                {"question": row.get("question") or "Unknown", "count": row.get("count") or 0, "insight": "Repeated staff query may indicate a knowledge, policy or plan clarity gap."}
                for row in rows
            ] or [{"question": "No assistant queries found", "count": 0, "insight": "No staff uncertainty pattern visible yet."}]
        except Exception:
            return [{"question": "Assistant usage unavailable", "count": 0, "insight": "Usage analytics could not be read."}]
        finally:
            if conn is not None:
                release_db_connection(conn)

    def _recommended_actions(self, events: list[dict[str, Any]], review_queue: list[dict[str, Any]], gaps: list[dict[str, Any]]) -> list[dict[str, str]]:
        actions = []
        if review_queue:
            actions.append({"priority": "high", "action": f"Complete {len(review_queue)} manager review item(s)."})
        for gap in gaps[:5]:
            actions.append({"priority": "medium", "action": f"Address evidence gap: {gap.get('area')} - {gap.get('gap')}"})
        if not actions:
            actions.append({"priority": "monitor", "action": "Continue sampling care records, child voice and staff response evidence."})
        return actions

    def _counts(self, events: list[dict[str, Any]]) -> Counter:
        return Counter(str(event.get("record_type") or event.get("source_table") or "record") for event in events)

    def _is_high_risk_review(self, item: dict[str, Any]) -> bool:
        text = " ".join(str(value or "") for value in item.values()).lower()
        return any(term in text for term in ["safeguarding", "missing", "allegation", "self-harm", "exploitation", "lado"])

    def _current_home_id(self, current_user: dict[str, Any]) -> int | None:
        try:
            value = current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id")
            return int(value) if value else None
        except Exception:
            return None

    def _first_existing_table(self, conn, names: list[str]) -> str | None:
        with conn.cursor() as cur:
            for name in names:
                cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s) AS exists", (name,))
                row = cur.fetchone()
                exists = row.get("exists") if isinstance(row, dict) else row and row[0]
                if exists:
                    return name
        return None

    def _columns(self, conn, table_name: str) -> set[str]:
        with conn.cursor() as cur:
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s", (table_name,))
            return {str(row["column_name"] if isinstance(row, dict) else row[0]) for row in cur.fetchall()}
