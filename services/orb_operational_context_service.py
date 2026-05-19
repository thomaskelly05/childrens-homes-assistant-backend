from __future__ import annotations

from datetime import date
from typing import Any

from psycopg2.extras import RealDictCursor

from repositories.actions_repository import list_actions
from repositories.documents_repository import list_documents
from repositories.evidence_repository import list_evidence
from repositories.os_repository_utils import (
    current_allowed_home_ids,
    current_home_id,
    current_provider_id,
    quote_ident,
    table_exists,
)
from repositories.reports_repository import list_reports
from repositories.workspaces_repository import get_young_person, list_young_people
from services.db_pool_monitor import db_pool_snapshot
from services.governance_intelligence_service import GovernanceIntelligenceService
from services.orb_care_journey_service import OrbCareJourneyService
from services.orb_live_context_enrichment import orb_live_context_enrichment
from services.orb_regulatory_reasoning_service import OrbRegulatoryReasoningService
from services.orb_response_composer import OrbResponseComposer
from services.orb_therapeutic_reasoning_service import OrbTherapeuticReasoningService
from services.os_chronology_service import list_chronology_for_connection
from services.workforce_intelligence_service import WorkforceIntelligenceService

VALID_SCOPES = {"home", "child", "workforce", "governance", "inspection", "provider"}
GUARDRAILS = [
    "ORB supports registered manager and safeguarding review; it does not replace professional judgement.",
    "ORB must not predict Ofsted grades or make final safeguarding decisions.",
    "Draft wording, actions and report text require adult/manager review before use.",
]


def _text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


def _rollback(conn: Any) -> None:
    try:
        conn.rollback()
    except Exception:
        pass


def _guarded(conn: Any, errors: list[str], label: str, fn, fallback):
    try:
        return fn()
    except Exception as exc:
        errors.append(f"{label}: {exc}")
        _rollback(conn)
        return fallback


def _normalise_scope(scope: str | None, message: str) -> str:
    requested = _text(scope).lower().replace(" ", "_")
    if requested in VALID_SCOPES:
        return requested
    message_l = message.lower()
    if any(term in message_l for term in ("staff", "workforce", "supervision", "training", "probation")):
        return "workforce"
    if any(term in message_l for term in ("governance", "reg 44", "reg44", "reg 45", "reg45", "sccif", "ofsted", "inspection")):
        return "inspection" if "inspection" in message_l or "ofsted" in message_l else "governance"
    if any(term in message_l for term in ("child", "young person", "chronology", "care journey")):
        return "child"
    return "home"


def _intent(message: str, scope: str) -> str:
    message_l = message.lower()
    if any(term in message_l for term in ("today", "changed", "handover", "this shift")):
        return "today_what_changed"
    if any(term in message_l for term in ("chronology", "journey", "recent care")):
        return "child_chronology"
    if any(term in message_l for term in ("safeguarding", "risk", "missing", "manager review")):
        return "safeguarding_risk"
    if any(term in message_l for term in ("document", "template", "sign-off", "sign off", "expired")):
        return "documents_templates"
    if any(term in message_l for term in ("sccif", "ofsted", "inspection", "help and protection")):
        return "inspection_sccif"
    if any(term in message_l for term in ("reg 44", "reg44", "reg 45", "reg45")):
        return "reg44_reg45"
    if scope == "workforce":
        return "workforce"
    if any(term in message_l for term in ("action", "task", "overdue")):
        return "actions_tasks"
    return "general_operational"


