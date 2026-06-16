from __future__ import annotations

import uuid
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


OPERATIONAL_BOUNDARY_NOTICES = [
    "Permissioned context only — ORB only sees information available to your role.",
    "ORB does not make final safeguarding, legal or inspection decisions.",
    "ORB does not predict Ofsted grades.",
    "Draft actions and wording require registered manager or designated safeguarding review.",
    "Responses are evidence-focused and child-centred, not punitive.",
]

SCOPE_TO_LEGACY = {
    "home": "home",
    "child": "child",
    "staff": "workforce",
    "provider": "provider",
    "current_user": "home",
}


def _summary_count(items: list[Any]) -> int:
    return len(items or [])


def _strip_raw_records(bundle: dict[str, Any]) -> dict[str, Any]:
    """Keep summary-level fields only — no raw chronology/document bodies by default."""
    metadata = bundle.get("metadata_first") or {}
    return {
        "scope": bundle.get("scope"),
        "intent": bundle.get("intent"),
        "home_id": bundle.get("home_id"),
        "young_person_id": bundle.get("young_person_id"),
        "staff_id": bundle.get("staff_id"),
        "degraded": bool(bundle.get("degraded")),
        "errors": list(bundle.get("errors") or [])[:6],
        "guardrails": list(bundle.get("guardrails") or GUARDRAILS)[:6],
        "projection_keys": list(bundle.get("projection_keys") or [])[:12],
        "snapshot_hit": bool(bundle.get("snapshot_hit")),
        "counts": {
            "chronology": _summary_count(bundle.get("chronology")),
            "documents": _summary_count(bundle.get("documents")),
            "actions": _summary_count(bundle.get("actions")),
            "evidence": _summary_count(bundle.get("evidence")),
            "reports": _summary_count(bundle.get("reports")),
        },
        "metadata_summary": {
            "themes": (metadata.get("themes") or [])[:8],
            "pressure_signals": (metadata.get("pressure_signals") or [])[:6],
            "evidence_gaps": (metadata.get("evidence_gaps") or [])[:6],
        },
        "child_voice": bundle.get("child_voice") or {},
        "operational_cognition": (bundle.get("operational_cognition") or {}).get("cognition_summary"),
        "sources": [
            {
                "label": _text(s.get("title"), "Source"),
                "source_type": _text(s.get("source_type"), "summary"),
                "basis": _text(s.get("summary"), "")[:240],
                "route": s.get("route"),
            }
            for s in (bundle.get("sources") or [])[:12]
        ],
    }


