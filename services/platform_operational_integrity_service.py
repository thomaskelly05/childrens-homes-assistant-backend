from __future__ import annotations

from typing import Any

from fastapi import FastAPI

from core.router_loader import get_router_registry_summary
from services.gold_standard_workflow_audit_service import audit_daily_note_gold_standard
from services.intelligence.chronology_engine import chronology_engine
from services.intelligence.contracts import OPERATIONAL_DOMAIN_CONTRACTS, PILLARS
from services.intelligence.document_operational_engine import document_operational_engine
from services.intelligence.orb_context_engine import orb_context_engine


class PlatformOperationalIntegrityService:
    """Enterprise integrity matrix for already-built platform systems."""

    def audit(self, *, app: FastAPI | None = None) -> dict[str, Any]:
        matrix = [contract.matrix_row() for contract in OPERATIONAL_DOMAIN_CONTRACTS]
        domains = {contract.domain: contract.to_dict() for contract in OPERATIONAL_DOMAIN_CONTRACTS}
        score_max = len(PILLARS) * 4
        weak_rows = [row for row in matrix if row["score"] < score_max]
        return {
            "ok": True,
            "audit_type": "platform_operational_integrity",
            "principle": "Reuse existing gold-standard patterns; do not create duplicate lifecycle, assistant or intelligence engines.",
            "operational_domains": domains,
            "integrity_matrix": {
                "pillars": list(PILLARS),
                "score_max": score_max,
                "rows": matrix,
                "needs_attention": [row["domain"] for row in weak_rows],
            },
            "workflow_consistency": self.workflow_consistency(app=app),
            "chronology_propagation": chronology_engine.propagation_gap_summary(),
            "orb_consistency": self.orb_consistency(),
            "documents_templates": document_operational_engine.registry_summary(),
            "reporting_consistency": self.reporting_consistency(),
            "academy_operational_wiring": self.academy_operational_wiring(),
            "legacy_shell_rationalisation": self.legacy_shell_rationalisation(),
            "operational_graph_linkage": self.operational_graph_linkage(),
            "explainability_trust": orb_context_engine.explainability_contract(),
            "event_architecture": self.event_architecture(),
            "feature_flags": self.feature_flags(),
            "hidden_unfinished_areas": self.hidden_unfinished_areas(),
            "operational_risks": self.operational_risks(),
            "recommended_next_maturity_phase": self.recommended_next_maturity_phase(),
        }

    def workflow_consistency(self, *, app: FastAPI | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "reference_workflows": {
                "daily_note": "Child workflow gold standard: create, draft, submit, approve, return, archive, chronology, OS sync.",
                "supervision": "Workforce workflow gold standard: draft, submit, review, return, archive, workforce sync.",
                "governance_reg": "Governance reference: Reg 44/45 evidence, review, action and closure pattern.",
            },
            "standard_lifecycle": ["create", "draft", "submit", "review", "approve_or_sign_off", "return", "archive"],
            "partial_implementations": [
                "reports",
                "documents",
                "academy",
                "actions_tasks",
                "governance",
                "inspection",
            ],
            "known_duplicate_patterns": [
                "legacy supervision routes and workforce journey supervision",
                "domain safeguarding/missing FSMs and young-people compatibility routes",
                "static workflow review routes and manager review queue",
            ],
        }
        if app is not None:
            payload["daily_note_gold_standard"] = audit_daily_note_gold_standard(app)
        return payload

    def orb_consistency(self) -> dict[str, Any]:
        return {
            "canonical_contract": orb_context_engine.domain_contract("orb").to_dict(),
            "standard_retrieval_sources": [
                "shared_assistant_context",
                "chronology_projection",
                "evidence_graph",
                "operational_memory_replay",
            ],
            "duplicate_surfaces": [
                "young_people_assistant_routes.py",
                "assistant_routes.py",
                "assistant_os_routes.py",
                "assistant realtime proxy/voice/indicare_ai realtime prefix overlap",
            ],
            "required_output_contract": orb_context_engine.explainability_contract(),
        }

    def reporting_consistency(self) -> dict[str, Any]:
        return {
            "target": "intelligence_aware_reporting",
            "must_source": ["chronology_projection", "evidence_graph", "operational_memory_replay"],
            "primary_routes": ["routers/reports_routes.py", "routers/young_people_reports_routes.py", "routers/ofsted_ai_report_routes.py"],
            "known_gaps": [
                "Some compat report lifecycle endpoints are unavailable stubs.",
                "Report drafts still have mixed direct chronology/evidence reads.",
                "Young person report bundle route coverage is not yet tested end to end.",
            ],
        }

    def academy_operational_wiring(self) -> dict[str, Any]:
        academy = next(contract for contract in OPERATIONAL_DOMAIN_CONTRACTS if contract.domain == "academy")
        return {
            "status": academy.to_dict(),
            "must_propagate": [
                "training completions",
                "workbook submissions",
                "manager reviews",
                "competency sign-offs",
                "certification expiry",
            ],
            "targets": list(academy.propagation_targets),
            "known_test_gap": "No academy pytest coverage exists for workbook lifecycle or workforce intelligence propagation.",
        }

    def legacy_shell_rationalisation(self) -> dict[str, Any]:
        router_registry = get_router_registry_summary()
        return {
            "strategic_shell": "frontend-next",
            "compatibility_shell": "frontend legacy HTML/JS served by FastAPI",
            "router_registry": router_registry,
            "deprecated_route_registry": [
                "/young-people-shell",
                "/os-dashboard",
                "/documents-hub",
                "/academy",
                "/assistant legacy HTML",
            ],
            "migration_strategy": [
                "Keep legacy routes as compatibility-only.",
                "Generate new operational links to Next.js canonical routes.",
                "Move academy to Next.js before retiring legacy academy shell.",
            ],
        }

    def operational_graph_linkage(self) -> dict[str, Any]:
        return {
            "strategy": "formal_entity_linkage_without_graph_database",
            "source_of_truth": ["operational_memory_replay", "evidence_graph", "chronology_projection"],
            "linked_entities": [
                "children",
                "workforce",
                "governance",
                "safeguarding",
                "incidents",
                "chronology",
                "documents",
                "reports",
                "orb",
                "evidence",
            ],
        }

    def event_architecture(self) -> dict[str, Any]:
        return {
            "canonical_bus": "services.realtime_event_bus.RealtimeEventBus",
            "standard_facade": "services.intelligence.event_bus.operational_event_bus",
            "propagation_targets": ["chronology", "dashboard", "alerts", "orb", "evidence", "reports"],
            "rule": "All meaningful operational writes should publish through the facade after existing persistence succeeds.",
        }

    def feature_flags(self) -> dict[str, Any]:
        return {
            "added": [],
            "existing_frontend_flags_to_use": [
                "unifiedOperationalShell",
                "unifiedCommandCentre",
                "unifiedOperationalSearch",
                "embeddedOrbPanel",
            ],
            "note": "No new feature flags were required; this sprint standardises contracts behind existing surfaces.",
        }

    def hidden_unfinished_areas(self) -> list[str]:
        return [
            "Academy is still legacy-shell only.",
            "Document sign-off is not consistently persisted into append-only memory for all document paths.",
            "Report compatibility lifecycle endpoints remain unavailable stubs.",
            "Multiple assistant and realtime assistant route families remain mounted.",
            "Multiple chronology read paths remain active while consumers migrate to projection.",
        ]

    def operational_risks(self) -> list[str]:
        return [
            "Route shadowing can cause ORB/realtime handlers to diverge by mount order.",
            "Runtime compatibility DDL in lifecycle compat routes can hide schema drift.",
            "Operational memory table absence degrades replay/projection silently in some environments.",
            "Legacy browser event bus does not reconcile with server-side replay.",
        ]

    def recommended_next_maturity_phase(self) -> dict[str, Any]:
        return {
            "phase": "consumer convergence",
            "work": [
                "Migrate reporting and assistant reads to chronology_projection and evidence_graph.",
                "Wire academy workbook/training events into workforce chronology and governance evidence.",
                "Replace duplicate assistant handlers with shared ORB context engine entrypoints.",
                "Add writeback integration tests for save -> memory -> chronology -> ORB/report retrieval.",
                "Move academy from legacy HTML to the Next.js operational shell.",
            ],
        }


platform_operational_integrity_service = PlatformOperationalIntegrityService()

