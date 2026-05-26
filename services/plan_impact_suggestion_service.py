"""Reviewable plan impact suggestions — never auto-update care plans."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from psycopg2.extras import Json, RealDictCursor

from schemas.child_archive import ChildArchiveRecord
from schemas.plan_impact import (
    PlanImpactActionRequest,
    PlanImpactFilter,
    PlanImpactListResponse,
    PlanImpactSuggestion,
    PlanImpactType,
)

logger = logging.getLogger("indicare.plan_impact")

SOURCE_TO_PLANS: dict[str, list[tuple[PlanImpactType, str, bool]]] = {
    "health-appointment": [("health_plan", "Review health plan following appointment", False)],
    "health_appointment": [("health_plan", "Review health plan following appointment", False)],
    "medication-error": [
        ("medication_plan", "Review medication plan after error report", True),
        ("risk_assessment", "Review risk controls after medication error", True),
    ],
    "medication-note-error": [
        ("medication_plan", "Review medication plan after error report", True),
        ("risk_assessment", "Review risk controls after medication error", True),
    ],
    "family-time": [("family_time_plan", "Review family time plan and contact arrangements", False)],
    "missing": [("missing_from_care_plan", "Review missing from care plan and triggers", True)],
    "missing-episode": [("missing_from_care_plan", "Review missing from care plan and triggers", True)],
    "education-note": [("education_plan", "Review education plan targets and support", False)],
    "pep": [("education_plan", "Review PEP targets from signed-off document", False)],
    "pep_document": [("education_plan", "Review PEP education targets from signed-off document", False)],
    "lac-review": [("care_plan", "Review care plan goals from LAC review", True)],
    "lac_review": [("care_plan", "Review care plan goals from LAC review", True)],
    "lac_review_document": [("care_plan", "Review care plan goals and ambitions from LAC review", True)],
    "physical-intervention": [
        ("behaviour_support_plan", "Review behaviour support plan after intervention", True),
        ("risk_assessment", "Review risk assessment after physical intervention", True),
    ],
    "restraint": [
        ("behaviour_support_plan", "Review behaviour support plan after restraint", True),
        ("risk_assessment", "Review risk assessment after restraint", True),
    ],
    "injury-body-map": [
        ("health_plan", "Review health plan following injury body map", True),
        ("safeguarding_plan", "Review safeguarding plan where injury raises concern", True),
    ],
    "body-map": [
        ("health_plan", "Review health plan following injury body map", True),
        ("safeguarding_plan", "Review safeguarding plan where injury raises concern", True),
    ],
    "incident": [("risk_assessment", "Review risk assessment following incident", True)],
    "community-incident": [("community_risk_assessment", "Review community risk assessment", True)],
    "community-risk": [("community_risk_assessment", "Review community risk assessment", True)],
    "community": [("community_risk_assessment", "Review community risk assessment", True)],
    "safeguarding-concern": [
        ("safeguarding_plan", "Review safeguarding plan protective measures", True),
        ("risk_assessment", "Review risk assessment after safeguarding concern", True),
    ],
    "reg44": [("other", "Review improvement actions from Reg 44 report", True)],
    "reg44-report": [("other", "Review improvement actions from Reg 44 report", True)],
    "reg45": [("other", "Review Reg 45 quality of care improvement actions", True)],
    "reg45-review": [("other", "Review quality of care improvement plan from Reg 45", True)],
    "health_report": [("health_plan", "Review health plan following clinical report", False)],
    "risk_assessment": [("risk_assessment", "Review risk assessment following signed-off document", True)],
    "daily-note": [],
    "keywork": [("care_plan", "Consider care plan touchpoint from keywork session", False)],
}


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


class PlanImpactSuggestionService:
    def __init__(self) -> None:
        self._memory: dict[str, dict[str, Any]] = {}
        self._storage_mode: str = "memory"

    def _detect_storage_mode(self) -> str:
        try:
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = 'plan_impact_suggestions'
                        """
                    )
                    self._storage_mode = "postgresql" if cur.fetchone() else "memory"
            finally:
                release_db_connection(conn)
        except (DatabaseUnavailableError, Exception):
            self._storage_mode = "memory"
        return self._storage_mode

    def _plan_route(self, child_id: int, plan_type: PlanImpactType) -> str:
        segment = {
            "health_plan": "plans",
            "education_plan": "plans",
            "care_plan": "plans",
            "family_time_plan": "plans",
            "risk_assessment": "risk-assessments",
            "missing_from_care_plan": "missing-risk",
            "behaviour_support_plan": "plans",
        }.get(plan_type, "plans")
        return f"/young-people/{child_id}/{segment}"

    def analyse_archive_record(
        self,
        archive_record: ChildArchiveRecord,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> list[PlanImpactSuggestion]:
        key = archive_record.source_type.replace("_", "-").lower()
        mappings = SOURCE_TO_PLANS.get(key) or SOURCE_TO_PLANS.get(archive_record.source_type, [])
        if archive_record.safeguarding_sensitive and "safeguarding" not in key:
            mappings = mappings + list(SOURCE_TO_PLANS.get("safeguarding-concern", []))

        suggestions: list[PlanImpactSuggestion] = []
        for plan_type, title, manager_required in mappings:
            suggestion = PlanImpactSuggestion(
                id=f"plan_impact_{uuid4().hex[:14]}",
                child_id=archive_record.child_id,
                home_id=archive_record.home_id,
                source_type=archive_record.source_type,
                source_id=archive_record.source_id,
                archive_record_id=archive_record.id,
                suggested_plan_type=plan_type,
                title=title,
                safe_summary=archive_record.safe_summary[:400],
                suggested_update=(
                    f"Adults should review the {plan_type.replace('_', ' ')} in light of this signed-off record. "
                    "Accept to track review; open the plan to make any changes manually."
                ),
                evidence_date=archive_record.event_date or archive_record.signed_off_at,
                risk_level="high" if manager_required or archive_record.safeguarding_sensitive else "medium",
                review_required=True,
                manager_review_required=manager_required or archive_record.manager_review_required,
                status="suggested",
                route=self._plan_route(archive_record.child_id, plan_type),
                metadata={"auto_update_allowed": False},
            )
            stored = self._store(suggestion, conn=conn)
            suggestions.append(stored)
        return suggestions

    def _store(self, suggestion: PlanImpactSuggestion, conn: Any | None) -> PlanImpactSuggestion:
        payload = suggestion.model_dump()
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO plan_impact_suggestions (
                        id, child_id, home_id, source_type, source_id, archive_record_id,
                        suggested_plan_type, title, safe_summary, suggested_update, evidence_date,
                        risk_level, review_required, manager_review_required, status, route, metadata
                    ) VALUES (
                        %(id)s, %(child_id)s, %(home_id)s, %(source_type)s, %(source_id)s,
                        %(archive_record_id)s, %(suggested_plan_type)s, %(title)s, %(safe_summary)s,
                        %(suggested_update)s, %(evidence_date)s, %(risk_level)s, %(review_required)s,
                        %(manager_review_required)s, %(status)s, %(route)s, %(metadata)s
                    )
                    ON CONFLICT (id) DO NOTHING
                    """,
                    {**payload, "metadata": Json(payload["metadata"])},
                )
            conn.commit()
        else:
            self._memory[suggestion.id] = payload
        return suggestion

    def list_suggestions(
        self,
        filters: PlanImpactFilter,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> PlanImpactListResponse:
        _ = current_user
        items: list[PlanImpactSuggestion] = []
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            clauses = ["1=1"]
            params: list[Any] = []
            if filters.child_id is not None:
                clauses.append("child_id = %s")
                params.append(filters.child_id)
            if filters.status:
                clauses.append("status = %s")
                params.append(filters.status)
            if filters.suggested_plan_type:
                clauses.append("suggested_plan_type = %s")
                params.append(filters.suggested_plan_type)
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"SELECT * FROM plan_impact_suggestions WHERE {' AND '.join(clauses)} ORDER BY created_at DESC",
                    params,
                )
                for row in cur.fetchall():
                    items.append(PlanImpactSuggestion.model_validate(dict(row)))
        else:
            for row in self._memory.values():
                if filters.child_id and row.get("child_id") != filters.child_id:
                    continue
                if filters.status and row.get("status") != filters.status:
                    continue
                items.append(PlanImpactSuggestion.model_validate(row))
        start = (filters.page - 1) * filters.page_size
        page = items[start : start + filters.page_size]
        return PlanImpactListResponse(suggestions=page, total=len(items))

    def apply_decision(
        self,
        suggestion_id: str,
        request: PlanImpactActionRequest,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> PlanImpactSuggestion | None:
        suggestion = self._get(suggestion_id, conn=conn)
        if not suggestion:
            return None
        if request.decision == "accept":
            suggestion.status = "accepted"
            suggestion.accepted_by_user_id = _user_id(current_user)
            suggestion.accepted_at = _now_iso()
        elif request.decision == "reject":
            suggestion.status = "rejected"
        elif request.decision == "create_action":
            suggestion.status = "action_created"
            suggestion.metadata = {**suggestion.metadata, "action_requested": True}
        self._store(suggestion, conn=conn)
        return suggestion

    def _get(self, suggestion_id: str, conn: Any | None) -> PlanImpactSuggestion | None:
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM plan_impact_suggestions WHERE id = %s", (suggestion_id,))
                row = cur.fetchone()
                return PlanImpactSuggestion.model_validate(dict(row)) if row else None
        row = self._memory.get(suggestion_id)
        return PlanImpactSuggestion.model_validate(row) if row else None


plan_impact_suggestion_service = PlanImpactSuggestionService()
