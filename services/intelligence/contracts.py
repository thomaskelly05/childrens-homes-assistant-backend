from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


PILLARS: tuple[str, ...] = (
    "workflow",
    "chronology",
    "orb",
    "evidence",
    "reports",
    "alerts",
    "dashboard",
    "documents",
)

STATUS_WEIGHT = {
    "canonical": 4,
    "strong": 3,
    "partial": 2,
    "compatibility": 1,
    "missing": 0,
}


@dataclass(frozen=True)
class OperationalDomainContract:
    domain: str
    operating_system: str
    primary_shell: str
    strategic_status: str
    workflow: str
    chronology: str
    orb: str
    evidence: str
    reports: str
    alerts: str
    dashboard: str
    documents: str
    canonical_services: tuple[str, ...]
    primary_routes: tuple[str, ...]
    compatibility_surfaces: tuple[str, ...] = ()
    lifecycle_pattern: str = ""
    propagation_targets: tuple[str, ...] = ()
    known_gaps: tuple[str, ...] = ()
    maturity_notes: str = ""

    def matrix_row(self) -> dict[str, Any]:
        row = {
            "domain": self.domain,
            "operating_system": self.operating_system,
            "primary_shell": self.primary_shell,
            "strategic_status": self.strategic_status,
        }
        row.update({pillar: getattr(self, pillar) for pillar in PILLARS})
        row["score"] = self.score()
        row["missing_capabilities"] = self.missing_capabilities()
        return row

    def score(self) -> int:
        return sum(STATUS_WEIGHT.get(getattr(self, pillar), 0) for pillar in PILLARS)

    def missing_capabilities(self) -> list[str]:
        return [pillar for pillar in PILLARS if getattr(self, pillar) in {"partial", "compatibility", "missing"}]

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["score"] = self.score()
        payload["missing_capabilities"] = self.missing_capabilities()
        return payload


