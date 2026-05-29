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
            "routers.security_routes",
            "routers.debug_health_routes",
        ),
        notes="Identity, session security, account state and platform admin.",
        required_routers=(
            "routers.auth_routes",
            "routers.frontend_compat",
            "routers.security_routes",
        ),
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
            "routers.orb_standalone_routes",
            "routers.orb_residential_premium_routes",
            "routers.orb_agent_routes",
            "routers.orb_knowledge_routes",
            "routers.orb_document_routes",
            "routers.orb_evaluation_routes",
            "routers.orb_saved_output_routes",
            "routers.assistant_product_map_routes",
            "routers.orb_routes",
            "routers.orb_operational_routes",
            "routers.orb_operational_output_routes",
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
        notes="Standalone ORB Care Companion plus OS-linked ORB and legacy assistant/realtime compatibility surfaces.",
    ),
    RouterGroup(
        "os_command",
        (
            "backend.os_command_router",
            "backend.os_command_resilient_workspace_router",
            "backend.os_command_young_person_workspace_router",
            "backend.os_child_workspace_action_router",
            "backend.os_child_workspace_sources_router",
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
            "routers.os_scope_routes",
            "routers.home_selector_routes",
            "backend.os_production_diagnostics_router",
            "backend.os_enterprise_compat_router",
        ),
        notes="Operating system command surfaces, canonical child workspace, source map, action bridge and compatibility gateways.",
    ),
    RouterGroup(
        "governance",
        (
            "routers.governance_routes",
            "routers.governance_intelligence_routes",
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
            "routers.indicare_intelligence_routes",
            "routers.intelligence_action_routes",
            "routers.indicare_ai_governance_routes",
            "routers.ai_privacy_governance_routes",
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
            "routers.recording_draft_routes",
            "routers.recording_review_routes",
            "routers.recording_governance_routes",
            "routers.recording_alert_routes",
            "routers.recording_structured_template_routes",
        ),
        notes="Handovers, monthly reviews, Ofsted packs, recording drafts, alerts and manager review queue.",
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
            "routers.isn_routes",
            "routers.isn_notification_routes",
        ),
        classification="mixed",
        notes="Risk, contextual safeguarding, ISN intelligence, missing episodes and governance.",
    ),
    RouterGroup(
        "experience_bundles",
        (
            "routers.workspace_routes",
            "routers.child_workspace_context_routes",
            "routers.connect_routes",
            "routers.os_notification_routes",
            "routers.manager_daily_brief_routes",
            "routers.handover_intelligence_routes",
            "routers.workforce_context_routes",
            "routers.staff_profile_os_routes",
            "routers.sccif_alignment_routes",
            "routers.inspection_readiness_routes",
            "routers.reg45_quality_review_routes",
        ),
        notes="Schema-backed experience bundles for home, child profile and adult workspace surfaces.",
    ),
    RouterGroup(
        "chronology",
        (
            "routers.child_archive_routes",
            "routers.child_chronology_story_routes",
            "routers.plan_impact_routes",
            "routers.lifeecho_memory_routes",
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
        "compliance_and_live_os",
        (
            "routers.compliance_routes",
            "routers.workflow_review_routes",
            "routers.schema_live_routes",
            "routers.os_workflow_wiring_audit_routes",
            "routers.operational_feed_routes",
            "routers.care_hub_routes",
            "routers.realtime_operational_routes",
            "routers.realtime_replay_routes",
            "routers.platform_observability_routes",
            "backend.os_operational_event_bus_router",
            "backend.os_schema_audit_router",
            "backend.os_single_source_audit_router",
            "backend.os_security_convergence_router",
            "backend.os_live_data_router",
            "backend.os_live_validation_router",
        ),
        notes="Compliance, schema/source/security/workflow audits, live data gateways, validation and operational feed.",
    ),
    RouterGroup("auth", (), classification="primary", notes="Registry alias for canonical authentication surfaces."),
    RouterGroup("assistant", (), classification="legacy_compatibility", notes="Registry alias for legacy assistant surfaces; ORB is canonical."),
    RouterGroup("academy", (), classification="primary", notes="Registry alias for workforce academy routes."),
    RouterGroup("reporting", (), classification="primary", notes="Registry alias for report generation routes."),
    RouterGroup("operational-backend", (), classification="primary", notes="Registry alias used by OS source-of-truth audits."),
)

ROUTERS: list[str] = [router for group in ROUTER_GROUPS for router in group.routers]
REQUIRED_ROUTERS: frozenset[str] = frozenset(
    router for group in ROUTER_GROUPS for router in group.required_routers
)
_LAST_LOAD_REPORT: "RouterLoadReport | None" = None


