from __future__ import annotations

import os
from collections import Counter
from datetime import datetime, timezone
from typing import Any

from assistant.inspection_readiness import build_inspection_readiness, serialise_inspection_readiness
from db.connection import db_connection
from assistant.reg45_builder import build_reg45_review_context, serialise_reg45_review_context
from repositories.os_repository_utils import quote_ident, safe_int, table_columns, table_exists
from services.manager_intelligence_service import ManagerIntelligenceService
from services.ofsted_evidence_engine_service import OfstedEvidenceEngineService
from services.provider_intelligence_service import ProviderIntelligenceService
from services.regulatory_ontology_service import regulatory_ontology_service
from services.workforce_intelligence_service import WorkforceIntelligenceService
from services.workspace_orchestrator_service import WorkspaceOrchestratorService


REG44_LIFECYCLE = ("scheduled", "in_progress", "completed", "reviewed", "actioned", "closed")
REG44_TRANSITIONS = {
    "scheduled": ("in_progress",),
    "in_progress": ("completed",),
    "completed": ("reviewed",),
    "reviewed": ("actioned",),
    "actioned": ("closed",),
    "closed": (),
}
RISK_LEVEL_SCORE = {"low": 10, "medium": 35, "high": 65, "critical": 90, "unknown": 25}


def governance_feature_flags() -> dict[str, bool]:
    return {
        "governance_os": os.getenv("GOVERNANCE_OS_ENABLED", "1") != "0",
        "governance_command_centre": os.getenv("GOVERNANCE_COMMAND_CENTRE_ENABLED", "1") != "0",
        "sccif_evidence_matrix": os.getenv("GOVERNANCE_EVIDENCE_MATRIX_ENABLED", "1") != "0",
        "reg44_workflow": os.getenv("GOVERNANCE_REG44_WORKFLOW_ENABLED", "1") != "0",
        "reg45_builder": os.getenv("GOVERNANCE_REG45_BUILDER_ENABLED", "1") != "0",
        "orb_governance_retrieval": os.getenv("ORB_GOVERNANCE_RETRIEVAL_ENABLED", "1") != "0",
        "predictive_inspection_readiness": os.getenv("GOVERNANCE_INSPECTION_FORECAST_ENABLED", "1") != "0",
    }


def validate_reg44_transition(current_status: str, next_status: str) -> bool:
    return next_status in REG44_TRANSITIONS.get(str(current_status or "scheduled"), ())


