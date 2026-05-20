from __future__ import annotations

import importlib
import logging
from dataclasses import dataclass, field
from typing import Iterable

from fastapi import FastAPI

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RouterGroup:
    name: str
    routers: tuple[str, ...]
    classification: str = "canonical"
    notes: str = ""
    required_routers: tuple[str, ...] = ()


ROUTER_GROUPS: tuple[RouterGroup, ...] = (
    RouterGroup(
        "core",
        (
            "routers.auth_routes",
            "routers.mfa_routes",
            "routers.passkey_routes",
            "routers.session_security_routes",
            "routers.account_routes",
            "routers.admin_routes",
            "routers.profile_routes",
            "routers.billing_routes",
            "routers.legal_acceptance_routes",
            "routers.feature_flags_routes",
            "routers.frontend_compat",
        ),
        notes="Identity, session security, account state and platform admin.",
        required_routers=("routers.auth_routes",),
    ),
    RouterGroup(
        "assistant_orb",
        (
            "routers.ai_routes",
            "routers.assistant_routes",
            "routers.assistant_stream_routes",
            "routers.assistant_memory_routes",
            "routers.assistant_mode_routes",
            "routers.assistant_realtime_routes",
            "routers.assistant_realtime_compat_routes",
            "routers.assistant_upload_routes",
            "routers.assistant_legacy_redirect_routes",
            "routers.orb_routes",
            "routers.orb_voice_routes",
            "routers.orb_voice_session_routes",
            "routers.orb_voice_control_routes",
            "routers.orb_proactive_routes",
            "routers.orb_assistant_routes",
            "routers.voice_routes",
            "routers.voice_agent_routes",
            "routers.voice_session_routes",
            "routers.ai_memory_routes",
            "routers.ai_sccif_routes",
        ),
        classification="mixed",
        notes="Canonical ORB plus legacy assistant and realtime compatibility surfaces.",
    ),
    RouterGroup(
        "os_command",
        (
            "backend.os_command_routes",
            "routers.os_shell_api_routes",
            "routers.os_magic_notes_routes",
            "routers.os_command_api_routes",
            "routers.os_safeguarding_runtime_routes",
            "routers.os_provider_routes",
            "routers.os_workforce_routes",
            "routers.os_contextual_safeguarding_routes",
            "routers.os_placement_routes",
            "routers.os_inspection_routes",
            "routers.os_young_person_routes",
            "routers.os_operational_data_routes",
            "backend.os_production_diagnostics_router",
            "backend.os_enterprise_compat_router",
        ),
        notes="Operating system command surfaces and compatibility gateways.",
    ),
    RouterGroup(
        "governance",
        (
            "routers.governance_routes",
            "routers.governance_os_routes",
            "routers.governance_reg44_routes",
            "routers.governance_reg45_routes",
            "routers.inspection_os_routes",
            "routers.regulation_mapping_routes",
            "routers.sccif_routes",
            "routers.sccif_quality_routes",
            "routers.sccif_regulation_routes",
            "routers.quality_standards_routes",
            "routers.ofsted_readiness_routes",
        ),
        notes="Inspection readiness, governance and regulatory intelligence.",
    ),
    RouterGroup(
        "workforce",
        (
            "routers.workforce_routes",
            "routers.workforce_os_routes",
            "routers.workforce_journey_routes",
            "routers.staff_routes",
            "routers.staff_profile_routes",
            "routers.staff_today_routes",
            "routers.training_routes",
            "routers.supervision_lifecycle_routes",
            "routers.probation_routes",
            "routers.recruitment_routes",
            "routers.academy_routes",
            "routers.academy_intelligence_routes",
            "routers.academy_manager_routes",
            "routers.academy_manager_compliance_routes",
        ),
        classification="mixed",
        notes="Workforce OS, legacy staff routes and academy surfaces.",
    ),
    RouterGroup(
        "documents",
        (
            "routers.documents_routes",
            "routers.document_system_routes",
            "routers.document_instance_routes",
            "routers.document_editor_routes",
            "routers.document_export_routes",
            "routers.document_templates_routes",
            "routers.document_versions_routes",
            "routers.document_ai_routes",
            "routers.document_generation_routes",
            "routers.child_documents_routes",
            "routers.statutory_documents_routes",
            "routers.upload_routes",
            "routers.export_routes",
        ),
        classification="mixed",
        notes="Document stores, templates, exports and compatibility document surfaces.",
    ),
    RouterGroup(
        "reports",
        (
            "routers.daily_notes_routes",
            "routers.handover_routes",
            "routers.monthly_reviews_routes",
            "routers.ofsted_ai_report_routes",
            "routers.ofsted_pack_routes",
            "routers.reports_routes",
        ),
        notes="Handovers, monthly reviews, Ofsted packs and report generation.",
    ),
    RouterGroup(
        "safeguarding",
        (
            "routers.risk_routes",
            "routers.staff_journal_routes",
            "routers.supervision_routes",
            "routers.tasks_routes",
            "routers.actions_routes",
            "routers.visibility_routes",
            "routers.document_rules_routes",
            "routers.document_ai_review_routes",
            "routers.manager_routes",
            "routers.home_inspection_compat_routes",
            "routers.safeguarding_flowchart_routes",
            "routers.safeguarding_domain_routes",
            "routers.missing_episode_routes",
        ),
        classification="mixed",
        notes="Risk, actions, visibility, supervision, manager review and document governance.",
    ),
    RouterGroup(
        "chronology",
        (
            "routers.chronology_intelligence_routes",
            "routers.child_journey_routes",
            "routers.smart_search_routes",
            "routers.outcomes_routes",
            "routers.young_people_profile_routes",
            "routers.child_experience_intelligence_routes",
            "routers.young_people_daily_notes_routes",
            "routers.young_people_incidents_routes",
            "routers.young_people_health_routes",
            "routers.young_people_education_routes",
            "routers.young_people_family_routes",
            "routers.young_people_keywork_routes",
            "routers.young_people_plans_routes",
            "routers.young_people_risk_routes",
            "routers.young_people_chronology_routes",
            "routers.young_people_calendar_routes",
            "routers.young_people_appointments_routes",
            "routers.young_people_compliance_routes",
            "routers.young_people_standards_routes",
            "routers.young_people_handover_routes",
            "routers.young_people_reports_routes",
            "routers.young_people_photo_routes",
            "routers.young_people_statutory_documents_routes",
            "routers.young_people_missing_episodes_compat_routes",
            "routers.young_people_documents_compat_routes",
            "routers.young_people_safeguarding_compat_routes",
            "routers.young_people_remaining_lifecycle_compat_routes",
        ),
        notes="Young person records that feed chronology, reports and evidence retrieval.",
    ),
    RouterGroup(
        "compliance",
        (
            "routers.compliance_routes",
            "routers.workflow_review_routes",
            "routers.schema_live_routes",
            "routers.os_workflow_wiring_audit_routes",
            "backend.os_schema_audit_router",
            "backend.os_single_source_audit_router",
            "backend.os_live_data_router",
        ),
        notes="Compliance, workflow review, schema-live, OS source-of-truth/schema/workflow wiring audits and OS live data gateways.",
    ),
)

