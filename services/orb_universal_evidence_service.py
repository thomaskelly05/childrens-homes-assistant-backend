"""Universal source-labelled evidence collector for OS ORB."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from psycopg2.extras import RealDictCursor

from repositories.os_repository_utils import (
    build_scope_where,
    current_provider_id,
    quote_ident,
    table_columns,
    table_exists,
)


@dataclass(frozen=True)
class EvidenceSurface:
    table: str
    label: str
    source_type: str
    title_columns: tuple[str, ...]
    summary_columns: tuple[str, ...]
    date_columns: tuple[str, ...]
    route: str
    child_only: bool = False
    home_provider: bool = True


SURFACES: tuple[EvidenceSurface, ...] = (
    EvidenceSurface("os_young_person_care_records", "OS care records", "care_record", ("title", "record_type"), ("narrative", "child_voice", "staff_analysis", "impact_on_child", "follow_up_summary", "presentation", "mood", "location"), ("occurred_at", "record_date", "created_at", "updated_at"), "/young-people/{young_person_id}/records"),
    EvidenceSurface("os_young_person_daily_summary", "Daily summary", "daily_summary", ("summary_date", "overall_presentation"), ("morning_summary", "afternoon_summary", "evening_summary", "night_summary", "overall_presentation", "wellbeing_summary", "education_summary", "health_summary", "family_contact_summary"), ("summary_date", "created_at", "updated_at"), "/young-people/{young_person_id}/daily-notes"),
    EvidenceSurface("chronology_events", "Chronology", "chronology", ("title", "event_type", "source_type"), ("summary", "description", "body", "full_text"), ("date_time", "occurred_at", "created_at", "updated_at"), "/young-people/{young_person_id}/chronology"),
    EvidenceSurface("daily_notes", "Daily notes", "daily_note", ("title", "summary", "context"), ("summary", "narrative", "presentation", "body", "note", "content"), ("occurred_at", "note_date", "created_at", "updated_at"), "/young-people/{young_person_id}/daily-notes"),
    EvidenceSurface("incidents", "Incidents", "incident", ("title", "incident_type", "category"), ("summary", "description", "narrative", "outcome", "actions_taken"), ("occurred_at", "incident_date", "created_at", "updated_at"), "/young-people/{young_person_id}/incidents"),
    EvidenceSurface("keywork_sessions", "Keywork", "keywork", ("title", "topic", "session_type"), ("summary", "notes", "child_views", "actions"), ("session_date", "occurred_at", "created_at", "updated_at"), "/young-people/{young_person_id}/keywork"),
    EvidenceSurface("child_voice_entries", "Child voice", "child_voice", ("title", "voice_type", "context"), ("summary", "voice_text", "wishes", "feelings", "adult_response"), ("recorded_at", "created_at", "updated_at"), "/young-people/{young_person_id}/child-voice"),
    EvidenceSurface("handover_records", "Handover", "handover", ("title", "shift_label", "handover_type"), ("summary", "narrative", "actions", "risks", "follow_up"), ("shift_date", "created_at", "updated_at"), "/young-people/{young_person_id}/handover"),
    EvidenceSurface("appointments", "Appointments", "appointment", ("title", "appointment_type", "professional_name", "professional"), ("summary", "notes", "outcome", "reason", "location"), ("appointment_date", "appointment_at", "start_time", "date", "created_at", "updated_at"), "/young-people/{young_person_id}/appointments"),
    EvidenceSurface("young_person_appointments", "Young person appointments", "appointment", ("title", "appointment_type", "professional_name"), ("summary", "notes", "outcome", "reason", "location"), ("appointment_date", "appointment_at", "start_time", "created_at", "updated_at"), "/young-people/{young_person_id}/appointments"),
    EvidenceSurface("health_appointments", "Health appointments", "appointment", ("title", "appointment_type", "professional_name"), ("summary", "notes", "outcome", "reason", "location"), ("appointment_date", "appointment_at", "start_time", "created_at", "updated_at"), "/young-people/{young_person_id}/health"),
    EvidenceSurface("calendar_events", "Calendar", "calendar", ("title", "event_type", "category"), ("summary", "description", "notes", "location"), ("start_time", "event_date", "date", "created_at", "updated_at"), "/calendar"),
    EvidenceSurface("health_records", "Health", "health", ("title", "record_type", "health_type"), ("summary", "notes", "outcome", "professional_name"), ("appointment_date", "recorded_at", "created_at", "updated_at"), "/young-people/{young_person_id}/health"),
    EvidenceSurface("education_records", "Education", "education", ("title", "record_type", "school_status"), ("summary", "notes", "attendance_summary", "progress_summary"), ("recorded_at", "created_at", "updated_at"), "/young-people/{young_person_id}/education"),
    EvidenceSurface("family_contact_records", "Family contact", "family_contact", ("title", "contact_type", "relationship"), ("summary", "notes", "outcome", "child_wishes"), ("contact_date", "occurred_at", "created_at", "updated_at"), "/young-people/{young_person_id}/family"),
    EvidenceSurface("manager_review_queue", "Manager review queue", "manager_review", ("record_type", "source_table"), ("review_reason", "summary", "manager_comment"), ("created_at", "updated_at"), "/recording-reviews"),
    EvidenceSurface("actions", "Actions", "action", ("title", "action_type", "category"), ("summary", "description", "recommended_action", "outcome"), ("due_at", "created_at", "updated_at"), "/actions"),
    EvidenceSurface("os_command_items", "OS command items", "action", ("title", "domain"), ("summary", "recommended_action"), ("due_at", "created_at", "updated_at"), "/actions"),
    EvidenceSurface("young_people", "Young person profile", "profile", ("preferred_name", "display_name", "first_name", "name"), ("summary", "presentation", "what_matters", "communication", "legal_status"), ("updated_at", "created_at"), "/young-people/{id}", child_only=True),
    EvidenceSurface("vw_os_young_person_profile", "Young person story", "profile", ("preferred_name", "display_name", "name"), ("current_state", "communication", "what_helps", "legal_status", "placement_status"), ("updated_at", "created_at"), "/young-people/{id}", child_only=True),
    EvidenceSurface("os_young_person_care_plan_sections", "Get to Know Me plans", "care_plan_section", ("section_title", "section_key", "status"), ("current_summary", "needs", "risks", "strengths"), ("last_reviewed_at", "next_review_due", "created_at", "updated_at"), "/young-people/{young_person_id}/plan-impacts"),
    EvidenceSurface("support_plans", "Support plans", "support_plan", ("title", "plan_title", "plan_type"), ("summary", "presenting_need", "staff_guidance", "review_note", "actions"), ("review_date", "next_review_due", "updated_at", "created_at"), "/young-people/{young_person_id}/plans"),
    EvidenceSurface("care_plans", "Care plans", "care_plan", ("title", "plan_type"), ("summary", "plan_summary", "care_needs", "staff_guidance"), ("review_date", "next_review_due", "updated_at", "created_at"), "/young-people/{young_person_id}/care-planning"),
    EvidenceSurface("risk_assessments", "Risk assessments", "risk_assessment", ("title", "risk_type", "category"), ("summary", "risk_summary", "controls", "review_note", "manager_comment"), ("review_due", "next_review_due", "updated_at", "created_at"), "/young-people/{young_person_id}/risk-assessments"),
    EvidenceSurface("child_documents", "Child documents", "document", ("title", "document_type", "name"), ("summary", "description", "extracted_text", "review_summary"), ("uploaded_at", "review_due_date", "created_at", "updated_at"), "/young-people/{young_person_id}/documents"),
    EvidenceSurface("statutory_documents", "Statutory documents", "statutory_document", ("title", "document_type", "name"), ("summary", "description", "review_summary"), ("review_due_date", "uploaded_at", "created_at", "updated_at"), "/young-people/{young_person_id}/documents"),
    EvidenceSurface("reports", "Reports", "report", ("title", "report_type"), ("summary", "report_text", "findings"), ("report_date", "created_at", "updated_at"), "/reports"),
    EvidenceSurface("ai_generated_reports", "Generated reports", "report", ("title", "report_type"), ("summary", "report_text", "findings"), ("review_month", "created_at", "updated_at"), "/young-people/{young_person_id}/reports"),
    EvidenceSurface("governance_reg44_visits", "Reg 44 visits", "governance", ("title", "visit_type", "visitor_name"), ("summary", "findings", "actions", "manager_response"), ("visit_date", "created_at", "updated_at"), "/governance/reg44", home_provider=True),
    EvidenceSurface("governance_reg45_reviews", "Reg 45 reviews", "governance", ("title", "review_period"), ("summary", "findings", "improvement_actions"), ("review_date", "created_at", "updated_at"), "/governance/reg45", home_provider=True),
    EvidenceSurface("inspection_evidence_facts", "Inspection evidence", "inspection", ("title", "standard", "area"), ("summary", "evidence", "rationale"), ("created_at", "updated_at"), "/inspection evidence preparation", home_provider=True),
)

LIVE_JOURNEY_TYPES = {
    "care_record", "daily_summary", "daily_note", "chronology", "incident", "keywork",
    "child_voice", "handover", "appointment", "calendar", "health", "education",
    "family_contact", "manager_review", "action",
}
BASELINE_TYPES = {"profile", "risk_assessment", "support_plan", "care_plan", "care_plan_section", "document", "statutory_document"}


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _coalesce(cols: set[str], candidates: tuple[str, ...], default: str) -> str:
    parts = [f"{quote_ident(col)}::text" for col in candidates if col in cols]
    if not parts:
        return "%s"
    return f"COALESCE({', '.join(parts)}, %s)"


def _date_expr(cols: set[str], candidates: tuple[str, ...]) -> str:
    parts = [f"{quote_ident(col)}::text" for col in candidates if col in cols]
    if not parts:
        return "NULL::text"
    return f"COALESCE({', '.join(parts)}, NULL::text)"


def _is_journey_question(message: str) -> bool:
    msg = message.lower()
    return any(term in msg for term in ("recent journey", "journey", "summary", "summarise", "summarize", "what changed", "recent"))


def _intent_focus(message: str) -> set[str]:
    msg = message.lower()
    focus: set[str] = set()
    if any(term in msg for term in ("appointment", "dentist", "doctor", "gp", "health", "medical", "optician", "hospital")):
        focus.update({"appointment", "health", "calendar", "care_record"})
    if any(term in msg for term in ("daily brief", "today", "handover", "what needs", "attention")):
        focus.update({"care_record", "daily_summary", "daily_note", "handover", "action", "appointment", "risk_assessment", "chronology"})
    if _is_journey_question(message):
        focus.update({"care_record", "daily_summary", "chronology", "daily_note", "keywork", "child_voice", "incident", "handover", "appointment", "health", "education", "family_contact", "manager_review"})
    if any(term in msg for term in ("plan", "plans", "review", "update")):
        focus.update({"care_record", "care_plan_section", "support_plan", "care_plan", "risk_assessment", "manager_review", "action"})
    return focus


def _priority(source_type: str, focus: set[str], journey: bool) -> int:
    if source_type in focus:
        return 300
    if journey and source_type in LIVE_JOURNEY_TYPES:
        return 250
    if journey and source_type in BASELINE_TYPES:
        return 80
    if source_type in BASELINE_TYPES:
        return 120
    return 150


def _query_surface(conn: Any, surface: EvidenceSurface, *, current_user: dict[str, Any], scope: str, message: str, young_person_id: int | None, home_id: int | None, provider_id: int | None, limit: int, skip_keyword_filter: bool = False) -> list[dict[str, Any]]:
    if not table_exists(conn, surface.table):
        return []
    cols = table_columns(conn, surface.table)
    if not cols:
        return []

    where, params = build_scope_where(cols, current_user, home_id=home_id, young_person_id=young_person_id, provider_id=provider_id)
    if surface.child_only and young_person_id is None:
        return []

    search_terms = [] if skip_keyword_filter else [term for term in message.lower().replace("?", " ").replace("'", " ").split() if len(term) >= 4][:8]
    searchable = [col for col in (*surface.title_columns, *surface.summary_columns) if col in cols]
    if search_terms and searchable:
        search_expr = " || ' ' || ".join(f"COALESCE({quote_ident(col)}::text, '')" for col in searchable)
        where.append("(" + " OR ".join([f"LOWER({search_expr}) LIKE %s" for _ in search_terms]) + ")")
        params.extend([f"%{term}%" for term in search_terms])

    id_expr = quote_ident("id") if "id" in cols else "NULL"
    title_expr = _coalesce(cols, surface.title_columns, surface.label)
    summary_expr = _coalesce(cols, surface.summary_columns, "Record available for ORB review")
    status_expr = _coalesce(cols, ("workflow_status", "review_status", "manager_review_status", "status"), "available")
    date_expr = _date_expr(cols, surface.date_columns)
    young_person_expr = quote_ident("young_person_id") if "young_person_id" in cols else "NULL"
    home_expr = quote_ident("home_id") if "home_id" in cols else "NULL"
    provider_expr = quote_ident("provider_id") if "provider_id" in cols else "NULL"

    sql = f"""
        SELECT {id_expr} AS id, {title_expr} AS title, {summary_expr} AS summary,
               {status_expr} AS status, {date_expr} AS date,
               {young_person_expr} AS young_person_id, {home_expr} AS home_id, {provider_expr} AS provider_id
        FROM public.{quote_ident(surface.table)}
        WHERE {' AND '.join(where) if where else 'TRUE'}
        ORDER BY {date_expr} DESC NULLS LAST
        LIMIT %s
    """
    query_params = [surface.label, "Record available for ORB review", "available", *params, max(1, min(limit, 12))]

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, tuple(query_params))
        rows = [dict(row) for row in (cur.fetchall() or [])]

    evidence: list[dict[str, Any]] = []
    for row in rows:
        record_id = _text(row.get("id"), "unknown")
        child_id = _text(row.get("young_person_id") or young_person_id)
        route = surface.route
        if child_id:
            route = route.replace("{young_person_id}", child_id).replace("{id}", child_id)
        elif home_id:
            route = route.replace("{id}", str(home_id))
        evidence.append({
            "id": f"{surface.table}:{record_id}",
            "label": surface.label,
            "title": _text(row.get("title"), surface.label),
            "source_type": surface.source_type,
            "source_table": surface.table,
            "source_id": record_id,
            "record_type": surface.source_type,
            "record_id": record_id,
            "date": _text(row.get("date")),
            "status": _text(row.get("status"), "available"),
            "summary": _text(row.get("summary"), "Record available for ORB review")[:900],
            "basis": _text(row.get("summary"), "Record available for ORB review")[:900],
            "route": route,
            "scope": scope,
        })
    return evidence


class OrbUniversalEvidenceService:
    def collect(self, conn: Any, *, current_user: dict[str, Any], scope: str, message: str, young_person_id: int | None = None, home_id: int | None = None, provider_id: int | None = None, limit_per_surface: int = 4) -> dict[str, Any]:
        provider_id = provider_id if provider_id is not None else current_provider_id(current_user)
        items: list[dict[str, Any]] = []
        errors: list[str] = []
        focus = _intent_focus(message)
        journey = _is_journey_question(message)
        ordered_surfaces = sorted(SURFACES, key=lambda surface: _priority(surface.source_type, focus, journey), reverse=True)
        for surface in ordered_surfaces:
            if scope == "child" and surface.home_provider and not young_person_id and surface.child_only:
                continue
            focused = surface.source_type in focus or (journey and surface.source_type in LIVE_JOURNEY_TYPES)
            try:
                items.extend(_query_surface(conn, surface, current_user=current_user, scope=scope, message=message, young_person_id=young_person_id, home_id=home_id, provider_id=provider_id, limit=10 if focused else limit_per_surface, skip_keyword_filter=focused))
            except Exception as exc:
                errors.append(f"{surface.table}: {exc}")

        seen: set[tuple[str, str]] = set()
        deduped: list[dict[str, Any]] = []
        ranked = sorted(items, key=lambda row: (_priority(_text(row.get("source_type")), focus, journey), _text(row.get("date"))), reverse=True)
        for item in ranked:
            key = (_text(item.get("source_table")), _text(item.get("source_id")))
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)

        counts: dict[str, int] = {}
        for item in deduped:
            source_type = _text(item.get("source_type"), "unknown")
            counts[source_type] = counts.get(source_type, 0) + 1

        return {"items": deduped[:80], "counts": counts, "errors": errors[:12], "surface_count": len(counts)}


orb_universal_evidence_service = OrbUniversalEvidenceService()
