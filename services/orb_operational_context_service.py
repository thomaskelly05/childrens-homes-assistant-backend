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
from services.assistant_context_service import build_shared_assistant_context
from services.orb_care_journey_service import OrbCareJourneyService
from services.orb_live_context_enrichment import orb_live_context_enrichment
from services.orb_metadata_first_context_service import orb_metadata_first_context_service
from services.orb_operational_atmosphere_service import orb_operational_atmosphere_service
from services.orb_operational_cognition_service import orb_operational_cognition_service
from services.orb_rm_reflection_service import orb_rm_reflection_service
from services.orb_regulatory_reasoning_service import OrbRegulatoryReasoningService
from services.orb_response_composer import OrbResponseComposer
from services.orb_therapeutic_reasoning_service import OrbTherapeuticReasoningService
from services.orb_trajectory_reasoning_service import orb_trajectory_reasoning_service
from services.os_chronology_service import list_chronology_for_connection
from services.workforce_intelligence_service import WorkforceIntelligenceService

VALID_SCOPES = {"home", "child", "workforce", "governance", "inspection", "provider"}
GUARDRAILS = [
    "ORB supports registered manager and safeguarding review; it does not replace professional judgement.",
    "ORB must not predict Ofsted grades or make final safeguarding decisions.",
    "Draft wording, actions and report text require adult/manager review before use.",
]

# operational cognition convergence enabled
# live ORB now synthesises themes, trajectories, impact indicators
# and RM review prompts from existing chronology/evidence context.

LIVE_TABLE_CANDIDATES = [
    "chronology_events",
    "daily_notes",
    "incidents",
    "safeguarding_records",
    "missing_episodes",
    "risk_assessments",
    "support_plans",
    "documents",
    "child_documents",
    "statutory_documents",
    "actions",
    "evidence_links",
    "inspection_evidence_facts",
    "workforce_supervision_records",
    "staff_training_matrix",
    "governance_reg44_visits",
    "governance_evidence_matrix_links",
    "operational_projection_snapshots",
]


def _text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def _safe_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _existing_tables(conn: Any) -> list[str]:
    found: list[str] = []
    for table_name in LIVE_TABLE_CANDIDATES:
        try:
            if table_exists(conn, table_name):
                found.append(table_name)
        except Exception:
            continue
    return found