class OrbOperationalContextBridge:
    """Safe permissioned operational summaries for OS ORB intelligence bridge."""

    def build_context(
        self,
        request: Any,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> dict[str, Any]:
        from schemas.orb_operational import OrbOperationalContextSummary, OrbOperationalRequest

        req = request if isinstance(request, OrbOperationalRequest) else OrbOperationalRequest.model_validate(request)
        scope = req.scope if req.scope in SCOPE_TO_LEGACY else "current_user"
        home_id = req.home_id or current_home_id(current_user)
        child_id = req.child_id
        staff_id = req.staff_id
        days = max(1, min(int(req.days or 7), 90))

        if scope == "child" and child_id is None:
            return {
                "summary": OrbOperationalContextSummary(
                    headline="Child context required",
                    permission_warnings=["Select a child or provide child_id for child-scoped questions."],
                ).model_dump(),
                "permissions": self._permission_summary(current_user, scope=scope, home_id=home_id),
                "sources": [],
                "raw_available": False,
            }

        builder = {
            "home": self.build_home_context,
            "child": self.build_child_context,
            "staff": self.build_staff_context,
            "provider": self.build_governance_context,
            "current_user": self.build_manager_context,
        }.get(scope, self.build_manager_context)

        if scope == "child":
            payload = builder(child_id, days, current_user, conn=conn, home_id=home_id, request=req)
        elif scope == "staff":
            payload = builder(staff_id, days, current_user, conn=conn, home_id=home_id, request=req)
        else:
            payload = builder(home_id, days, current_user, conn=conn, request=req)

        payload["permissions"] = self._permission_summary(
            current_user,
            scope=scope,
            home_id=home_id,
            child_id=child_id,
            staff_id=staff_id,
            care_access=bool(payload.get("raw_available")),
        )
        return payload

    def build_home_context(
        self,
        home_id: int | None,
        days: int,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
        request: Any | None = None,
    ) -> dict[str, Any]:
        return self._build_scoped_context(
            scope="home",
            message=_text(getattr(request, "message", None), "Operational home summary"),
            current_user=current_user,
            conn=conn,
            home_id=home_id,
            days=days,
            request=request,
        )

    def build_child_context(
        self,
        child_id: int | None,
        days: int,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
        home_id: int | None = None,
        request: Any | None = None,
    ) -> dict[str, Any]:
        return self._build_scoped_context(
            scope="child",
            message=_text(getattr(request, "message", None), "Child journey summary"),
            current_user=current_user,
            conn=conn,
            home_id=home_id,
            young_person_id=child_id,
            days=days,
            request=request,
        )

    def build_staff_context(
        self,
        staff_id: int | None,
        days: int,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
        home_id: int | None = None,
        request: Any | None = None,
    ) -> dict[str, Any]:
        return self._build_scoped_context(
            scope="staff",
            message=_text(getattr(request, "message", None), "Staff support summary"),
            current_user=current_user,
            conn=conn,
            home_id=home_id,
            staff_id=staff_id,
            days=days,
            request=request,
        )

    def build_manager_context(
        self,
        home_id: int | None,
        days: int,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
        request: Any | None = None,
    ) -> dict[str, Any]:
        return self._build_scoped_context(
            scope="current_user",
            message=_text(getattr(request, "message", None), "What needs my attention today?"),
            current_user=current_user,
            conn=conn,
            home_id=home_id,
            days=days,
            request=request,
            include_brief=True,
        )

    def build_governance_context(
        self,
        home_id: int | None,
        days: int,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
        request: Any | None = None,
    ) -> dict[str, Any]:
        return self._build_scoped_context(
            scope="provider",
            message=_text(getattr(request, "message", None), "Governance briefing"),
            current_user=current_user,
            conn=conn,
            home_id=home_id,
            days=days,
            request=request,
            governance=True,
        )

    def summarise_context(self, context: dict[str, Any]) -> dict[str, Any]:
        from schemas.orb_operational import OrbOperationalContextSummary

        summary = context.get("summary")
        if isinstance(summary, dict):
            return summary
        if hasattr(summary, "model_dump"):
            return summary.model_dump()
        return OrbOperationalContextSummary().model_dump()

    def safe_context_sources(self, context: dict[str, Any]) -> list[dict[str, Any]]:
        return list(context.get("sources") or [])

    def _permission_summary(
        self,
        current_user: dict[str, Any],
        *,
        scope: str,
        home_id: int | None,
        child_id: int | None = None,
        staff_id: int | None = None,
        care_access: bool = False,
    ) -> dict[str, Any]:
        from schemas.orb_operational import OrbOperationalPermissionSummary

        return OrbOperationalPermissionSummary(
            role=_text(current_user.get("role")),
            allowed_home_ids=current_allowed_home_ids(current_user),
            home_id=home_id,
            provider_id=current_provider_id(current_user),
            care_record_access=care_access,
            scope_resolved=scope,
        ).model_dump()

    def _build_scoped_context(
        self,
        *,
        scope: str,
        message: str,
        current_user: dict[str, Any],
        conn: Any | None,
        home_id: int | None,
        days: int,
        request: Any | None = None,
        young_person_id: int | None = None,
        staff_id: int | None = None,
        include_brief: bool = False,
        governance: bool = False,
    ) -> dict[str, Any]:
        from schemas.orb_operational import OrbOperationalContextSummary

        warnings: list[str] = []
        sources: list[dict[str, Any]] = []
        summary = OrbOperationalContextSummary()
        raw_available = False
        mode = _text(getattr(request, "mode", None), "general_operational_question")

        if conn is None:
            summary.unavailable = True
            summary.degraded = True
            summary.headline = "Operational context is temporarily unavailable"
            summary.permission_warnings.append(
                "Database connection was not available; answer uses general operational guidance only."
            )
            return {
                "summary": summary,
                "sources": sources,
                "raw_available": False,
                "mode": mode,
                "scope": scope,
            }

        try:
            legacy_scope = SCOPE_TO_LEGACY.get(scope, "home")
            if governance:
                legacy_scope = "governance"
            bundle = build_orb_context(
                conn,
                current_user=current_user,
                scope=legacy_scope,
                message=message,
                young_person_id=young_person_id,
                staff_id=staff_id,
                home_id=home_id,
                limit=40,
            )
            raw_available = not bool(bundle.get("degraded"))
            if bundle.get("degraded"):
                summary.degraded = True
                warnings.append("Operational context is partially available due to database load.")

            stripped = _strip_raw_records(bundle)
            summary.headline = _text(
                (bundle.get("operational_cognition") or {}).get("cognition_summary"),
                "Permissioned operational summary prepared for your role.",
            )[:280]
            meta = stripped.get("metadata_summary") or {}
            summary.themes = list(meta.get("themes") or [])[:8]
            summary.summary_lines = [
                f"Chronology items in window: {stripped['counts']['chronology']}",
                f"Open actions in window: {stripped['counts']['actions']}",
                f"Evidence items in window: {stripped['counts']['evidence']}",
            ]
            if bundle.get("child_voice"):
                summary.child_journey_notes.append(
                    _text((bundle.get("child_voice") or {}).get("status"), "Child voice status unavailable.")
                )

            sources.extend(stripped.get("sources") or [])

            req = request
            if req and getattr(req, "include_patterns", True):
                self._attach_pattern_summaries(summary, bundle, sources, days=days, home_id=home_id)

            if req and getattr(req, "include_record_quality", True):
                self._attach_record_quality(summary, bundle, sources)

            if include_brief or mode == "manager_daily_brief":
                self._attach_manager_brief(summary, bundle, sources, days=days, home_id=home_id)

            if mode in {"safeguarding_themes", "action_priority"} and req and getattr(req, "include_actions", True):
                self._attach_action_attention(summary, sources, home_id=home_id, child_id=young_person_id, staff_id=staff_id, conn=conn)

            if mode == "ofsted_evidence_review":
                self._attach_ofsted_notes(summary, bundle, sources)

            if mode == "governance_briefing" or governance:
                gov = bundle.get("governance") or {}
                orb_summary = (gov.get("orb_governance_summary") or {}) if isinstance(gov, dict) else {}
                for line in (orb_summary.get("headline_lines") or orb_summary.get("themes") or [])[:6]:
                    summary.governance_notes.append(_text(line))
                if orb_summary:
                    sources.append(
                        {
                            "label": "Governance intelligence",
                            "source_type": "governance_intelligence",
                            "basis": _text(orb_summary.get("summary"), "Governance summary")[:240],
                            "route": "/governance",
                        }
                    )

            if mode == "staff_support" or scope == "staff":
                workforce = bundle.get("workforce") or {}
                for line in (workforce.get("support_themes") or workforce.get("themes") or [])[:6]:
                    summary.staff_support_notes.append(_text(line))
                if workforce:
                    sources.append(
                        {
                            "label": "Workforce intelligence",
                            "source_type": "workforce_intelligence",
                            "basis": _text(workforce.get("summary"), "Workforce summary")[:240],
                            "route": "/staff",
                        }
                    )

            summary.permission_warnings.extend(warnings)
        except Exception as exc:
            summary.unavailable = True
            summary.degraded = True
            summary.headline = "Operational context is temporarily unavailable"
            summary.permission_warnings.append(f"Context collection failed softly: {exc}")

        return {
            "summary": summary,
            "sources": sources,
            "raw_available": raw_available,
            "mode": mode,
            "scope": scope,
        }

    def _attach_pattern_summaries(
        self,
        summary: Any,
        bundle: dict[str, Any],
        sources: list[dict[str, Any]],
        *,
        days: int,
        home_id: int | None,
    ) -> None:
        try:
            from services.pattern_detection_service import pattern_detection_service

            records = []
            for item in (bundle.get("chronology") or [])[:40]:
                records.append(
                    {
                        "record_id": item.get("id") or item.get("record_id"),
                        "record_type": item.get("source_type") or "chronology",
                        "summary": _text(item.get("summary") or item.get("title")),
                    }
                )
            patterns = pattern_detection_service.detect(records=records, home_id=home_id, days=days)
            for pattern in patterns[:8]:
                summary.safeguarding_signals.append(_text(pattern.summary))
            if patterns:
                sources.append(
                    {
                        "label": "Pattern detection",
                        "source_type": "pattern_detection",
                        "basis": f"{len(patterns)} pattern(s) in the review window",
                        "route": "/intelligence-spine",
                    }
                )
        except Exception:
            return

    def _attach_record_quality(
        self,
        summary: Any,
        bundle: dict[str, Any],
        sources: list[dict[str, Any]],
    ) -> None:
        try:
            from services.record_quality_intelligence_service import record_quality_intelligence_service

            records = []
            for item in (bundle.get("chronology") or [])[:30]:
                records.append(
                    {
                        "record_id": item.get("id") or item.get("record_id"),
                        "record_type": item.get("source_type") or "chronology",
                        "body": _text(item.get("summary") or item.get("title")),
                    }
                )
            reviews = record_quality_intelligence_service.review_records(records)
            for review in reviews[:6]:
                if review.manager_review_required or review.weak_recording_quality:
                    summary.record_quality_notes.append(
                        f"Record {review.record_id}: review may be helpful ({review.overall_quality})."
                    )
            if reviews:
                sources.append(
                    {
                        "label": "Record quality intelligence",
                        "source_type": "record_quality_intelligence",
                        "basis": f"{len(reviews)} record(s) reviewed at summary level",
                        "route": "/intelligence-spine",
                    }
                )
        except Exception:
            return

    def _attach_manager_brief(
        self,
        summary: Any,
        bundle: dict[str, Any],
        sources: list[dict[str, Any]],
        *,
        days: int,
        home_id: int | None,
    ) -> None:
        try:
            from services.registered_manager_daily_brief_service import registered_manager_daily_brief_service

            records = []
            for item in (bundle.get("chronology") or [])[:50]:
                records.append(
                    {
                        "record_id": item.get("id") or item.get("record_id"),
                        "record_type": item.get("source_type") or "chronology",
                        "summary": _text(item.get("summary") or item.get("title")),
                    }
                )
            brief = registered_manager_daily_brief_service.build_daily_brief(
                records,
                home_id=home_id,
                days=max(1, days),
            )
            summary.headline = _text(brief.get("headline"), summary.headline)
            for key, target in (
                ("urgent_review", summary.attention_items),
                ("safeguarding_signals", summary.safeguarding_signals),
                ("children_to_review", summary.child_journey_notes),
                ("staff_support_signals", summary.staff_support_notes),
                ("ofsted_evidence_risks", summary.ofsted_evidence_notes),
                ("quality_of_recording", summary.record_quality_notes),
            ):
                for line in (brief.get(key) or [])[:6]:
                    target.append(_text(line))
            sources.append(
                {
                    "label": "Manager daily brief",
                    "source_type": "registered_manager_daily_brief",
                    "basis": _text(brief.get("headline")),
                    "route": "/command-centre",
                }
            )
        except Exception:
            return

    def _attach_ofsted_notes(
        self,
        summary: Any,
        bundle: dict[str, Any],
        sources: list[dict[str, Any]],
    ) -> None:
        try:
            from services.ofsted_judgement_simulation_service import ofsted_judgement_simulation_service

            records = []
            for item in (bundle.get("evidence") or bundle.get("chronology") or [])[:40]:
                records.append(
                    {
                        "record_id": item.get("id") or item.get("record_id"),
                        "record_type": item.get("source_type") or "evidence",
                        "summary": _text(item.get("summary") or item.get("title")),
                    }
                )
            simulation = ofsted_judgement_simulation_service.simulate(records)
            for item in simulation[:6]:
                summary.ofsted_evidence_notes.append(
                    f"{item.judgement_area.replace('_', ' ')}: evidence appears {item.evidence_strength}; manager review recommended."
                )
            if simulation:
                sources.append(
                    {
                        "label": "Ofsted evidence simulation",
                        "source_type": "ofsted_judgement_simulation",
                        "basis": "Evidence strength summary only — not a grade prediction",
                        "route": "/governance",
                    }
                )
        except Exception:
            return

    def _attach_action_attention(
        self,
        summary: Any,
        sources: list[dict[str, Any]],
        *,
        home_id: int | None,
        child_id: int | None,
        staff_id: int | None,
        conn: Any,
    ) -> None:
        try:
            from services.intelligence_action_service import intelligence_action_service

            feed = intelligence_action_service.build_attention_feed(
                home_id=home_id,
                child_id=child_id,
                staff_id=staff_id,
                conn=conn,
            )
            for bucket in (feed.urgent, feed.high_priority, feed.awaiting_decision):
                for item in bucket[:4]:
                    summary.attention_items.append(_text(item.title, item.label))
            sources.append(
                {
                    "label": "Action attention feed",
                    "source_type": "intelligence_action",
                    "basis": "Summary-level action attention items",
                    "route": "/intelligence-actions",
                }
            )
        except Exception:
            return

    def build_context_cards(self, context: dict[str, Any], request: Any) -> list[dict[str, Any]]:
        from schemas.orb_operational import OrbOperationalContextCard

        summary = context.get("summary")
        if hasattr(summary, "model_dump"):
            summary_data = summary.model_dump()
        elif isinstance(summary, dict):
            summary_data = summary
        else:
            summary_data = {}

        cards: list[dict[str, Any]] = []
        unavailable = bool(summary_data.get("unavailable"))
        degraded = bool(summary_data.get("degraded"))

        if unavailable or degraded:
            cards.append(
                OrbOperationalContextCard(
                    id=f"ctx-health-{uuid.uuid4().hex[:8]}",
                    title="Operational context temporarily unavailable"
                    if unavailable
                    else "Operational context partially available",
                    type="context_health",
                    summary=_text(
                        (summary_data.get("permission_warnings") or ["Database or permission context limited."])[0],
                        "Summary-level guidance only until context is restored.",
                    ),
                    severity="high" if unavailable else "medium",
                    source_label="Context health",
                    route_hint="/assistant/orb",
                    metadata={"degraded": degraded, "unavailable": unavailable},
                ).model_dump()
            )

        if summary_data.get("headline") and not unavailable:
            cards.append(
                OrbOperationalContextCard(
                    id=f"manager-brief-{uuid.uuid4().hex[:8]}",
                    title="Manager daily brief",
                    type="manager_daily_brief",
                    summary=_text(summary_data.get("headline"))[:280],
                    severity="medium" if summary_data.get("attention_items") else "info",
                    source_label="Registered manager daily brief",
                    route_hint="/command-centre",
                    count=len(summary_data.get("attention_items") or []),
                ).model_dump()
            )

        safeguarding = summary_data.get("safeguarding_signals") or []
        if safeguarding:
            cards.append(
                OrbOperationalContextCard(
                    id=f"safeguarding-{uuid.uuid4().hex[:8]}",
                    title="Safeguarding themes",
                    type="safeguarding_theme",
                    summary=_text(safeguarding[0])[:280],
                    severity="high",
                    source_label="Pattern detection",
                    route_hint="/intelligence-spine",
                    count=len(safeguarding),
                ).model_dump()
            )

        quality_notes = summary_data.get("record_quality_notes") or []
        if quality_notes:
            cards.append(
                OrbOperationalContextCard(
                    id=f"record-quality-{uuid.uuid4().hex[:8]}",
                    title="Record quality",
                    type="record_quality",
                    summary=_text(quality_notes[0])[:280],
                    severity="medium",
                    source_label="Record quality intelligence",
                    route_hint="/intelligence-spine",
                    count=len(quality_notes),
                ).model_dump()
            )

        attention = summary_data.get("attention_items") or []
        if attention:
            cards.append(
                OrbOperationalContextCard(
                    id=f"actions-{uuid.uuid4().hex[:8]}",
                    title="Action attention",
                    type="action_attention",
                    summary=_text(attention[0])[:280],
                    severity="high" if len(attention) > 2 else "medium",
                    source_label="Intelligence actions",
                    route_hint="/intelligence-actions",
                    count=len(attention),
                ).model_dump()
            )

        ofsted = summary_data.get("ofsted_evidence_notes") or []
        if ofsted:
            cards.append(
                OrbOperationalContextCard(
                    id=f"ofsted-{uuid.uuid4().hex[:8]}",
                    title="Ofsted evidence strength",
                    type="ofsted_evidence",
                    summary=_text(ofsted[0])[:280],
                    severity="medium",
                    source_label="Ofsted evidence simulation",
                    route_hint="/governance",
                    count=len(ofsted),
                    metadata={"not_a_grade_prediction": True},
                ).model_dump()
            )

        workforce = summary_data.get("staff_support_notes") or []
        if workforce:
            cards.append(
                OrbOperationalContextCard(
                    id=f"workforce-{uuid.uuid4().hex[:8]}",
                    title="Workforce support",
                    type="workforce",
                    summary=_text(workforce[0])[:280],
                    severity="medium",
                    source_label="Workforce intelligence",
                    route_hint="/staff",
                    count=len(workforce),
                ).model_dump()
            )

        child_notes = summary_data.get("child_journey_notes") or []
        if child_notes and getattr(request, "scope", None) in {"child", "current_user"}:
            cards.append(
                OrbOperationalContextCard(
                    id=f"child-journey-{uuid.uuid4().hex[:8]}",
                    title="Child journey",
                    type="child_journey",
                    summary=_text(child_notes[0])[:280],
                    severity="medium",
                    source_label="Care journey summary",
                    route_hint="/young-people",
                    count=len(child_notes),
                ).model_dump()
            )

        governance = summary_data.get("governance_notes") or []
        if governance:
            cards.append(
                OrbOperationalContextCard(
                    id=f"governance-{uuid.uuid4().hex[:8]}",
                    title="Governance",
                    type="governance",
                    summary=_text(governance[0])[:280],
                    severity="medium",
                    source_label="Governance intelligence",
                    route_hint="/governance",
                    count=len(governance),
                ).model_dump()
            )

        return cards[:12]

    def build_evidence_items(self, context: dict[str, Any], request: Any) -> list[dict[str, Any]]:
        from schemas.orb_operational import OrbOperationalEvidenceItem

        _ = request
        items: list[dict[str, Any]] = []
        for index, raw in enumerate(self.safe_context_sources(context)[:12]):
            basis = _text(raw.get("basis"), "")[:240]
            items.append(
                OrbOperationalEvidenceItem(
                    id=f"evidence-{index + 1}",
                    label=_text(raw.get("label"), "Operational source"),
                    source_type=_text(raw.get("source_type"), "summary"),
                    basis=basis or None,
                    route=raw.get("route"),
                    severity="info",
                ).model_dump()
            )
        return items

    def build_recommendations(self, context: dict[str, Any], request: Any) -> list[dict[str, Any]]:
        from schemas.orb_operational import OrbOperationalRecommendation

        summary = context.get("summary")
        if hasattr(summary, "model_dump"):
            summary_data = summary.model_dump()
        elif isinstance(summary, dict):
            summary_data = summary
        else:
            summary_data = {}

        recommendations: list[dict[str, Any]] = []
        source_labels = [_text(s.get("label")) for s in self.safe_context_sources(context)[:6] if s.get("label")]

        for index, item in enumerate((summary_data.get("attention_items") or [])[:4]):
            recommendations.append(
                OrbOperationalRecommendation(
                    id=f"rec-attention-{index}",
                    title=_text(item, "Review attention item")[:120],
                    summary="Listed in the operational attention feed for your scope.",
                    priority="high",
                    rationale="Action attention feed",
                    source_labels=source_labels[:3] or ["Intelligence actions"],
                    suggested_action="Review and accept or dismiss in Intelligence Actions.",
                    review_required=True,
                    manager_review_reason="Attention items require manager oversight.",
                    route_hint="/intelligence-actions",
                ).model_dump()
            )

        for index, signal in enumerate((summary_data.get("safeguarding_signals") or [])[:3]):
            recommendations.append(
                OrbOperationalRecommendation(
                    id=f"rec-safeguarding-{index}",
                    title="Review safeguarding theme",
                    summary=_text(signal)[:240],
                    priority="urgent",
                    rationale="Emerging safeguarding pattern",
                    source_labels=source_labels[:3] or ["Pattern detection"],
                    suggested_action="Follow local safeguarding procedure and manager review.",
                    review_required=True,
                    manager_review_reason="Safeguarding themes are not threshold decisions.",
                    route_hint="/intelligence-spine",
                ).model_dump()
            )

        for index, note in enumerate((summary_data.get("record_quality_notes") or [])[:3]):
            recommendations.append(
                OrbOperationalRecommendation(
                    id=f"rec-quality-{index}",
                    title="Record quality review",
                    summary=_text(note)[:240],
                    priority="medium",
                    rationale="Recording may need strengthening",
                    source_labels=["Record quality intelligence"],
                    suggested_action="Review recording with the author or manager.",
                    review_required=True,
                    manager_review_reason="Recording quality supports Inspection evidence preparation.",
                    route_hint="/intelligence-spine",
                ).model_dump()
            )

        mode = _text(getattr(request, "mode", None), "")
        if mode == "action_priority" and not recommendations:
            recommendations.append(
                OrbOperationalRecommendation(
                    id="rec-prioritise",
                    title="Prioritise open actions",
                    summary="Review Intelligence Actions and Care Hub action board for your scope.",
                    priority="medium",
                    source_labels=source_labels[:2] or ["Operational ORB"],
                    suggested_action="Open Intelligence Actions to accept or defer proposed items.",
                    review_required=True,
                    route_hint="/intelligence-actions",
                ).model_dump()
            )

        return recommendations[:10]

    def build_review_prompts(self, context: dict[str, Any], request: Any) -> list[dict[str, Any]]:
        from schemas.orb_operational import OrbOperationalReviewPrompt

        prompts: list[dict[str, Any]] = []
        for rec in self.build_recommendations(context, request):
            if not rec.get("review_required"):
                continue
            prompts.append(
                OrbOperationalReviewPrompt(
                    id=f"review-{rec['id']}",
                    title=rec["title"],
                    reason=_text(rec.get("manager_review_reason"), "Manager review recommended."),
                    priority=rec.get("priority") or "medium",
                    route_hint=rec.get("route_hint"),
                ).model_dump()
            )
        if getattr(request, "mode", None) == "safeguarding_themes":
            prompts.append(
                OrbOperationalReviewPrompt(
                    id="review-safeguarding-policy",
                    title="Apply local safeguarding procedure",
                    reason="ORB surfaces themes only — not threshold or statutory decisions.",
                    priority="urgent",
                    route_hint="/intelligence-oversight",
                ).model_dump()
            )
        return prompts[:8]

    def build_context_status(self, context: dict[str, Any], request: Any) -> dict[str, Any]:
        from schemas.orb_operational import OrbOperationalContextStatus

        _ = request
        summary = context.get("summary")
        permissions = context.get("permissions") or {}
        if hasattr(summary, "model_dump"):
            summary_data = summary.model_dump()
        elif isinstance(summary, dict):
            summary_data = summary
        else:
            summary_data = {}
        if hasattr(permissions, "model_dump"):
            perm_data = permissions.model_dump()
        elif isinstance(permissions, dict):
            perm_data = permissions
        else:
            perm_data = {}

        unavailable = bool(summary_data.get("unavailable"))
        degraded = bool(summary_data.get("degraded"))
        allowed = perm_data.get("allowed_home_ids") or []
        message = None
        if unavailable:
            message = "Operational context temporarily unavailable — general guidance only."
        elif degraded:
            message = "Operational context is partially available."

        return OrbOperationalContextStatus(
            available=not unavailable,
            degraded=degraded,
            unavailable=unavailable,
            care_record_access=bool(context.get("raw_available") or perm_data.get("care_record_access")),
            homes_accessible=len(allowed) if allowed else None,
            message=message,
            permission_warnings=list(summary_data.get("permission_warnings") or [])[:6],
        ).model_dump()

    def build_audit_summary(
        self,
        context: dict[str, Any],
        request: Any,
        *,
        audit_reference: str | None = None,
        current_user: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        from schemas.orb_operational import OrbOperationalAuditSummary

        role = _text((current_user or {}).get("role"))
        scope = _text(getattr(request, "scope", None))
        return OrbOperationalAuditSummary(
            audit_reference=audit_reference,
            role=role or None,
            scope=scope or None,
            permissioned_context=True,
            care_record_access=bool(context.get("raw_available")),
            boundary_notice=OPERATIONAL_BOUNDARY_NOTICES[0],
        ).model_dump()


orb_operational_context_bridge = OrbOperationalContextBridge()
