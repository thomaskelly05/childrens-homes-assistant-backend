from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException

from core.policy_engine import context_from_user
from core.provider_context import ProviderContextError
from repositories.actions_repository import list_actions
from repositories.documents_repository import list_documents
from repositories.evidence_repository import build_coverage, list_evidence
from repositories.os_repository_utils import safe_int
from repositories.reports_repository import list_reports
from repositories.workspaces_repository import adult_workspace, young_person_workspace
from services.assistant_context_service import SharedAssistantContext
from services.governance_intelligence_service import GovernanceIntelligenceService, governance_feature_flags
from services.os_chronology_service import list_chronology
from services.workforce_intelligence_service import WorkforceIntelligenceService


@dataclass
class AssistantRetrievalResult:
    sources: list[dict[str, Any]]
    related_records: list[dict[str, Any]]
    suggested_actions: list[dict[str, Any]]
    evidence_gaps: list[dict[str, Any]]
    regulatory_links: list[dict[str, Any]]
    retrieval_errors: list[str]


def _text(value: Any) -> str:
    return str(value or "").strip()


def _safe_lower(value: Any) -> str:
    return _text(value).lower()


def _scope_filters(context: SharedAssistantContext) -> dict[str, Any]:
    filters: dict[str, Any] = {}
    if context.home_id is not None:
        filters["home_id"] = context.home_id
    if context.selected_young_person_id is not None:
        filters["young_person_id"] = context.selected_young_person_id
    filters.update({key: value for key, value in context.active_filters.items() if value not in (None, "", [], {})})
    return filters


def _assert_scope_allowed(context: SharedAssistantContext, current_user: dict[str, Any]) -> None:
    try:
        provider_context = context_from_user(current_user, requested_home_id=context.home_id)
    except ProviderContextError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    if not provider_context.assistant_access:
        raise HTTPException(status_code=403, detail="You do not have permission to use the assistant.")


def _normalise_source(source: dict[str, Any], source_type: str) -> dict[str, Any]:
    source_id = _text(source.get("source_id") or source.get("original_id") or source.get("id"))
    title = _text(source.get("title") or source.get("document_type") or source.get("type") or source_type.replace("_", " ").title())
    summary = _text(source.get("summary") or source.get("description") or source.get("body") or source.get("extracted_text") or source.get("full_text"))
    date_value = source.get("date_time") or source.get("created_at") or source.get("updated_at") or source.get("uploaded_at") or source.get("due_date")
    source_type_value = _text(source.get("source_type") or source_type)
    return {
        **source,
        "source_type": source_type_value,
        "source_id": source_id,
        "title": title,
        "summary": summary,
        "retrieval_text": "\n\n".join(part for part in [title, summary] if part),
        "date_time": date_value,
        "route": source.get("source_url") or source.get("route"),
        "confidence": source.get("confidence") or ("high" if summary else "medium"),
        "source_quality": source.get("quality") or source.get("source_quality") or "available",
    }


def _keyword_score(message: str, source: dict[str, Any], context: SharedAssistantContext) -> int:
    haystack = " ".join(
        [
            _safe_lower(source.get("title")),
            _safe_lower(source.get("summary")),
            _safe_lower(source.get("retrieval_text")),
            _safe_lower(source.get("source_type")),
            " ".join(_safe_lower(tag) for tag in (source.get("tags") or [])),
        ]
    )
    terms = {
        term
        for term in _safe_lower(message).replace("/", " ").replace("-", " ").split()
        if len(term) >= 4
    }
    score = sum(2 for term in terms if term in haystack)
    if context.selected_record_id and context.selected_record_id in {
        _text(source.get("id")),
        _text(source.get("source_id")),
        _text(source.get("original_id")),
    }:
        score += 20
    if _text(source.get("id")) in context.visible_chronology_ids:
        score += 6
    if _text(source.get("id")) in context.visible_action_ids:
        score += 6
    if _text(source.get("id")) in context.visible_evidence_ids:
        score += 6
    mode = context.assistant_mode
    if mode in {"regulatory_readiness", "reg44_action_plan", "reg45_writer", "ofsted_evidence_pack"}:
        if source.get("regulation_links") or source.get("sccif_links") or source.get("linked_regulation"):
            score += 5
    if mode in {"safeguarding_review", "safeguarding_chronology"}:
        if "safeguarding" in haystack or "risk" in haystack:
            score += 5
    if mode == "handover":
        if "handover" in haystack or "action" in haystack or "overdue" in haystack:
            score += 4
    return score