def _snapshot_rows(
    conn: Any,
    *,
    current_user: dict[str, Any],
    scope: str,
    young_person_id: int | None = None,
    staff_id: int | None = None,
    home_id: int | None = None,
    limit: int = 8,
) -> list[dict[str, Any]]:
    if not table_exists(conn, "operational_projection_snapshots"):
        return []

    where = ["stale = FALSE"]
    params: list[Any] = []
    resolved_home_id = home_id or current_home_id(current_user)
    provider_id = current_provider_id(current_user)
    if young_person_id is not None:
        where.append("(young_person_id = %s OR domain IN ('child', 'chronology', 'care_journey'))")
        params.append(young_person_id)
    elif staff_id is not None:
        where.append("(staff_id = %s OR domain IN ('workforce', 'governance'))")
        params.append(staff_id)
    elif resolved_home_id is not None:
        where.append("(home_id = %s OR home_id IS NULL)")
        params.append(resolved_home_id)
    elif provider_id is not None:
        where.append("(provider_id = %s OR provider_id IS NULL)")
        params.append(provider_id)
    if scope:
        where.append("(domain = %s OR projection_type ILIKE %s OR domain IN ('operational', 'governance'))")
        params.extend([scope, f"%{scope}%"])
    params.append(max(1, min(int(limit or 8), 20)))
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT
              projection_key,
              projection_type,
              domain,
              payload,
              metadata,
              version,
              stale,
              generated_at,
              updated_at
            FROM public.operational_projection_snapshots
            WHERE {" AND ".join(where)}
            ORDER BY updated_at DESC NULLS LAST
            LIMIT %s
            """,
            tuple(params),
        )
        return [dict(row) for row in (cur.fetchall() or [])]


def _intent_for(scope: str, message: str) -> str:
    text = message.lower()
    if scope == "workforce" or any(term in text for term in ("staff", "supervision", "training", "probation", "workforce")):
        return "workforce"
    if scope in {"governance", "inspection", "provider"} or any(term in text for term in ("ofsted", "sccif", "reg 44", "reg44", "reg 45", "reg45", "inspection")):
        return "inspection_sccif"
    if any(term in text for term in ("risk", "safeguarding", "missing", "incident", "harm")):
        return "safeguarding_risk"
    if scope == "child" or any(term in text for term in ("journey", "chronology", "child", "young person")):
        return "child_chronology"
    return "general_operational"


def _filters(*, scope: str, young_person_id: int | None, staff_id: int | None, home_id: int | None) -> dict[str, Any]:
    filters: dict[str, Any] = {}
    if home_id is not None:
        filters["home_id"] = home_id
    if young_person_id is not None:
        filters["young_person_id"] = young_person_id
    if staff_id is not None and scope == "workforce":
        filters["staff_id"] = staff_id
    return filters


def _guarded(label: str, errors: list[str], fn, fallback: Any):
    try:
        return fn()
    except Exception as exc:
        errors.append(f"{label}: {exc}")
        return fallback


def _source(record: dict[str, Any], source_type: str, index: int) -> dict[str, Any]:
    source_id = _text(record.get("source_id") or record.get("record_id") or record.get("original_id") or record.get("id"), f"{source_type}-{index}")
    title = _text(record.get("title") or record.get("document_type") or record.get("type") or source_type.replace("_", " ").title())
    summary = _text(record.get("summary") or record.get("description") or record.get("body") or record.get("extracted_text") or record.get("full_text"), "Record available for review.")
    return {
        **record,
        "title": title,
        "record_type": _text(record.get("record_type") or record.get("source_type") or source_type, source_type),
        "record_id": source_id,
        "route": record.get("source_url") or record.get("route"),
        "date": _text(record.get("date_time") or record.get("created_at") or record.get("updated_at") or record.get("uploaded_at") or record.get("due_date")),
        "citation_ref": record.get("citation_ref") or f"[{index}]",
        "summary": summary,
        "source_type": _text(record.get("source_type") or source_type, source_type),
        "source_id": source_id,
    }


def _ranked_sources(collections: list[tuple[str, list[dict[str, Any]]]], limit: int) -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for source_type, records in collections:
        for record in records:
            item = _source(record, source_type, len(sources) + 1)
            key = (item["record_type"], item["record_id"])
            if key in seen:
                continue
            seen.add(key)
            sources.append(item)
    sources.sort(key=lambda item: item.get("date") or "", reverse=True)
    for index, item in enumerate(sources[:limit], start=1):
        item["citation_ref"] = f"[{index}]"
    return sources[:limit]


def _actions_from(records: list[dict[str, Any]], gaps: list[str]) -> list[dict[str, Any]]:
    actions = [
        {
            "label": _text(record.get("title"), "Review open action"),
            "type": "review",
            "route": record.get("route") or (f"/actions/{record.get('id')}" if record.get("id") else "/actions"),
        }
        for record in records
        if _text(record.get("status")).lower() not in {"completed", "done", "closed", "cancelled", "canceled"}
    ][:5]
    if gaps:
        actions.append({"label": "Review evidence gaps", "type": "review", "route": "/evidence"})
    return actions[:6]


def _child_voice_status(records: list[dict[str, Any]]) -> str:
    text = " ".join(_text(record.get("summary") or record.get("title") or record.get("description")) for record in records).lower()
    if any(term in text for term in ("wishes", "feelings", "child voice", "voice", "consultation", "about me")):
        return "Child voice is visible in the current evidence window."
    return "Child voice is not strongly visible in the current evidence window."


def build_orb_context(
    conn: Any,
    *,
    current_user: dict[str, Any],
    scope: str,
    message: str,
    young_person_id: int | None = None,
    staff_id: int | None = None,
    home_id: int | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    scope = scope if scope in VALID_SCOPES else "home"
    resolved_home_id = home_id or current_home_id(current_user)
    intent = _intent_for(scope, message)
    errors: list[str] = []
    pool = _guarded("db_pool", errors, db_pool_snapshot, {})
    live_tables = _guarded("live_tables", errors, lambda: _existing_tables(conn), [])
    snapshots = _guarded(
        "projection_snapshots",
        errors,
        lambda: _snapshot_rows(
            conn,
            current_user=current_user,
            scope=scope,
            young_person_id=young_person_id,
            staff_id=staff_id,
            home_id=resolved_home_id,
            limit=10,
        ),
        [],
    )

    filters = _filters(scope=scope, young_person_id=young_person_id, staff_id=staff_id, home_id=resolved_home_id)
    chronology: list[dict[str, Any]] = []
    documents: list[dict[str, Any]] = []
    actions: list[dict[str, Any]] = []
    evidence: list[dict[str, Any]] = []
    reports: list[dict[str, Any]] = []
    child_profile: dict[str, Any] | None = None
    workforce: dict[str, Any] = {}
    governance: dict[str, Any] = {}

    degraded = bool(pool.get("saturated"))
    if not degraded:
        chronology_page = _guarded(
            "chronology",
            errors,
            lambda: list_chronology_for_connection(conn, current_user=current_user, filters=filters, page=1, page_size=min(limit, 80)),
            {"items": []},
        )
        chronology = list(chronology_page.get("items") or [])
        documents = _guarded("documents", errors, lambda: list_documents(conn, current_user=current_user, filters=filters, limit=120), [])
        actions = _guarded("actions", errors, lambda: list_actions(conn, current_user=current_user, filters=filters, limit=120), [])
        evidence = _guarded("evidence", errors, lambda: list_evidence(conn, current_user=current_user, filters=filters, limit=120), [])
        reports = _guarded("reports", errors, lambda: list_reports(conn, current_user=current_user, filters=filters, limit=80), [])
        if young_person_id is not None:
            child_profile = _guarded(
                "child_profile",
                errors,
                lambda: get_young_person(conn, young_person_id=int(young_person_id), current_user=current_user),
                None,
            )
        elif scope == "child":
            children = _guarded("young_people", errors, lambda: list_young_people(conn, current_user=current_user, limit=1), [])
            child_profile = children[0] if children else None
        if scope == "workforce" or intent == "workforce":
            workforce = _guarded(
                "workforce",
                errors,
                lambda: WorkforceIntelligenceService().orb_context(conn, current_user=current_user, staff_id=staff_id),
                {},
            )
        if scope in {"governance", "inspection", "provider"} or intent == "inspection_sccif":
            governance = _guarded(
                "governance",
                errors,
                lambda: GovernanceIntelligenceService().build_command_centre(conn, current_user=current_user, home_id=resolved_home_id),
                {},
            )

    metadata_first = orb_metadata_first_context_service.build(
        snapshots=snapshots,
        chronology=chronology,
        evidence=evidence,
        documents=documents,
        actions=actions,
        reports=reports,
        workforce=workforce,
        governance=governance,
        live_tables=live_tables,
        pool=pool,
    )
    sources = _ranked_sources(
        [
            ("snapshot", metadata_first["snapshot_sources"]),
            ("chronology", chronology),
            ("document", documents),
            ("action", actions),
            ("evidence", evidence),
            ("report", reports),
            ("workforce", workforce.get("evidence_sources") or []),
            ("governance", ((governance.get("orb_governance_summary") or {}).get("evidence_sources") or [])),
        ],
        limit=max(1, min(limit, 80)),
    )

    context = {
        "scope": scope,
        "intent": intent,
        "message": message,
        "home_id": resolved_home_id,
        "provider_id": current_provider_id(current_user),
        "allowed_home_ids": current_allowed_home_ids(current_user),
        "young_person_id": young_person_id,
        "staff_id": staff_id,
        "child_profile": child_profile or {},
        "chronology": chronology,
        "safeguarding": [item for item in chronology if "safeguarding" in _text(item.get("source_type") or item.get("category") or item.get("title")).lower()],
        "documents": documents,
        "actions": actions,
        "evidence": evidence,
        "reports": reports,
        "workforce": workforce,
        "governance": governance,
        "sources": sources,
        "projection_keys": metadata_first["projection_keys"],
        "metadata_used": metadata_first["metadata_used"],
        "metadata_first": metadata_first,
        "live_tables": live_tables,
        "snapshot_hit": bool(snapshots),
        "degraded": degraded,
        "pool": pool,
        "errors": errors,
        "guardrails": GUARDRAILS,
        "shared_assistant_context": build_shared_assistant_context(
            current_user=current_user,
            requested_context={
                "home_id": resolved_home_id,
                "young_person_id": young_person_id,
                "staff_id": staff_id,
                "assistant_surface": "orb",
                "current_route": "/orb",
                "workspace": scope,
            },
            mode="embedded",
        ).model_dump(),
    }
    context.update(orb_live_context_enrichment.enrich(message=message, context=context))
    context["child_voice"] = {"status": _child_voice_status([*chronology, *documents, *evidence])}
    return context


def build_orb_response(context: dict[str, Any]) -> dict[str, Any]:
    if context.get("answer") and context.get("summary") and context.get("context_used"):
        return {
            "ok": True,
            "answer": context["answer"],
            "summary": context["summary"],
            "sources": list(context.get("sources") or []),
            "citations": list(context.get("citations") or context.get("sources") or []),
            "actions": list(context.get("actions") or []),
            "confidence": context.get("confidence") or "medium",
            "guardrails": context.get("guardrails") or GUARDRAILS,
            "context_used": context["context_used"],
            "care_journey": context.get("care_journey") or {},
            "regulatory_reasoning": context.get("regulatory_reasoning") or {},
            "therapeutic_reasoning": context.get("therapeutic_reasoning") or {},
            "operational_cognition": context.get("operational_cognition") or {},
            "trajectory_reasoning": context.get("trajectory_reasoning") or {},
            "operational_atmosphere": context.get("operational_atmosphere") or {},
            "rm_reflection": context.get("rm_reflection") or {},
            "risk_intelligence": context.get("risk_intelligence") or {},
            "projection_keys": (context.get("context_used") or {}).get("projection_keys") or [],
            "snapshot_status": {"hit": bool((context.get("context_used") or {}).get("snapshot_hit")), "projection_keys": (context.get("context_used") or {}).get("projection_keys") or []},
            "live_status": {"degraded": bool((context.get("context_used") or {}).get("degraded")), "tables": (context.get("context_used") or {}).get("live_tables") or []},
            "metadata_used": context.get("metadata_used") or {},
        }
    care_journey = OrbCareJourneyService().build(context)
    cognition = orb_operational_cognition_service.build(context)
    trajectory = orb_trajectory_reasoning_service.build(context)
    atmosphere = orb_operational_atmosphere_service.build(context=context, cognition=cognition, trajectory=trajectory)
    rm_reflection = orb_rm_reflection_service.build(cognition, trajectory)
    regulatory = OrbRegulatoryReasoningService().build(context=context, care_journey=care_journey)
    therapeutic = OrbTherapeuticReasoningService().build(context=context, care_journey=care_journey)
    answer, summary, confidence = OrbResponseComposer().compose(
        context=context,
        care_journey=care_journey,
        regulatory=regulatory,
        therapeutic=therapeutic,
        guardrails=context.get("guardrails") or GUARDRAILS,
    )
    evidence_gaps = list(regulatory.get("evidence_gaps") or [])
    context_used = {
        "scope": context.get("scope"),
        "intent": context.get("intent"),
        "projection_keys": context.get("projection_keys") or [],
        "live_tables": context.get("live_tables") or [],
        "snapshot_hit": bool(context.get("snapshot_hit")),
        "degraded": bool(context.get("degraded")),
        "pool_saturation_pct": (context.get("pool") or {}).get("saturation_pct", 0.0),
        "metadata_strategy": (context.get("metadata_first") or {}).get("cost_strategy") or {},
        "child_voice_status": (context.get("child_voice") or {}).get("status"),
    }
    return {
        "ok": True,
        "answer": answer,
        "summary": summary,
        "sources": list(context.get("sources") or []),
        "citations": list(context.get("sources") or []),
        "actions": _actions_from(list(context.get("actions") or []), evidence_gaps),
        "confidence": confidence,
        "guardrails": context.get("guardrails") or GUARDRAILS,
        "care_journey": care_journey,
        "regulatory_reasoning": regulatory,
        "therapeutic_reasoning": therapeutic,
        "operational_cognition": cognition,
        "trajectory_reasoning": trajectory,
        "operational_atmosphere": atmosphere,
        "rm_reflection": rm_reflection,
        "risk_intelligence": context.get("risk_intelligence") or {},
        "context_used": context_used,
        "projection_keys": context_used["projection_keys"],
        "snapshot_status": {"hit": context_used["snapshot_hit"], "projection_keys": context_used["projection_keys"]},
        "live_status": {
            "degraded": context_used["degraded"],
            "pool_saturation_pct": context_used["pool_saturation_pct"],
            "tables": context_used["live_tables"],
        },
        "metadata_used": context.get("metadata_used") or {},
    }