def _snapshot_rows(
    conn: Any,
    current_user: dict[str, Any],
    *,
    scope: str,
    home_id: int | None,
    young_person_id: int | None,
    staff_id: int | None,
    limit: int,
) -> list[dict[str, Any]]:
    if not table_exists(conn, "operational_projection_snapshots"):
        return []
    provider_id = current_provider_id(current_user)
    home_ids = current_allowed_home_ids({**current_user, "home_id": current_user.get("home_id") or current_user.get("homeId")})
    resolved_home_id = home_id or current_home_id(current_user)

    where = ["domain = ANY(%s)"]
    params: list[Any] = [[scope, "governance", "workforce", "child", "home"]]
    scope_clauses: list[str] = []
    if resolved_home_id is not None:
        scope_clauses.append("home_id = %s")
        params.append(resolved_home_id)
    elif home_ids:
        scope_clauses.append("home_id = ANY(%s)")
        params.append(home_ids)
    if provider_id is not None:
        scope_clauses.append("provider_id = %s")
        params.append(provider_id)
    if young_person_id is not None:
        scope_clauses.append("young_person_id = %s")
        params.append(young_person_id)
    if staff_id is not None:
        scope_clauses.append("staff_id = %s")
        params.append(staff_id)
    if scope_clauses:
        where.append("(" + " OR ".join(scope_clauses) + " OR (home_id IS NULL AND provider_id IS NULL AND young_person_id IS NULL AND staff_id IS NULL))")

    params.append(max(1, min(limit, 20)))
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT projection_key, projection_type, domain, payload, metadata, version, stale, generated_at, updated_at
            FROM public.{quote_ident("operational_projection_snapshots")}
            WHERE {" AND ".join(where)}
            ORDER BY stale ASC, updated_at DESC NULLS LAST
            LIMIT %s
            """,
            tuple(params),
        )
        return [dict(row) for row in (cur.fetchall() or [])]


def _existing_tables(conn: Any) -> list[str]:
    expected = [
        "young_people",
        "daily_notes",
        "incidents",
        "safeguarding_records",
        "missing_episodes",
        "risk_assessments",
        "support_plans",
        "health_records",
        "medication_records",
        "education_records",
        "family_contact_records",
        "keywork_sessions",
        "documents",
        "child_documents",
        "document_templates",
        "chronology_events",
        "os_chronology_events",
        "notifications",
        "users",
        "workforce_supervision_records",
        "staff_training_matrix",
        "staff_probation_reviews",
        "workforce_evidence",
        "governance_reg44_visits",
        "operational_projection_snapshots",
        "audit_events",
        "os_audit_events",
        "user_sessions",
        "user_mfa",
        "user_passkeys",
    ]
    return [name for name in expected if table_exists(conn, name)]


def _source(title: str, record_type: str, record_id: Any, *, route: str | None = None, date_value: Any = None, summary: Any = None, index: int = 1) -> dict[str, Any]:
    return {
        "title": _text(title, record_type.replace("_", " ").title()),
        "record_type": _text(record_type, "record"),
        "record_id": _text(record_id),
        "route": route,
        "date": _iso(date_value),
        "citation_ref": f"[{index}]",
        "summary": _text(summary, "Record available for review."),
    }


def _sources_from_context(context: dict[str, Any], limit: int) -> list[dict[str, Any]]:
    raw_sources: list[dict[str, Any]] = []
    for item in context.get("chronology") or []:
        raw_sources.append(_source(item.get("title"), item.get("source_type"), item.get("source_id") or item.get("id"), route=item.get("source_url"), date_value=item.get("date_time"), summary=item.get("summary")))
    for item in context.get("safeguarding") or []:
        raw_sources.append(_source(item.get("title"), item.get("source_type"), item.get("source_id") or item.get("id"), route=item.get("source_url"), date_value=item.get("date_time"), summary=item.get("summary")))
    for item in context.get("documents") or []:
        raw_sources.append(_source(item.get("title"), item.get("source_type") or item.get("document_type"), item.get("source_id") or item.get("original_id") or item.get("id"), route=f"/documents/{item.get('id')}", date_value=item.get("uploaded_at"), summary=item.get("extracted_text") or item.get("document_type")))
    for item in context.get("actions") or []:
        raw_sources.append(_source(item.get("title"), item.get("source_type"), item.get("source_id") or item.get("id"), route=f"/actions/{item.get('id')}", date_value=item.get("due_date") or item.get("updated_at"), summary=item.get("summary") or item.get("description")))
    for item in context.get("evidence") or []:
        raw_sources.append(_source(item.get("title"), item.get("source_type") or item.get("evidence_type"), item.get("source_id") or item.get("id"), route=f"/evidence/{item.get('id')}", date_value=item.get("created_at"), summary=item.get("description")))
    for item in context.get("reports") or []:
        raw_sources.append(_source(item.get("title"), item.get("source_type") or item.get("report_type") or item.get("type"), item.get("source_id") or item.get("id"), route=f"/reports/{item.get('id')}", date_value=item.get("created_at") or item.get("generated_at"), summary=item.get("summary") or item.get("status")))

    deduped: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for item in raw_sources:
        key = (item["record_type"], item["record_id"])
        if not key[1] or key in seen:
            continue
        seen.add(key)
        item["citation_ref"] = f"[{len(deduped) + 1}]"
        deduped.append(item)
        if len(deduped) >= limit:
            break
    return deduped


def _projection_source(row: dict[str, Any], index: int) -> dict[str, Any]:
    payload = row.get("payload") if isinstance(row.get("payload"), dict) else {}
    metadata = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
    title = payload.get("title") or metadata.get("title") or row.get("projection_key")
    summary = payload.get("summary") or payload.get("narrative") or metadata.get("summary") or "Projection snapshot available for review."
    return _source(
        _text(title, "Operational projection snapshot"),
        f"snapshot_{row.get('domain') or row.get('projection_type') or 'operational'}",
        row.get("projection_key") or row.get("version") or index,
        date_value=row.get("updated_at") or row.get("generated_at"),
        summary=summary,
        index=index,
    )


def build_orb_context(
    conn: Any,
    current_user: dict[str, Any],
    scope: str,
    message: str,
    young_person_id: int | None = None,
    staff_id: int | None = None,
    home_id: int | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    resolved_scope = _normalise_scope(scope, message)
    intent = _intent(message, resolved_scope)
    resolved_home_id = home_id or current_home_id(current_user)
    filters: dict[str, Any] = {"home_id": resolved_home_id, "young_person_id": young_person_id, "staff_id": staff_id}
    filters = {key: value for key, value in filters.items() if value is not None}
    if intent == "today_what_changed":
        filters["date_from"] = date.today().isoformat()

    errors: list[str] = []
    pool_snapshot = db_pool_snapshot()
    snapshot_rows = _guarded(conn, errors, "projection_snapshots", lambda: _snapshot_rows(conn, current_user, scope=resolved_scope, home_id=resolved_home_id, young_person_id=young_person_id, staff_id=staff_id, limit=8), [])
    degrade_live_reads = bool(pool_snapshot.get("saturated")) and bool(snapshot_rows)
    live_tables = _guarded(conn, errors, "schema_introspection", lambda: _existing_tables(conn), [])
    child_profile = None
    if young_person_id is not None:
        child_profile = _guarded(conn, errors, "child_profile", lambda: get_young_person(conn, young_person_id=young_person_id, current_user=current_user), None)

    chronology = _guarded(conn, errors, "chronology", lambda: list_chronology_for_connection(conn, current_user=current_user, filters=filters, page=1, page_size=min(limit, 80)).get("items", []), [])
    safeguarding = [] if degrade_live_reads else _guarded(conn, errors, "safeguarding", lambda: list_chronology_for_connection(conn, current_user=current_user, filters={**filters, "safeguarding_only": True}, page=1, page_size=min(limit, 40)).get("items", []), [])
    documents = [] if degrade_live_reads else _guarded(conn, errors, "documents", lambda: list_documents(conn, current_user=current_user, filters=filters, limit=limit), [])
    actions = [] if degrade_live_reads else _guarded(conn, errors, "actions", lambda: list_actions(conn, current_user=current_user, filters=filters, limit=limit), [])
    evidence = [] if degrade_live_reads else _guarded(conn, errors, "evidence", lambda: list_evidence(conn, current_user=current_user, filters=filters, limit=limit), [])
    reports = [] if degrade_live_reads else _guarded(conn, errors, "reports", lambda: list_reports(conn, current_user=current_user, filters=filters, limit=limit), [])
    children = [] if young_person_id is not None or degrade_live_reads else _guarded(conn, errors, "children", lambda: list_young_people(conn, current_user=current_user, limit=100), [])
    if degrade_live_reads:
        errors.append("db_pool: saturated; using projection-first partial context")

    governance = {}
    if resolved_scope in {"governance", "inspection", "provider"} or intent in {"inspection_sccif", "reg44_reg45"}:
        governance = _guarded(conn, errors, "governance", lambda: GovernanceIntelligenceService().build_command_centre(conn, current_user=current_user, days=30, home_id=resolved_home_id), {})

    workforce = {}
    if resolved_scope == "workforce" or intent == "workforce":
        workforce = _guarded(conn, errors, "workforce", lambda: WorkforceIntelligenceService().orb_context(conn, current_user=current_user, staff_id=staff_id), {})

    context = {
        "scope": resolved_scope,
        "intent": intent,
        "home_id": resolved_home_id,
        "child_profile": child_profile,
        "children": children,
        "chronology": chronology,
        "safeguarding": safeguarding,
        "documents": documents,
        "actions": actions,
        "evidence": evidence,
        "reports": reports,
        "governance": governance,
        "workforce": workforce,
        "snapshots": snapshot_rows,
        "live_tables": live_tables,
        "errors": errors,
        "pool": pool_snapshot,
        "degraded": degrade_live_reads,
    }
    context.update(orb_live_context_enrichment.enrich(message=message, context=context))
    sources = _sources_from_context(context, max(1, min(limit, 50)))
    if not sources and snapshot_rows:
        sources = [_projection_source(row, index + 1) for index, row in enumerate(snapshot_rows[: min(limit, 10)])]
    care_journey = OrbCareJourneyService().build({**context, "sources": sources})
    regulatory_reasoning = OrbRegulatoryReasoningService().build(context=context, care_journey=care_journey)
    therapeutic_reasoning = OrbTherapeuticReasoningService().build(context=context, care_journey=care_journey)
    answer, summary, confidence = OrbResponseComposer().compose(
        context={**context, "sources": sources},
        care_journey=care_journey,
        regulatory=regulatory_reasoning,
        therapeutic=therapeutic_reasoning,
        guardrails=GUARDRAILS,
    )
    context["sources"] = sources
    context["care_journey"] = care_journey
    context["regulatory_reasoning"] = regulatory_reasoning
    context["therapeutic_reasoning"] = therapeutic_reasoning
    context["answer"] = answer
    context["summary"] = summary
    context["confidence"] = confidence
    context["context_used"] = {
        "scope": resolved_scope,
        "intent": intent,
        "projection_keys": [row.get("projection_key") for row in snapshot_rows if row.get("projection_key")],
        "live_tables": live_tables,
        "snapshot_hit": bool(snapshot_rows),
        "degraded": degrade_live_reads,
        "pool_saturation_pct": pool_snapshot.get("saturation_pct"),
        "emotional_state": context.get("emotional_state") or {},
        "emotional_safety": context.get("emotional_safety") or {},
    }
    return context


def build_orb_response(context: dict[str, Any]) -> dict[str, Any]:
    actions = [
        {
            "label": _text(action.get("title"), "Review action"),
            "type": "review" if _text(action.get("status")).lower() in {"review", "in_progress", "overdue"} else "open_record",
            "route": f"/actions/{action.get('id')}",
        }
        for action in (context.get("actions") or [])[:5]
        if _text(action.get("status")).lower() not in {"completed", "done", "closed", "cancelled", "canceled"}
    ]
    if not actions:
        actions.append({"label": "Open the command centre for manager review", "type": "review", "route": "/command-centre"})
    return {
        "ok": True,
        "answer": context.get("answer"),
        "summary": context.get("summary"),
        "sources": context.get("sources") or [],
        "actions": actions[:6],
        "confidence": context.get("confidence") or "low",
        "guardrails": GUARDRAILS,
        "context_used": context.get("context_used") or {},
        "care_journey": context.get("care_journey") or {},
        "regulatory_reasoning": context.get("regulatory_reasoning") or {},
        "therapeutic_reasoning": context.get("therapeutic_reasoning") or {},
        "risk_intelligence": context.get("risk_intelligence") or {},
    }