OPERATIONAL_DOMAIN_CONTRACTS: tuple[OperationalDomainContract, ...] = (
    OperationalDomainContract(
        domain="children",
        operating_system="Child Journey OS",
        primary_shell="Next.js /young-people",
        strategic_status="primary",
        workflow="strong",
        chronology="strong",
        orb="strong",
        evidence="strong",
        reports="partial",
        alerts="strong",
        dashboard="strong",
        documents="strong",
        canonical_services=(
            "YoungPersonDailyNotesService",
            "YoungPeopleLinkingService",
            "ChildRecordSyncService",
            "ChronologyProjectionService",
        ),
        primary_routes=(
            "routers/young_people_daily_notes_routes.py",
            "routers/young_people_incidents_routes.py",
            "routers/young_people_chronology_routes.py",
            "routers/young_people_assistant_routes.py",
        ),
        compatibility_surfaces=(
            "routers/young_people_remaining_lifecycle_compat_routes.py",
            "frontend/young-people-shell.html",
        ),
        lifecycle_pattern="daily_note_gold_standard",
        propagation_targets=("chronology", "evidence", "orb", "reports", "alerts", "dashboard"),
        known_gaps=(
            "Health, education, family and document lifecycle actions are split across compatibility routes.",
            "Report assembly still reads mixed chronology/evidence sources.",
        ),
    ),
    OperationalDomainContract(
        domain="workforce",
        operating_system="Workforce OS",
        primary_shell="Next.js /staff",
        strategic_status="primary",
        workflow="strong",
        chronology="partial",
        orb="strong",
        evidence="strong",
        reports="partial",
        alerts="strong",
        dashboard="strong",
        documents="partial",
        canonical_services=("WorkforceJourneyService", "WorkforceIntelligenceService", "StaffLinkingService"),
        primary_routes=("routers/workforce_journey_routes.py", "routers/staff_evidence_routes.py"),
        compatibility_surfaces=("routers/supervision_routes.py", "frontend/supervision.html"),
        lifecycle_pattern="supervision_gold_standard",
        propagation_targets=("chronology", "evidence", "orb", "reports", "alerts", "dashboard"),
        known_gaps=(
            "Legacy supervision and workforce journey supervision coexist.",
            "Training status is compliance intelligence but is not consistently written to chronology.",
        ),
    ),
    OperationalDomainContract(
        domain="governance",
        operating_system="Governance & Inspection OS",
        primary_shell="Next.js /governance/command-centre",
        strategic_status="primary",
        workflow="partial",
        chronology="partial",
        orb="strong",
        evidence="strong",
        reports="strong",
        alerts="strong",
        dashboard="strong",
        documents="strong",
        canonical_services=("GovernanceIntelligenceService", "Reg44 lifecycle validators", "Manager review queue"),
        primary_routes=("routers/governance_intelligence_routes.py", "routers/workspace_review_routes.py"),
        compatibility_surfaces=("routers/workflow_review_routes.py",),
        lifecycle_pattern="governance_reg_reference",
        propagation_targets=("chronology", "evidence", "orb", "reports", "alerts", "dashboard"),
        known_gaps=(
            "Reg 44/45 intelligence is strong, but persisted lifecycle write paths are not unified.",
            "Static workflow review routes remain mounted for compatibility.",
        ),
    ),
    OperationalDomainContract(
        domain="inspection",
        operating_system="Governance & Inspection OS",
        primary_shell="Next.js /inspection-readiness",
        strategic_status="primary",
        workflow="partial",
        chronology="partial",
        orb="strong",
        evidence="canonical",
        reports="strong",
        alerts="partial",
        dashboard="strong",
        documents="strong",
        canonical_services=("InspectionOSService", "EvidenceGraphService", "ofsted_evidence_engine_service"),
        primary_routes=("routers/inspection_os_routes.py", "routers/inspection_readiness_routes.py", "routers/ofsted_pack_routes.py"),
        compatibility_surfaces=("routers/home_inspection_compat_routes.py",),
        lifecycle_pattern="inspection_readiness_projection",
        propagation_targets=("evidence", "orb", "reports", "dashboard"),
        known_gaps=("Inspection is mostly read/projection oriented; improvement action lifecycle is not fully standardised.",),
    ),
    OperationalDomainContract(
        domain="safeguarding",
        operating_system="Child Journey OS",
        primary_shell="Next.js /safeguarding",
        strategic_status="primary",
        workflow="strong",
        chronology="strong",
        orb="strong",
        evidence="strong",
        reports="partial",
        alerts="strong",
        dashboard="strong",
        documents="strong",
        canonical_services=("SafeguardingDomainService", "MissingEpisodeService", "OperationalMemoryRepository"),
        primary_routes=("routers/safeguarding_domain_routes.py", "routers/missing_episode_routes.py"),
        compatibility_surfaces=(
            "routers/young_people_safeguarding_compat_routes.py",
            "routers/young_people_missing_episodes_compat_routes.py",
        ),
        lifecycle_pattern="domain_fsm_with_gold_standard_compat",
        propagation_targets=("chronology", "evidence", "orb", "reports", "alerts", "dashboard"),
        known_gaps=(
            "Domain FSMs and child shell compatibility routes use different status vocabularies.",
            "Safeguarding flag route writes chronology directly without full lifecycle memory.",
        ),
    ),
    OperationalDomainContract(
        domain="chronology",
        operating_system="Unified Operational Frontend OS",
        primary_shell="Next.js /chronology",
        strategic_status="truth_plane",
        workflow="canonical",
        chronology="canonical",
        orb="strong",
        evidence="strong",
        reports="strong",
        alerts="partial",
        dashboard="strong",
        documents="partial",
        canonical_services=("ChronologyWriter", "ChronologyProjectionService", "OperationalMemoryReplayService"),
        primary_routes=("routers/operational_memory_routes.py", "routers/young_people_chronology_routes.py"),
        compatibility_surfaces=("routers/frontend_compat.py", "services/os_chronology_service.py"),
        lifecycle_pattern="append_only_projection",
        propagation_targets=("orb", "evidence", "reports", "dashboard"),
        known_gaps=("Multiple read paths remain: /os/chronology, /api/chronology and /api/operational-memory/chronology.",),
    ),
    OperationalDomainContract(
        domain="documents",
        operating_system="Unified Operational Frontend OS",
        primary_shell="Next.js /documents",
        strategic_status="primary",
        workflow="partial",
        chronology="partial",
        orb="strong",
        evidence="strong",
        reports="strong",
        alerts="partial",
        dashboard="partial",
        documents="canonical",
        canonical_services=("DocumentTemplateService", "document_intelligence_service", "DocumentSignoffService"),
        primary_routes=("routers/document_engine_routes.py", "routers/document_template_routes.py", "routers/document_signoff_routes.py"),
        compatibility_surfaces=("routers/documents_routes.py", "services/document_os_core.py"),
        lifecycle_pattern="document_operational_entity",
        propagation_targets=("chronology", "evidence", "orb", "reports", "alerts", "dashboard"),
        known_gaps=(
            "Modular document engine and document_os_core monolith coexist.",
            "Document sign-off is not consistently persisted as lifecycle history for every document source.",
        ),
    ),
    OperationalDomainContract(
        domain="templates",
        operating_system="Unified Operational Frontend OS",
        primary_shell="Next.js /templates",
        strategic_status="primary",
        workflow="strong",
        chronology="strong",
        orb="strong",
        evidence="strong",
        reports="strong",
        alerts="missing",
        dashboard="partial",
        documents="strong",
        canonical_services=("DocumentTemplateService",),
        primary_routes=("routers/document_template_routes.py",),
        compatibility_surfaces=("frontend/documents-hub.html",),
        lifecycle_pattern="template_registry_contract",
        propagation_targets=("documents", "evidence", "reports", "orb"),
        known_gaps=("Template alerts for review expiry are contract-level only, not a unified event source.",),
    ),
    OperationalDomainContract(
        domain="academy",
        operating_system="Workforce OS",
        primary_shell="Legacy /academy compatibility surface",
        strategic_status="compatibility",
        workflow="strong",
        chronology="missing",
        orb="partial",
        evidence="partial",
        reports="partial",
        alerts="partial",
        dashboard="partial",
        documents="partial",
        canonical_services=("AcademyService", "AcademyWorkbookService"),
        primary_routes=("routers/academy_routes.py", "routers/academy_intelligence_routes.py"),
        compatibility_surfaces=("frontend/academy.html", "frontend/js/features/training-centre.js"),
        lifecycle_pattern="academy_workbook_review",
        propagation_targets=("workforce", "chronology", "governance", "inspection", "orb", "evidence"),
        known_gaps=(
            "Academy has no Next.js primary route.",
            "Training completion and certification expiry are not consistently propagated into chronology or governance evidence.",
        ),
    ),
    OperationalDomainContract(
        domain="reports",
        operating_system="Governance & Inspection OS",
        primary_shell="Next.js /reports",
        strategic_status="primary",
        workflow="partial",
        chronology="partial",
        orb="strong",
        evidence="partial",
        reports="strong",
        alerts="partial",
        dashboard="partial",
        documents="strong",
        canonical_services=("report_fact_service", "report_scheduler", "repositories.reports_repository"),
        primary_routes=("routers/reports_routes.py", "routers/young_people_reports_routes.py", "routers/ofsted_ai_report_routes.py"),
        compatibility_surfaces=("routers/reports_routes.py compat_router",),
        lifecycle_pattern="intelligence_aware_reporting",
        propagation_targets=("chronology", "evidence", "orb", "governance", "inspection"),
        known_gaps=("Some report lifecycle endpoints are compatibility stubs and return available=false.",),
    ),
    OperationalDomainContract(
        domain="orb",
        operating_system="ORB Operational Intelligence Layer",
        primary_shell="Next.js embedded ORB + /assistant",
        strategic_status="primary",
        workflow="strong",
        chronology="strong",
        orb="canonical",
        evidence="strong",
        reports="strong",
        alerts="strong",
        dashboard="strong",
        documents="strong",
        canonical_services=("build_shared_assistant_context", "orb_context_retrieval_service", "orb_websocket_gateway"),
        primary_routes=("routers/orb_routes.py", "routers/assistant_os_routes.py"),
        compatibility_surfaces=("routers/assistant_realtime_proxy_routes.py", "routers/indicare_ai_realtime_routes.py"),
        lifecycle_pattern="assistant_as_copilot_not_authority",
        propagation_targets=("chronology", "evidence", "reports", "alerts", "dashboard"),
        known_gaps=(
            "Assistant routes duplicate young-person/home/quality handlers.",
            "Multiple realtime assistant routers share the /assistant/realtime prefix.",
        ),
    ),
    OperationalDomainContract(
        domain="alerts",
        operating_system="Unified Operational Frontend OS",
        primary_shell="Next.js right rail + notifications",
        strategic_status="primary",
        workflow="partial",
        chronology="partial",
        orb="strong",
        evidence="partial",
        reports="partial",
        alerts="strong",
        dashboard="strong",
        documents="partial",
        canonical_services=("LiveAlertsService", "RealtimeAlertsService", "RealtimeEventBus"),
        primary_routes=("routers/live_alerts_routes.py", "routers/realtime_alerts_routes.py", "routers/notifications_routes.py"),
        compatibility_surfaces=("services/workflow_automation.py",),
        lifecycle_pattern="home_scoped_alert_stream",
        propagation_targets=("dashboard", "orb", "notifications", "tasks"),
        known_gaps=("Live alerts and realtime alerts both expose /alerts routes with different backing services.",),
    ),
    OperationalDomainContract(
        domain="actions_tasks",
        operating_system="Unified Operational Frontend OS",
        primary_shell="Next.js /actions and right rail",
        strategic_status="primary",
        workflow="partial",
        chronology="partial",
        orb="strong",
        evidence="partial",
        reports="partial",
        alerts="strong",
        dashboard="strong",
        documents="partial",
        canonical_services=("tasks_routes", "OperationalActionEngine", "workflow_automation"),
        primary_routes=("routers/tasks_routes.py", "routers/actions_routes.py"),
        compatibility_surfaces=("services/task_engine.py",),
        lifecycle_pattern="task_action_bridge",
        propagation_targets=("chronology", "alerts", "dashboard", "orb"),
        known_gaps=("Persisted tasks and derived operational actions are separate concepts.",),
    ),
    OperationalDomainContract(
        domain="provider_oversight",
        operating_system="Governance & Inspection OS",
        primary_shell="Provider oversight APIs and command centre",
        strategic_status="primary",
        workflow="partial",
        chronology="partial",
        orb="strong",
        evidence="strong",
        reports="strong",
        alerts="strong",
        dashboard="strong",
        documents="strong",
        canonical_services=("ProviderOperationalQueueService", "ProviderOversightService"),
        primary_routes=("routers/provider_oversight_routes.py", "routers/provider_intelligence_routes.py"),
        compatibility_surfaces=(),
        lifecycle_pattern="replay_derived_provider_queue",
        propagation_targets=("governance", "inspection", "risk", "dashboard", "orb"),
        known_gaps=("Replay-derived queues and static category overview use different source semantics.",),
    ),
    OperationalDomainContract(
        domain="realtime_events",
        operating_system="Unified Operational Frontend OS",
        primary_shell="ORB websocket/replay",
        strategic_status="foundation",
        workflow="canonical",
        chronology="strong",
        orb="canonical",
        evidence="strong",
        reports="partial",
        alerts="strong",
        dashboard="strong",
        documents="partial",
        canonical_services=("RealtimeEventBus", "RealtimeReplayService", "event_reconciliation_service"),
        primary_routes=("routers/realtime_replay_routes.py", "routers/orb_routes.py"),
        compatibility_surfaces=("frontend/js/indicare-workspace/indicare-event-bus.js",),
        lifecycle_pattern="home_scoped_event_bus",
        propagation_targets=("chronology", "dashboard", "alerts", "orb", "evidence"),
        known_gaps=("Legacy browser event bus is disconnected from server replay.",),
    ),
)


def get_domain_contract(domain: str) -> OperationalDomainContract | None:
    normalised = domain.strip().lower().replace("-", "_")
    for contract in OPERATIONAL_DOMAIN_CONTRACTS:
        if contract.domain == normalised:
            return contract
    return None