def score_governance_risk(signals: dict[str, Any]) -> dict[str, Any]:
    score = 0
    score += RISK_LEVEL_SCORE.get(str(signals.get("manager_risk") or "unknown").lower(), 25)
    score += min(20, int(signals.get("evidence_gap_count") or 0) * 4)
    score += min(18, int(signals.get("unresolved_action_count") or 0) * 3)
    score += min(15, int(signals.get("reg44_open_action_count") or 0) * 5)
    score += min(15, int(signals.get("child_instability_count") or 0) * 5)
    score += min(18, int(signals.get("safeguarding_signal_count") or 0) * 6)
    score += min(14, int(signals.get("workforce_alert_count") or 0) * 4)
    workforce_health = signals.get("workforce_health_score")
    if workforce_health is not None:
        score += max(0, min(20, int(workforce_health) // 5))
    score = max(0, min(100, score))
    if score >= 80:
        level = "critical"
    elif score >= 55:
        level = "high"
    elif score >= 30:
        level = "medium"
    else:
        level = "low"
    drivers = [
        key
        for key, value in signals.items()
        if key != "manager_risk" and isinstance(value, (int, float)) and value
    ]
    if signals.get("manager_risk") in {"high", "critical"}:
        drivers.insert(0, "manager_risk")
    return {"score": score, "level": level, "signals": signals, "drivers": drivers[:10]}


class GovernanceIntelligenceService:
    """Unified governance OS composed from existing intelligence services."""

    def __init__(self) -> None:
        self.workspace = WorkspaceOrchestratorService()
        self.evidence = OfstedEvidenceEngineService()
        self.manager = ManagerIntelligenceService()
        self.provider = ProviderIntelligenceService()
        self.workforce = WorkforceIntelligenceService()

    def audit_summary(self) -> dict[str, Any]:
        return {
            "ok": True,
            "principle": "Governance OS composes existing intelligence; it does not create parallel risk or dashboard logic.",
            "existing_systems_reused": [
                "WorkspaceOrchestratorService for chronology, actions, documents and manager oversight.",
                "OfstedEvidenceEngineService for inspection evidence cards and gaps.",
                "ManagerIntelligenceService for home-level risk and recommended actions.",
                "ProviderIntelligenceService for multi-home provider oversight.",
                "WorkforceIntelligenceService for Reg 13, workforce risk, relationships and ORB context.",
                "RegulatoryOntologyService for SCCIF, Quality Standards and Regulations traceability.",
                "assistant.inspection_readiness and assistant.reg45_builder for inspection and Reg 45 context.",
                "AssistantRetrievalService as the ORB/assistant evidence-linked retrieval boundary.",
            ],
            "consolidation_decisions": [
                "Governance risk is calculated once in score_governance_risk from existing manager, workforce, evidence and workflow signals.",
                "The governance command centre is backend-composed; frontend pages render returned intelligence only.",
                "SCCIF evidence matrix uses the existing regulatory ontology and evidence repository shape.",
                "Reg 45 generation is evidence-assisted context building, not final judgement generation.",
                "Reg 44 lifecycle is a workflow projection with evidence, actions and provider responses linked.",
                "ORB governance retrieval receives the same evidence source contract used by workforce ORB context.",
            ],
            "duplicate_logic_found": [
                "ManagerIntelligenceService and PredictiveRiskService both count operational risk signals.",
                "Next.js getCommandCentre and legacy os-command.html have separate command-centre aggregation.",
                "Client-side SCCIF and child voice heuristics overlap with backend evidence/gap services.",
                "ProviderIntelligenceService coexists with a static indicare_provider_intelligence demo module.",
                "workflow_review_routes currently uses static in-memory review data.",
            ],
            "hidden_unfinished_areas": [
                "Reg 44 persistence is migration-backed but existing legacy Reg 44 readers are not migrated into the lifecycle tables automatically.",
                "The command centre currently degrades gracefully when optional evidence tables are absent.",
                "Predictive readiness is a conservative risk forecast, not an Ofsted grade prediction.",
                "Legacy os-command.html is not removed; it should be bridged to this API before deprecation.",
            ],
            "feature_flags": governance_feature_flags(),
        }

    def build_command_centre(
        self,
        conn: Any | None = None,
        *,
        current_user: dict[str, Any],
        days: int = 30,
        home_id: int | None = None,
    ) -> dict[str, Any]:
        resolved_home_id = home_id or self._home_id(current_user)
        manager = self._safe(
            lambda: self.manager.build_dashboard(current_user=current_user, days=days, home_id=resolved_home_id),
            {"ok": False, "summary": {}, "risks": {}, "evidence_gaps": [], "recommended_actions": []},
        )
        workspace = self._safe(
            lambda: self.workspace.home_workspace(home_id=resolved_home_id, current_user=current_user, days=days) if resolved_home_id else {},
            {},
        )
        evidence = self._safe(lambda: self.evidence.build_home_evidence(workspace), {"cards": [], "gaps": [], "judgement_sections": {}})
        provider = self._safe(lambda: self.provider.build_dashboard(current_user=current_user, days=days), {"homes": [], "summary": {}})

        def _load_db_backed_sections(db_conn: Any) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
            workforce_command = self._safe(lambda: self.workforce.command_centre(db_conn, current_user=current_user), {})
            workforce_orb = self._safe(lambda: self.workforce.orb_context(db_conn, current_user=current_user), {})
            reg44 = self._safe(lambda: self.build_reg44_workflow(db_conn, current_user=current_user, home_id=resolved_home_id), {})
            return workforce_command, workforce_orb, reg44

        if conn is not None:
            workforce_command, workforce_orb, reg44 = _load_db_backed_sections(conn)
        else:
            with db_connection() as db_conn:
                workforce_command, workforce_orb, reg44 = _load_db_backed_sections(db_conn)

        evidence_index = self.evidence_index_from_payloads(
            workspace=workspace,
            evidence=evidence,
            workforce_context=workforce_orb,
        )
        matrix = self.build_evidence_matrix(evidence_index=evidence_index)
        reg45 = self.build_reg45_review(evidence_index=evidence_index)
        risk = self.build_governance_risk(
            manager_dashboard=manager,
            workforce_command=workforce_command,
            evidence_matrix=matrix,
            reg44_workflow=reg44,
        )
        forecast = self.build_inspection_forecast(risk=risk, evidence_matrix=matrix, reg45=reg45)
        actions = self._governance_actions(manager, risk, matrix, reg44, reg45)
        return {
            "ok": True,
            "generated_at": self._now(),
            "home_id": resolved_home_id,
            "days": days,
            "summary": {
                "inspection_readiness": forecast["readiness_level"],
                "governance_risk": risk["level"],
                "governance_score": risk["score"],
                "evidence_gaps": matrix["summary"]["gaps"],
                "unresolved_concerns": len(actions),
                "workforce_alerts": len(workforce_command.get("alerts") or []),
                "relational_stability": self._relational_stability(workforce_command),
            },
            "inspection_readiness": forecast,
            "governance_risk": risk,
            "workforce_health": workforce_command,
            "safeguarding_drift": self._safeguarding_drift(manager),
            "child_journey_health": self._child_journey_health(workspace),
            "governance_actions": actions,
            "unresolved_concerns": actions,
            "relational_stability": self._relational_stability(workforce_command),
            "evidence_matrix": matrix,
            "reg44": reg44,
            "reg45": reg45,
            "provider_oversight": provider,
            "orb_governance_summary": self.orb_context_from_payloads(risk=risk, matrix=matrix, reg44=reg44, reg45=reg45),
            "feature_flags": governance_feature_flags(),
        }

    def build_evidence_matrix(self, *, evidence_index: list[dict[str, Any]]) -> dict[str, Any]:
        nodes = regulatory_ontology_service.nodes()
        entries = []
        for node in nodes:
            matched = self._match_evidence_to_node(evidence_index, node.model_dump())
            gaps = self._node_gaps(node.model_dump(), matched)
            entries.append(
                {
                    "node_id": node.id,
                    "node_type": node.node_type,
                    "title": node.title,
                    "source_refs": node.source_refs,
                    "required_evidence": node.required_evidence,
                    "evidence_count": len(matched),
                    "coverage": "strong" if len(matched) >= 4 else "partial" if matched else "gap",
                    "evidence_sources": matched[:12],
                    "gaps": gaps,
                    "orb_summary": self._orb_line(node.title, matched, gaps),
                }
            )
        by_type = Counter(entry["node_type"] for entry in entries)
        gap_count = sum(1 for entry in entries if entry["coverage"] == "gap")
        return {
            "ok": True,
            "summary": {
                "nodes": len(entries),
                "sccif_areas": by_type.get("sccif_area", 0),
                "quality_standards": by_type.get("quality_standard", 0),
                "regulations": by_type.get("regulation", 0),
                "gaps": gap_count,
                "evidence_sources": len(evidence_index),
            },
            "entries": entries,
        }

    def build_governance_risk(
        self,
        *,
        manager_dashboard: dict[str, Any],
        workforce_command: dict[str, Any],
        evidence_matrix: dict[str, Any],
        reg44_workflow: dict[str, Any],
    ) -> dict[str, Any]:
        manager_summary = manager_dashboard.get("summary") or {}
        manager_risks = manager_dashboard.get("risks") or {}
        workforce_health = workforce_command.get("staffing_instability") or workforce_command.get("home_health") or {}
        signals = {
            "manager_risk": manager_summary.get("risk_status") or manager_risks.get("status") or "unknown",
            "evidence_gap_count": (evidence_matrix.get("summary") or {}).get("gaps", 0),
            "unresolved_action_count": manager_summary.get("open_actions", 0),
            "reg44_open_action_count": (reg44_workflow.get("summary") or {}).get("open_actions", 0),
            "child_instability_count": int(manager_risks.get("missing_count") or 0) + int(manager_risks.get("incident_count") or 0),
            "safeguarding_signal_count": manager_risks.get("safeguarding_count", 0),
            "workforce_alert_count": len(workforce_command.get("alerts") or []),
            "workforce_health_score": workforce_health.get("score") if isinstance(workforce_health, dict) else None,
        }
        scored = score_governance_risk(signals)
        scored["recommended_actions"] = self._risk_actions(scored)
        return scored

    def build_reg44_workflow(self, conn: Any, *, current_user: dict[str, Any], home_id: int | None = None) -> dict[str, Any]:
        rows = self._safe(lambda: self._reg44_rows(conn, current_user=current_user, home_id=home_id), [])
        visits = []
        for row in rows:
            status = str(row.get("status") or "scheduled")
            visits.append(
                {
                    "id": row.get("id"),
                    "home_id": row.get("home_id") or home_id,
                    "status": status if status in REG44_LIFECYCLE else "scheduled",
                    "scheduled_at": row.get("scheduled_at"),
                    "visitor_name": row.get("visitor_name"),
                    "evidence_links": row.get("evidence_links") or [],
                    "actions": row.get("actions") or [],
                    "provider_responses": row.get("provider_responses") or [],
                    "orb_summary": row.get("orb_summary") or "Reg 44 visit requires evidence, actions and provider response review.",
                    "available_transitions": list(REG44_TRANSITIONS.get(status, ())),
                }
            )
        if not visits:
            visits.append(
                {
                    "id": "draft-reg44-workflow",
                    "home_id": home_id,
                    "status": "scheduled",
                    "scheduled_at": None,
                    "visitor_name": None,
                    "evidence_links": [],
                    "actions": [{"title": "Schedule next Reg 44 visit and link evidence.", "status": "open", "priority": "medium"}],
                    "provider_responses": [],
                    "orb_summary": "No Reg 44 lifecycle row was found; create or migrate visit records before relying on this workflow.",
                    "available_transitions": ["in_progress"],
                }
            )
        open_actions = [
            action
            for visit in visits
            for action in (visit.get("actions") or [])
            if str(action.get("status") or "open").lower() not in {"closed", "completed", "done"}
        ]
        return {
            "ok": True,
            "lifecycle": list(REG44_LIFECYCLE),
            "visits": visits,
            "summary": {
                "visits": len(visits),
                "open_actions": len(open_actions),
                "latest_status": visits[0].get("status") if visits else "scheduled",
            },
        }

    def build_reg45_review(self, *, evidence_index: list[dict[str, Any]]) -> dict[str, Any]:
        context = build_reg45_review_context(evidence_index=evidence_index)
        payload = serialise_reg45_review_context(context)
        readiness = build_inspection_readiness(evidence_index=evidence_index)
        payload["inspection_readiness"] = serialise_inspection_readiness(readiness)
        payload["strengths"] = payload["inspection_readiness"].get("strengths", [])
        payload["weaknesses"] = payload["inspection_readiness"].get("vulnerabilities", [])
        payload["trends"] = (payload.get("patterns") or {}).get("findings", [])
        payload["action_plans"] = payload.get("action_prompts", [])
        payload["guardrails"] = [
            "Evidence-assisted Reg 45 context only.",
            "No final judgement is generated.",
            "Registered person review and sign-off remain required.",
        ]
        return payload

    def build_inspection_forecast(self, *, risk: dict[str, Any], evidence_matrix: dict[str, Any], reg45: dict[str, Any]) -> dict[str, Any]:
        gap_count = int((evidence_matrix.get("summary") or {}).get("gaps") or 0)
        risk_score = int(risk.get("score") or 0)
        reg45_gaps = len(reg45.get("evidence_gaps") or [])
        vulnerability_score = min(100, risk_score + min(20, gap_count) + min(15, reg45_gaps * 2))
        if vulnerability_score >= 80:
            level = "urgent_review"
        elif vulnerability_score >= 55:
            level = "vulnerable"
        elif vulnerability_score >= 30:
            level = "developing"
        else:
            level = "ready_for_manager_review"
        return {
            "readiness_level": level,
            "vulnerability_score": vulnerability_score,
            "likely_vulnerabilities": self._forecast_vulnerabilities(risk, evidence_matrix, reg45),
            "guardrail": "This is a readiness forecast for leadership review, not an Ofsted grade prediction.",
        }

    def orb_context_from_payloads(
        self,
        *,
        risk: dict[str, Any],
        matrix: dict[str, Any],
        reg44: dict[str, Any],
        reg45: dict[str, Any],
    ) -> dict[str, Any]:
        evidence_sources = []
        for entry in (matrix.get("entries") or [])[:20]:
            for source in entry.get("evidence_sources") or []:
                evidence_sources.append(
                    {
                        **source,
                        "title": source.get("title") or entry.get("title"),
                        "summary": source.get("summary") or entry.get("orb_summary"),
                        "regulation_links": source.get("regulation_links") or entry.get("source_refs"),
                        "sccif_links": source.get("sccif_links") or ([entry.get("node_id")] if entry.get("node_type") == "sccif_area" else []),
                        "route": source.get("route") or "/governance/command-centre",
                    }
                )
        return {
            "governance_summary": {
                "risk_level": risk.get("level"),
                "risk_score": risk.get("score"),
                "evidence_gaps": (matrix.get("summary") or {}).get("gaps", 0),
                "reg44_status": (reg44.get("summary") or {}).get("latest_status"),
                "reg45_warnings": reg45.get("warnings", []),
            },
            "evidence_sources": evidence_sources[:40],
            "assistant_prompts": [
                "What are our inspection readiness vulnerabilities and which evidence supports them?",
                "Which SCCIF areas have evidence gaps?",
                "Summarise governance risk with source references.",
                "What should leadership prioritise before the next Reg 44 or Reg 45 review?",
            ],
            "guardrails": [
                "Answer with visible evidence references only.",
                "Use review recommended language for gaps and vulnerabilities.",
                "Do not predict an Ofsted grade or make safeguarding decisions.",
            ],
        }

    def evidence_index_from_payloads(
        self,
        *,
        workspace: dict[str, Any] | None = None,
        evidence: dict[str, Any] | None = None,
        workforce_context: dict[str, Any] | None = None,
        records: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        output: list[dict[str, Any]] = []
        for item in records or []:
            output.append(self._normalise_evidence_item(item, "record"))
        workspace = workspace or {}
        for item in (workspace.get("child_journey_overview") or {}).get("recent_events") or []:
            output.append(self._normalise_evidence_item(item, item.get("record_type") or "chronology"))
        for item in workspace.get("documents") or []:
            output.append(self._normalise_evidence_item(item, "document"))
        for item in (workspace.get("manager_oversight") or {}).get("open_or_overdue_actions") or []:
            output.append(self._normalise_evidence_item(item, "task"))
        for item in (evidence or {}).get("cards") or []:
            output.append(self._normalise_evidence_item(item, "inspection_evidence"))
        for item in (workforce_context or {}).get("evidence_sources") or []:
            output.append(self._normalise_evidence_item(item, item.get("record_type") or item.get("source_type") or "workforce_evidence"))
        deduped: list[dict[str, Any]] = []
        seen: set[tuple[str, str]] = set()
        for item in output:
            key = (str(item.get("record_type")), str(item.get("record_id") or item.get("id")))
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)
        return deduped

    def _normalise_evidence_item(self, item: dict[str, Any], fallback_type: str) -> dict[str, Any]:
        record_type = str(item.get("record_type") or item.get("source_type") or item.get("type") or fallback_type)
        record_id = str(item.get("source_id") or item.get("record_id") or item.get("id") or record_type)
        title = str(item.get("title") or item.get("document_type") or record_type.replace("_", " ").title())
        summary = str(item.get("summary") or item.get("description") or item.get("statement") or item.get("impact") or "")
        return {
            **item,
            "id": item.get("id") or f"{record_type}:{record_id}",
            "record_id": record_id,
            "record_type": record_type,
            "citation_ref": item.get("citation_ref") or f"[{record_type}:{record_id}]",
            "title": title,
            "summary": summary,
            "excerpt": item.get("excerpt") or summary or title,
            "route": item.get("route") or item.get("source_url") or self._route_for_type(record_type, record_id),
            "regulation_links": item.get("regulation_links") or item.get("source_refs") or [],
            "sccif_links": item.get("sccif_links") or [],
        }

    def _match_evidence_to_node(self, evidence_index: list[dict[str, Any]], node: dict[str, Any]) -> list[dict[str, Any]]:
        linked_types = {str(item).lower() for item in node.get("linked_record_types") or []}
        node_id = str(node.get("id") or "").lower()
        node_terms = {
            node_id,
            node_id.replace("_", " "),
            str(node.get("title") or "").lower(),
            *[str(ref).lower() for ref in node.get("source_refs") or []],
        }
        matches = []
        for item in evidence_index:
            record_type = str(item.get("record_type") or "").lower()
            haystack = " ".join(
                str(value or "").lower()
                for value in [
                    item.get("title"),
                    item.get("summary"),
                    item.get("excerpt"),
                    " ".join(item.get("regulation_links") or []),
                    " ".join(item.get("sccif_links") or []),
                ]
            )
            if record_type in linked_types or any(term and term in haystack for term in node_terms):
                matches.append(item)
        return matches

    def _node_gaps(self, node: dict[str, Any], matched: list[dict[str, Any]]) -> list[dict[str, str]]:
        if matched:
            return []
        return [
            {
                "gap": f"No visible evidence source is linked to {node.get('title')}.",
                "severity": "review",
                "required_evidence": ", ".join((node.get("required_evidence") or [])[:3]),
            }
        ]

    def _orb_line(self, title: str, matched: list[dict[str, Any]], gaps: list[dict[str, Any]]) -> str:
        if matched:
            return f"{title}: {len(matched)} linked evidence source(s) available for ORB answers."
        if gaps:
            return f"{title}: evidence gap visible; ORB should recommend manager review and source linking."
        return f"{title}: no governance issue detected."

    def _reg44_rows(self, conn: Any, *, current_user: dict[str, Any], home_id: int | None) -> list[dict[str, Any]]:
        if conn is None or not table_exists(conn, "governance_reg44_visits"):
            return []
        cols = table_columns(conn, "governance_reg44_visits")
        select_cols = [
            col
            for col in ("id", "home_id", "status", "scheduled_at", "visitor_name", "evidence_links", "actions", "provider_responses", "orb_summary", "created_at")
            if col in cols
        ]
        if not select_cols:
            return []
        where = []
        params: list[Any] = []
        scoped_home_id = home_id or self._home_id(current_user)
        if scoped_home_id and "home_id" in cols:
            where.append("home_id = %s")
            params.append(scoped_home_id)
        where_sql = "WHERE " + " AND ".join(where) if where else ""
        order_col = "scheduled_at" if "scheduled_at" in cols else "id"
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT {', '.join(quote_ident(col) for col in select_cols)} FROM public.governance_reg44_visits {where_sql} ORDER BY {quote_ident(order_col)} DESC NULLS LAST LIMIT 20",
                tuple(params),
            )
            return [dict(row) for row in cur.fetchall() or []]

    def _governance_actions(self, manager: dict[str, Any], risk: dict[str, Any], matrix: dict[str, Any], reg44: dict[str, Any], reg45: dict[str, Any]) -> list[dict[str, Any]]:
        actions = []
        actions.extend(manager.get("recommended_actions") or [])
        actions.extend(risk.get("recommended_actions") or [])
        for entry in matrix.get("entries") or []:
            if entry.get("coverage") == "gap":
                actions.append({"priority": "medium", "action": f"Link evidence for {entry.get('title')}.", "route": "/governance/command-centre"})
        for visit in reg44.get("visits") or []:
            actions.extend(visit.get("actions") or [])
        actions.extend(reg45.get("action_plans") or [])
        deduped = []
        seen = set()
        for item in actions:
            text = str(item.get("action") or item.get("title") or item)
            if text.lower() in seen:
                continue
            seen.add(text.lower())
            deduped.append({**item, "action": text})
        return deduped[:20]

    def _risk_actions(self, risk: dict[str, Any]) -> list[dict[str, str]]:
        actions = []
        for driver in risk.get("drivers") or []:
            actions.append({"priority": risk.get("level", "review"), "action": f"Review governance risk driver: {str(driver).replace('_', ' ')}."})
        return actions or [{"priority": "monitor", "action": "Continue evidence sampling and governance review."}]

    def _forecast_vulnerabilities(self, risk: dict[str, Any], matrix: dict[str, Any], reg45: dict[str, Any]) -> list[dict[str, Any]]:
        vulnerabilities = []
        for driver in risk.get("drivers") or []:
            vulnerabilities.append({"theme": str(driver).replace("_", " "), "source": "governance_risk"})
        for entry in matrix.get("entries") or []:
            if entry.get("coverage") == "gap":
                vulnerabilities.append({"theme": entry.get("title"), "source": "evidence_matrix"})
        for gap in reg45.get("evidence_gaps") or []:
            vulnerabilities.append({"theme": gap, "source": "reg45"})
        return vulnerabilities[:12]

    def _safeguarding_drift(self, manager: dict[str, Any]) -> dict[str, Any]:
        risks = manager.get("risks") or {}
        return {
            "safeguarding_records": risks.get("safeguarding_count", 0),
            "missing_episodes": risks.get("missing_count", 0),
            "signals": [item for item in risks.get("signals") or [] if item.get("level") in {"high", "critical"}],
        }

    def _child_journey_health(self, workspace: dict[str, Any]) -> dict[str, Any]:
        overview = workspace.get("child_journey_overview") or {}
        counts = overview.get("counts") or {}
        return {
            "children_count": overview.get("children_count", 0),
            "recent_events": len(overview.get("recent_events") or []),
            "counts": counts,
            "instability_records": int(counts.get("incident", 0) or 0) + int(counts.get("missing_episode", 0) or 0),
        }

    def _relational_stability(self, workforce_command: dict[str, Any]) -> dict[str, Any]:
        instability = workforce_command.get("staffing_instability") or {}
        if isinstance(instability, dict) and instability:
            return instability
        return {"level": "not_returned", "summary": "Workforce relationship/stability data was not returned by the workforce command centre."}

    def _route_for_type(self, record_type: str, record_id: str) -> str:
        if "action" in record_type or record_type == "task":
            return f"/actions/{record_id}"
        if "document" in record_type:
            return f"/documents/{record_id}"
        if "evidence" in record_type:
            return f"/evidence/{record_id}"
        if "workforce" in record_type or "training" in record_type or "supervision" in record_type:
            return "/staff/command-centre"
        return "/chronology"

    def _home_id(self, current_user: dict[str, Any]) -> int | None:
        return safe_int(current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id"))

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _safe(self, fn, fallback):
        try:
            return fn()
        except Exception:
            return fallback


governance_intelligence_service = GovernanceIntelligenceService()