@dataclass
class RouterLoadReport:
    loaded: list[str] = field(default_factory=list)
    failed: list[tuple[str, str]] = field(default_factory=list)
    skipped_optional: list[tuple[str, str]] = field(default_factory=list)
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


def _router_classification(router_path: str) -> str:
    if "compat" in router_path or "legacy" in router_path:
        return "legacy_compatibility"
    for group in ROUTER_GROUPS:
        if router_path in group.routers:
            return group.classification
    return "canonical"


def _is_missing_router_module(error: Exception, router_path: str) -> bool:
    return isinstance(error, ModuleNotFoundError) and getattr(error, "name", None) == router_path


def include_router(app: FastAPI, router_path: str) -> list[str]:
    module = importlib.import_module(router_path)
    mounted: list[str] = []
    for attr in ("router", "compat_router", "ui_router", "legacy_router"):
        router = getattr(module, attr, None)
        if router is None:
            continue
        app.include_router(router)
        mounted.append(attr)
    if not mounted:
        raise AttributeError(f"{router_path} does not expose a FastAPI router")
    return mounted


def get_router_registry_summary() -> dict:
    legacy_routers = [router_path for router_path in ROUTERS if _router_classification(router_path) == "legacy_compatibility"]
    return {
        "router_count": len(ROUTERS),
        "required_router_count": len(REQUIRED_ROUTERS),
        "legacy_compatibility_router_count": len(legacy_routers),
        "groups": [
            {
                "name": group.name,
                "classification": group.classification,
                "router_count": len(group.routers),
                "notes": group.notes,
            }
            for group in ROUTER_GROUPS
        ],
        "skipped_optional_router_count": len(_LAST_LOAD_REPORT.skipped_optional) if _LAST_LOAD_REPORT else 0,
    }


def get_failed_routers() -> list[dict[str, str]]:
    if _LAST_LOAD_REPORT is None:
        return []
    return [{"router": router, "error": error} for router, error in _LAST_LOAD_REPORT.failed]


def get_skipped_optional_routers() -> list[dict[str, str]]:
    if _LAST_LOAD_REPORT is None:
        return []
    return [{"router": router, "reason": reason} for router, reason in _LAST_LOAD_REPORT.skipped_optional]


def get_route_conflicts() -> list[dict]:
    if _LAST_LOAD_REPORT is None:
        return []
    conflicts = []
    for route in _LAST_LOAD_REPORT.duplicate_routes:
        method, _, path = route.partition(" ")
        conflicts.append({"method": method, "path": path, "classification": "accidental"})
    for route in _LAST_LOAD_REPORT.compatibility_shadows:
        method, _, path = route.partition(" ")
        conflicts.append({"method": method, "path": path, "classification": "legacy_compatibility"})
    return conflicts


def _split_route_conflicts(conflicts: list[dict]) -> tuple[list[dict], list[dict]]:
    accidental = [conflict for conflict in conflicts if conflict.get("classification") != "legacy_compatibility"]
    intentional = [conflict for conflict in conflicts if conflict.get("classification") == "legacy_compatibility"]
    return accidental, intentional


def get_accidental_route_conflicts() -> list[dict]:
    accidental, _intentional = _split_route_conflicts(get_route_conflicts())
    return accidental


def get_intentional_route_conflicts() -> list[dict]:
    _accidental, intentional = _split_route_conflicts(get_route_conflicts())
    return intentional


def include_routers(app: FastAPI) -> RouterLoadReport:
    global _LAST_LOAD_REPORT
    report = RouterLoadReport()
    seen = set(_iter_routes(app))

    for router_path in ROUTERS:
        try:
            before = set(_iter_routes(app))
            include_router(app, router_path)
            after = set(_iter_routes(app))
            duplicates = sorted((after - seen).intersection(before))
            if duplicates:
                if _router_classification(router_path) == "legacy_compatibility":
                    report.compatibility_shadows.extend(duplicates)
                else:
                    report.duplicate_routes.extend(duplicates)
            seen = after
            report.loaded.append(router_path)
        except Exception as error:
            if router_path in REQUIRED_ROUTERS:
                raise
            if _is_missing_router_module(error, router_path):
                report.skipped_optional.append((router_path, "module_not_present"))
                logger.debug("Optional router %s not present; treated as compatibility-only", router_path)
                continue
            report.failed.append((router_path, str(error)))
            logger.warning("Router %s failed to load: %s", router_path, error)

    if report.skipped_optional:
        logger.info(
            "Skipped %s optional compatibility router(s): %s",
            len(report.skipped_optional),
            ", ".join(router for router, _reason in report.skipped_optional),
        )

    _LAST_LOAD_REPORT = report
    return report
