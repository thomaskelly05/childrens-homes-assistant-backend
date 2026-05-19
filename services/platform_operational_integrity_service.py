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
            "full_platform_audit": self.full_platform_audit(),
            "integrity_matrix": {
                "pillars": list(PILLARS),
                "score_max": score_max,
                "rows": matrix,
                "needs_attention": [row["domain"] for row in weak_rows],
            },
            "platform_integrity_matrix_summary": self.platform_integrity_matrix_summary(matrix, score_max),
            "operational_migration_map": self.operational_migration_map(),
            "strategic_architecture_ownership_map": self.strategic_architecture_ownership_map(),
            "workflow_consistency": self.workflow_consistency(app=app),
            "workflow_standardisation_audit": self.workflow_standardisation_audit(),
            "chronology_propagation": chronology_engine.propagation_gap_summary(),
            "chronology_consolidation_summary": self.chronology_consolidation_summary(),
            "orb_consistency": self.orb_consistency(),
            "orb_consolidation_summary": self.orb_consolidation_summary(),
            "documents_templates": document_operational_engine.registry_summary(),
            "document_operationalisation_summary": self.document_operationalisation_summary(),
            "reporting_consistency": self.reporting_consistency(),
            "reporting_consolidation_summary": self.reporting_consolidation_summary(),
            "academy_operational_wiring": self.academy_operational_wiring(),
            "academy_migration_summary": self.academy_migration_summary(),
            "legacy_shell_rationalisation": self.legacy_shell_rationalisation(),
            "frontend_shell_consolidation_summary": self.frontend_shell_consolidation_summary(),
            "operational_graph_linkage": self.operational_graph_linkage(),
            "operational_event_consolidation_summary": self.operational_event_consolidation_summary(),
            "explainability_trust": orb_context_engine.explainability_contract(),
            "explainability_implementation_summary": self.explainability_implementation_summary(),
            "event_architecture": self.event_architecture(),
            "feature_flags": self.feature_flags(),
            "deprecated_pathway_registry": self.deprecated_pathway_registry(),
            "compatibility_only_registry": self.compatibility_only_registry(),
            "route_migration_summary": self.route_migration_summary(),
            "hidden_unfinished_areas": self.hidden_unfinished_areas(),
            "operational_risks": self.operational_risks(),
            "recommended_next_maturity_phase": self.recommended_next_maturity_phase(),
        }

    def full_platform_audit(self) -> dict[str, Any]:
        return {
            "domains": [contract.domain for contract in OPERATIONAL_DOMAIN_CONTRACTS],
            "routes": get_router_registry_summary(),
            "lifecycle_systems": [
                "YoungPersonDailyNotesService",
                "WorkforceJourneyService",
                "SafeguardingDomainService",
                "MissingEpisodeService",
                "operational_writeback_repository",
            ],
            "chronology_systems": [
                "ChronologyWriter",
                "ChronologyProjectionService",
                "chronology_engine",
                "operational_memory_replay_service",
            ],
            "orb_retrieval_systems": [
                "build_shared_assistant_context",
                "orb_context_engine",
                "orb_context_retrieval_service",
                "evidence_graph",
            ],
            "document_report_academy_systems": [
                "DocumentOperationalEngine",
                "DocumentTemplateService",
                "report_fact_service",
                "AcademyService",
                "AcademyIntelligenceService",
            ],
            "event_propagation_systems": [
                "operational_event_bus",
                "RealtimeEventBus",
                "RealtimeReplayService",
                "event_reconciliation_service",
            ],
        }

    def platform_integrity_matrix_summary(self, matrix: list[dict[str, Any]], score_max: int) -> dict[str, Any]:
        return {
            "validated_columns": ["Domain", "Workflow", "Chronology", "ORB", "Evidence", "Reports", "Alerts", "Dashboard", "Documents"],
            "domain_count": len(matrix),
            "score_max": score_max,
            "canonical_or_strong_domains": [
                row["domain"]
                for row in matrix
                if not any(row[pillar] in {"missing", "compatibility"} for pillar in PILLARS)
            ],
            "needs_attention": [row["domain"] for row in matrix if row["score"] < score_max],
        }

    def operational_migration_map(self) -> dict[str, Any]:
        return {
            "standardise_on": {
                "workflow": "services.operational_lifecycle_service + gold-standard daily note/supervision/reg references",
                "chronology": "ChronologyWriter + ChronologyProjectionService + services.intelligence.chronology_engine",
                "orb": "services.intelligence.orb_context_engine + shared assistant context",
                "events": "services.intelligence.event_bus.operational_event_bus",
                "documents": "services.intelligence.document_operational_engine",
                "linkage": "services.intelligence.operational_graph.linkage_engine",
            },
            "domain_migrations": [
                {
                    "domain": contract.domain,
                    "owner_os": contract.operating_system,
                    "primary_shell": contract.primary_shell,
                    "lifecycle_pattern": contract.lifecycle_pattern,
                    "canonical_services": list(contract.canonical_services),
                    "primary_routes": list(contract.primary_routes),
                    "compatibility_surfaces": list(contract.compatibility_surfaces),
                    "migration_state": contract.strategic_status,
                    "known_gaps": list(contract.known_gaps),
                }
                for contract in OPERATIONAL_DOMAIN_CONTRACTS
            ],
        }

    def strategic_architecture_ownership_map(self) -> dict[str, Any]:
        return {
            "Child Journey OS": ["children", "safeguarding"],
            "Workforce OS": ["workforce", "academy"],
            "Governance & Inspection OS": ["governance", "inspection", "reports", "provider_oversight"],
            "Unified Operational Frontend OS": ["chronology", "documents", "templates", "alerts", "actions_tasks", "realtime_events"],
            "ORB Operational Intelligence Layer": ["orb"],
            "ownership_rule": "Each domain keeps one strategic owner and may expose compatibility surfaces only through the registry.",
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

    def workflow_standardisation_audit(self) -> dict[str, Any]:
        return {
            "standard_lifecycle": ["create", "draft", "submit", "review", "approve_or_sign_off", "return", "archive"],
            "gold_standard_references": ["daily notes", "supervision", "governance/reg flows"],
            "domains_requiring_clone_of_gold_standard": [
                "reports",
                "documents",
                "academy",
                "actions_tasks",
                "inspection",
                "provider_oversight",
            ],
            "required_integrations": ["chronology", "evidence", "orb", "alerts", "reports", "audit_trails"],
        }

    def chronology_consolidation_summary(self) -> dict[str, Any]:
        return {
            "truth_plane": "ChronologyProjectionService",
            "write_standard": "ChronologyWriter",
            "contract_facade": "services.intelligence.chronology_engine",
            "standardised_events": [
                "governance actions",
                "Reg 44/45",
                "supervision",
                "training and academy completions",
                "document sign-offs",
                "ORB operational actions",
                "provider oversight",
                "alerts and workflow changes",
            ],
            "fragmented_reads_to_migrate": [
                "services.os_chronology_service",
                "backend.os_live_data_router chronology reads",
                "domain-specific timeline builders",
                "startup_live_chronology_fallback_patch",
            ],
        }

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

    def orb_consolidation_summary(self) -> dict[str, Any]:
        return {
            "single_contract": "OrbOperationalContract",
            "single_context_entrypoint": "services.intelligence.orb_context_engine.build_context",
            "required_retrieval": ["shared_assistant_context", "chronology_projection", "evidence_graph", "operational_memory_replay"],
            "required_output": [
                "evidence_references",
                "chronology_references",
                "linked_records",
                "operational_rationale",
                "confidence_visibility",
                "audit_safe_reasoning",
            ],
            "duplicate_routes_to_converge": [
                "young_people_assistant_routes.py",
                "assistant_routes.py",
                "assistant_os_routes.py delegated handlers",
                "assistant realtime proxy/voice prefix overlap",
            ],
        }

    def document_operationalisation_summary(self) -> dict[str, Any]:
        return {
            "contract": "DocumentOperationalContract",
            "engine": "services.intelligence.document_operational_engine",
            "lifecycle": ["create", "draft", "submit", "review", "approve_or_sign_off", "return", "archive"],
            "required_links": ["chronology", "evidence", "governance", "orb", "reports", "alerts"],
            "static_behaviour_to_replace": [
                "legacy document hub static navigation",
                "document_os_core monolith paths not emitting lifecycle history",
                "report/document export paths without sign-off memory",
            ],
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

    def reporting_consolidation_summary(self) -> dict[str, Any]:
        return {
            "target": "intelligence-aware operational reporting",
            "must_surface": ["chronology", "evidence", "risk", "operational_summaries", "orb_intelligence", "governance_insights", "trends", "linked_records"],
            "routes_to_standardise": ["reports_routes.py", "young_people_reports_routes.py", "ofsted_ai_report_routes.py", "backend/os_live_data_router.py report drafts"],
            "stub_replacement_target": "reports_routes.compat_router lifecycle endpoints",
        }

    def academy_operational_wiring(self) -> dict[str, Any]:
        academy = next(contract for contract in OPERATIONAL_DOMAIN_CONTRACTS if contract.domain == "academy")
        return {
            "status": academy.to_dict(),
            "backend_routes": "mounted_by_core_router_loader",
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

    def academy_migration_summary(self) -> dict[str, Any]:
        return {
            "api_status": "mounted",
            "strategic_owner": "Workforce OS",
            "strategic_shell_gap": "Academy remains legacy HTML until Next.js /staff/training-matrix and future academy pages own the experience.",
            "must_wire_into": ["workforce", "governance", "unified shell", "orb", "chronology", "evidence", "compliance"],
            "propagation_events": ["training_completed", "workbook_submitted", "workbook_reviewed", "competency_signed_off", "certification_expiring"],
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

    def frontend_shell_consolidation_summary(self) -> dict[str, Any]:
        return {
            "strategic_shell": "frontend-next AppShell",
            "navigation_contract": "frontend-next/lib/navigation/operational-navigation.ts",
            "legacy_shell_policy": "compatibility-only",
            "fixed_drift": [
                "desktop AppShell consumes the same operational navigation contract as mobile navigation",
                "child workspace pills consume childWorkspaceNavigation",
                "staff route literal drift includes /staff/me exclusion",
            ],
            "remaining_migration": ["legacy academy shell", "legacy OS command shell", "legacy young-people shell", "standalone assistant shells"],
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
                "actions",
                "alerts",
                "inspections",
            ],
        }

    def operational_event_consolidation_summary(self) -> dict[str, Any]:
        return {
            "standard": "OperationalEvent -> operational_event_bus.publish -> RealtimeEventBus",
            "do_not_create": "another realtime system",
            "standardised_targets": ["chronology", "dashboard", "alerts", "orb", "evidence", "reports"],
            "producers_to_migrate": [
                "direct realtime_event_bus.publish calls",
                "legacy browser indicare-event-bus.js",
                "workflow_automation alert derivation",
            ],
        }

    def explainability_implementation_summary(self) -> dict[str, Any]:
        return {
            "contract": "orb_context_engine.explainability_contract",
            "surfaces": ["ContextualOrbPanel", "source citations", "chronology previews", "evidence previews"],
            "required_fields": [
                "evidence_references",
                "chronology_references",
                "linked_records",
                "operational_rationale",
                "confidence_visibility",
                "audit_safe_reasoning",
            ],
        }

    def event_architecture(self) -> dict[str, Any]:
        return {
            "canonical_bus": "services.realtime_event_bus.RealtimeEventBus",
            "standard_facade": "services.intelligence.event_bus.operational_event_bus",
            "propagation_targets": ["chronology", "dashboard", "alerts", "orb", "evidence", "reports"],
            "rule": "All meaningful operational writes should publish through the facade after existing persistence succeeds.",
        }

    def deprecated_pathway_registry(self) -> list[dict[str, str]]:
        return [
            {"pathway": "/os/chronology", "owner": "chronology", "replacement": "/api/operational-memory/chronology", "status": "deprecated_read_path"},
            {"pathway": "backend/os_command_* routers", "owner": "frontend shell", "replacement": "frontend-next AppShell + /os live gateways", "status": "unmounted_deprecated_stack"},
            {"pathway": "services.os_chronology_service direct reads", "owner": "chronology", "replacement": "ChronologyProjectionService", "status": "deprecated_service_path"},
            {"pathway": "reports_routes compat lifecycle stubs", "owner": "reports", "replacement": "intelligence-aware report lifecycle", "status": "stubbed_deprecated_behaviour"},
            {"pathway": "legacy staff-os-nav fallback links", "owner": "frontend shell", "replacement": "operational-navigation.ts", "status": "deprecated_navigation_contract"},
        ]

    def compatibility_only_registry(self) -> list[dict[str, Any]]:
        return [
            {"surface": "frontend legacy HTML/JS", "examples": ["frontend/os-command-runtime.html", "frontend/young-people-shell.html", "frontend/academy.html"], "retirement_dependency": "Next.js parity for academy and remaining OS command paths"},
            {"surface": "young_people_*_compat_routes.py", "examples": ["missing episodes", "documents", "safeguarding", "remaining lifecycle"], "retirement_dependency": "canonical child route parity"},
            {"surface": "assistant_partner_api and chat_routes", "examples": ["/v1/assistant", "/chat"], "retirement_dependency": "external client migration"},
            {"surface": "home_inspection_compat_routes.py", "examples": ["inspection compatibility"], "retirement_dependency": "inspection OS route parity"},
        ]

    def route_migration_summary(self) -> dict[str, Any]:
        return {
            "routes_migrated_this_sprint": ["routers.academy_routes", "routers.academy_intelligence_routes"],
            "routes_standardised_by_contract": ["core.router_loader.ROUTER_GROUPS academy group"],
            "routes_remaining_compatibility_only": [
                "young_people_*_compat_routes.py",
                "assistant_partner_api.py",
                "chat_routes.py",
                "home_inspection_compat_routes.py",
            ],
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