ROUTERS: list[str] = [router for group in ROUTER_GROUPS for router in group.routers]
REQUIRED_ROUTERS: frozenset[str] = frozenset(
    router for group in ROUTER_GROUPS for router in group.required_routers
)


@dataclass
class RouterLoadReport:
    loaded: list[str] = field(default_factory=list)
    failed: list[tuple[str, str]] = field(default_factory=list)
    duplicate_routes: list[str] = field(default_factory=list)
    compatibility_shadows: list[str] = field(default_factory=list)


def _route_key(route) -> str | None:
    path = getattr(route, "path", None)
    methods = getattr(route, "methods", None)
    if not path or not methods:
        return None
    return f"{','.join(sorted(methods))} {path}"


def _iter_routes(app: FastAPI) -> Iterable[str]:
    for route in app.routes:
        key = _route_key(route)
        if key:
            yield key


def include_routers(app: FastAPI) -> RouterLoadReport:
    report = RouterLoadReport()
    seen = set(_iter_routes(app))

    for router_path in ROUTERS:
        try:
            module = importlib.import_module(router_path)
            router = getattr(module, "router")
            before = set(_iter_routes(app))
            app.include_router(router)
            after = set(_iter_routes(app))
            duplicates = sorted(before.intersection(after - seen))
            if duplicates:
                report.duplicate_routes.extend(duplicates)
            seen = after
            report.loaded.append(router_path)
        except Exception as error:
            report.failed.append((router_path, str(error)))
            if router_path in REQUIRED_ROUTERS:
                raise
            logger.warning("Router %s failed to load: %s", router_path, error)

    logger.info(
        "Router startup loaded %s routers across %s domains (%s failed, %s conflicts)",
        len(report.loaded),
        len(ROUTER_GROUPS),
        len(report.failed),
        len(report.duplicate_routes),
    )
    return report