def _sort_sources(message: str, sources: list[dict[str, Any]], context: SharedAssistantContext) -> list[dict[str, Any]]:
    return sorted(
        sources,
        key=lambda item: (
            _keyword_score(message, item, context),
            _text(item.get("date_time") or item.get("created_at") or item.get("updated_at")),
        ),
        reverse=True,
    )


def _source_ids(sources: list[dict[str, Any]]) -> list[dict[str, str]]:
    return [
        {
            "source_type": _text(item.get("source_type")),
            "source_id": _text(item.get("source_id") or item.get("id")),
        }
        for item in sources
        if _text(item.get("source_id") or item.get("id"))
    ]


class AssistantRetrievalService:
    """Retrieves RBAC-scoped OS records for both assistant surfaces."""

    def retrieve(
        self,
        conn: Any,
        *,
        message: str,
        context: SharedAssistantContext,
        current_user: dict[str, Any],
        limit: int = 18,
    ) -> AssistantRetrievalResult:
        _assert_scope_allowed(context, current_user)
        filters = _scope_filters(context)
        errors: list[str] = []
        sources: list[dict[str, Any]] = []
        actions: list[dict[str, Any]] = []
        evidence: list[dict[str, Any]] = []

        def guarded(label: str, fn):
            try:
                return fn()
            except HTTPException:
                raise
            except Exception as exc:
                errors.append(f"{label}: {exc}")
                return []

        chronology = guarded(
            "chronology",
            lambda: list_chronology(current_user=current_user, filters=filters, page=1, page_size=120)["items"],
        )
        actions = guarded("actions", lambda: list_actions(conn, current_user=current_user, filters=filters, limit=160))
        evidence = guarded("evidence", lambda: list_evidence(conn, current_user=current_user, filters=filters, limit=160))
        documents = guarded("documents", lambda: list_documents(conn, current_user=current_user, filters=filters, limit=120))
        reports = guarded("reports", lambda: list_reports(conn, current_user=current_user, filters=filters, limit=120))

        for source_type, collection in [
            ("chronology", chronology),
            ("action", actions),
            ("evidence", evidence),
            ("document", documents),
            ("report", reports),
        ]:
            sources.extend(_normalise_source(item, source_type) for item in collection)

        workspace_payload: dict[str, Any] | None = None
        if context.selected_young_person_id is not None:
            workspace_payload = guarded(
                "young_person_workspace",
                lambda: young_person_workspace(conn, young_person_id=int(context.selected_young_person_id or 0), current_user=current_user),
            )
        elif context.staff_profile and safe_int(context.staff_profile.get("id")) and context.current_workspace_type == "adult":
            workspace_payload = guarded(
                "adult_workspace",
                lambda: adult_workspace(conn, adult_id=int(context.staff_profile["id"]), current_user=current_user),
            )
        if isinstance(workspace_payload, dict):
            for key in ("chronology", "actions", "evidence", "documents", "reports", "records_authored"):
                for item in workspace_payload.get(key) or []:
                    sources.append(_normalise_source(item, key.rstrip("s") or "record"))

        workforce_terms = {"workforce", "staff", "supervision", "training", "probation", "recording quality", "inspection workforce"}
        route = _safe_lower(context.current_route)
        if context.current_workspace_type == "adult" or "staff" in route or any(term in _safe_lower(message) for term in workforce_terms):
            staff_id = None
            if context.staff_profile:
                staff_id = safe_int(context.staff_profile.get("selected_staff_id") or context.staff_profile.get("id"))
            workforce_context = guarded(
                "workforce_intelligence",
                lambda: WorkforceIntelligenceService().orb_context(conn, current_user=current_user, staff_id=staff_id),
            )
            if isinstance(workforce_context, dict):
                for item in workforce_context.get("evidence_sources") or []:
                    sources.append(_normalise_source(item, "workforce_evidence"))
                summary = workforce_context.get("workforce_summary")
                if isinstance(summary, dict):
                    sources.append(
                        _normalise_source(
                            {
                                "id": "workforce_intelligence_summary",
                                "title": "Workforce intelligence summary",
                                "summary": str(summary),
                                "source_type": "workforce_intelligence",
                                "regulation_links": ["reg_13_leadership_and_management"],
                                "sccif_links": ["leadership_and_management"],
                                "route": "/staff/command-centre",
                            },
                            "workforce_intelligence",
                        )
                    )

        governance_terms = {
            "governance",
            "Inspection evidence preparation",
            "inspection",
            "sccif",
            "reg 44",
            "reg44",
            "reg 45",
            "reg45",
            "provider oversight",
            "leadership",
            "evidence matrix",
            "quality standards",
            "ofsted",
        }
        governance_modes = {
            "regulatory_readiness",
            "reg44_action_plan",
            "reg45_writer",
            "ofsted_evidence_pack",
            "quality_review",
            "governance_review",
        }
        if (
            governance_feature_flags().get("orb_governance_retrieval", True)
            and (
                context.assistant_mode in governance_modes
                or "governance" in route
                or "ofsted" in route
                or any(term in _safe_lower(message) for term in governance_terms)
            )
        ):
            governance_centre = guarded(
                "governance_intelligence",
                lambda: GovernanceIntelligenceService().build_command_centre(conn, current_user=current_user, days=30, home_id=context.home_id),
            )
            if isinstance(governance_centre, dict):
                governance_context = governance_centre.get("orb_governance_summary") or {}
                for item in governance_context.get("evidence_sources") or []:
                    sources.append(_normalise_source(item, "governance_evidence"))
                summary = governance_context.get("governance_summary")
                if isinstance(summary, dict):
                    sources.append(
                        _normalise_source(
                            {
                                "id": "governance_intelligence_summary",
                                "title": "Governance intelligence summary",
                                "summary": str(summary),
                                "source_type": "governance_intelligence",
                                "regulation_links": ["reg_13", "reg_44", "reg_45"],
                                "sccif_links": ["sccif_effectiveness_of_leaders", "sccif_management_oversight"],
                                "route": "/governance/command-centre",
                            },
                            "governance_intelligence",
                        )
                    )

        ranked = _sort_sources(message, sources, context)
        selected = ranked[: max(1, min(limit, 40))]
        open_actions = [
            action
            for action in actions
            if _safe_lower(action.get("status")) not in {"completed", "done", "closed", "cancelled", "canceled"}
        ][:8]
        gaps: list[dict[str, Any]] = []
        if not evidence:
            gaps.append({"area": "evidence", "gap": "No evidence records were found in the permitted scope.", "severity": "review"})
        if not chronology:
            gaps.append({"area": "chronology", "gap": "No chronology entries were found in the permitted scope.", "severity": "review"})
        weak_evidence = [item for item in evidence if _safe_lower(item.get("quality")) in {"draft", "review_required", "weak", "gap"}]
        for item in weak_evidence[:5]:
            gaps.append(
                {
                    "area": item.get("linked_regulation") or item.get("evidence_type") or "evidence quality",
                    "gap": f"{item.get('title') or 'Evidence item'} needs quality/manager review.",
                    "source_id": item.get("id"),
                    "severity": "review",
                }
            )

        regulatory_links: list[dict[str, Any]] = []
        for source in selected:
            for link in source.get("regulation_links") or []:
                regulatory_links.append(link if isinstance(link, dict) else {"label": str(link), "type": "regulation"})
            for link in source.get("sccif_links") or []:
                regulatory_links.append({"label": str(link), "type": "sccif"})
            if source.get("linked_regulation"):
                regulatory_links.append({"label": str(source["linked_regulation"]), "type": "regulation"})
        try:
            coverage = build_coverage(evidence, actions)
            for area in coverage.get("areas", [])[:6]:
                regulatory_links.append({"type": "coverage", "label": area.get("label") or area.get("key"), "status": area.get("status")})
        except Exception:
            pass

        return AssistantRetrievalResult(
            sources=selected,
            related_records=_source_ids(selected),
            suggested_actions=[
                {
                    "id": action.get("id"),
                    "title": action.get("title"),
                    "priority": action.get("priority"),
                    "status": action.get("status"),
                    "route": f"/actions/{action.get('id')}",
                    "source_type": action.get("source_type"),
                    "source_id": action.get("source_id"),
                }
                for action in open_actions
            ],
            evidence_gaps=gaps,
            regulatory_links=regulatory_links[:12],
            retrieval_errors=errors,
        )
