import importlib
import logging
from dataclasses import dataclass, field

from fastapi import FastAPI

logger = logging.getLogger(__name__)

EXTRA_ROUTER_ATTRS = ("compat_router", "ui_router")


@dataclass(frozen=True)
class RouterGroup:
    """A domain registry that keeps public paths unchanged while making startup reviewable."""

    name: str
    routers: tuple[str, ...]
    required_routers: tuple[str, ...] = ()
    classification: str = "optional"
    notes: str = ""


ROUTER_GROUPS: tuple[RouterGroup, ...] = (
    RouterGroup(
        "auth",
        (
            "routers.auth_routes",
            "routers.mfa_routes",
            "routers.passkey_routes",
            "routers.session_security_routes",
            "routers.legal_acceptance_routes",
            "routers.debug_health_routes",
            "routers.security_routes",
        ),
        required_routers=(
            "routers.auth_routes",
            "routers.mfa_routes",
            "routers.session_security_routes",
            "routers.debug_health_routes",
            "routers.security_routes",
        ),
        classification="required",
        notes="Authentication, MFA, session safety, health and security surfaces.",
    ),
    RouterGroup(
        "operational",
        (
            "routers.notifications_routes",
            "routers.shift_routes",
            "routers.frontend_compat",
            "routers.young_people_shell_item_compat_routes",
            "routers.young_people_safe_routes",
            "routers.home_selector_routes",
            "homes.routes",
            "staff.routes",
        ),
        required_routers=("routers.frontend_compat",),
        classification="mixed",
        notes="Core shell compatibility, homes, staff and shift operations.",
    ),
    RouterGroup(
        "provider",
        (
            "routers.account_routes",
            "routers.admin_routes",
            "routers.founder_ai_routes",
            "routers.admin_user_routes",
            "routers.billing_routes",
            "routers.indicare_mail_routes",
        ),
        notes="Account, admin, billing and provider administration.",
    ),
    RouterGroup(
        "assistant",
        (
            "routers.ai_notes_routes",
            "routers.ai_note_templates_routes",
            "routers.ai_note_export_routes",
            "routers.assistant_general_routes",
            "routers.assistant_conversation_routes",
            "routers.assistant_realtime_voice_routes",
            "routers.assistant_realtime_proxy_routes",
            "routers.orb_routes",
            "routers.assistant_general_safe_routes",
            "routers.assistant_web_routes",
            "routers.assistant_query_routes",
            "routers.indicare_ai_orchestrator_routes",
            "routers.indicare_ai_memory_routes",
            "routers.standalone_assistant_library_routes",
            "routers.standalone_intelligence_routes",
            "routers.standalone_enterprise_intelligence_routes",
            "routers.standalone_timeline_routes",
            "routers.standalone_tier_routes",
            "routers.standalone_workflow_routes",
            "routers.standalone_search_routes",
            "routers.assistant_os_routes",
            "routers.assistant_os_knowledge_routes",
            "routers.assistant_intelligence_routes",
            "routers.manager_intelligence_routes",
            "routers.proactive_intelligence_routes",
            "routers.provider_intelligence_routes",
            "routers.predictive_risk_routes",
            "routers.realtime_alerts_routes",
        ),
        notes="Standalone assistant, embedded OS assistant, Orb and AI suite routes.",
    ),
    RouterGroup(
        "children",
        (
            "routers.workspace_records_routes",
            "routers.child_workspace_context_routes",
            "routers.child_documents_routes",
            "routers.operational_memory_routes",
            "routers.operational_health_routes",
            "routers.young_people_assistant_routes",
        ),
        notes="Child workspace context, child documents, operational memory and health.",
    ),
    RouterGroup(
        "inspection",
        (
            "routers.operational_intelligence_routes",
            "routers.inspection_os_routes",
            "routers.inspection_readiness_routes",
            "routers.rm_dashboard_routes",
            "routers.live_alerts_routes",
            "routers.os_modules_routes",
            "routers.os_shell_api_routes",
        ),
        notes="Inspection readiness, shell APIs, OS modules and live alerts.",
    ),
    RouterGroup(
        "assistant-compatibility",
        (
            "routers.assistant_partner_api",
            "routers.chat_routes",
        ),
        classification="legacy_compatibility",
        notes="Partner and chat compatibility routes that remain mounted for existing clients.",
    ),
    RouterGroup(
        "documents",
        (
            "routers.document_library_routes",
            "routers.document_engine_routes",
            "routers.dashboard_routes",
            "routers.documents_routes",
        ),
        notes="Document library, document engine and document helper endpoints.",
    ),
    RouterGroup(
        "reporting",
        (
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
            "routers.document_ai_routes",
            "routers.manager_routes",
            "routers.home_inspection_compat_routes",
        ),
        classification="mixed",
        notes="Risk, actions, visibility, supervision, manager review and document governance.",
    ),
    RouterGroup(
        "chronology",
        (
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
        ),
        notes="Young person records that feed chronology, reports and evidence retrieval.",
    ),
    RouterGroup(
        "compliance",
        (
            "routers.workflow_review_routes",
            "routers.command_centre_routes",
            "routers.events_routes",
            "routers.evidence_routes",
            "routers.qa_routes",
            "routers.exports_routes",
            "routers.rostering_routes",
            "routers.academy_routes",
            "routers.academy_intelligence_routes",
        ),
        notes="Workflow review, command centre, evidence, exports, QA, rostering and academy.",
    ),
    RouterGroup(
        "staff",
        (
            "routers.staff_profile_routes",
            "routers.staff_today_routes",
            "routers.workspace_routes",
            "routers.workspace_review_routes",
            "routers.workspace_ofsted_evidence_routes",
        ),
        notes="Staff profiles, staff today and workspace review surfaces.",
    ),
    RouterGroup(
        "operational-backend",
        (
            "backend.os_runtime_compat_router",
            "backend.os_schema_audit_router",
            "backend.os_record_viewer_router",
            "backend.universal_records_router",
            "backend.universal_record_edit_router",
            "backend.therapeutic_recording_intelligence_router",
            "backend.universal_document_intelligence_router",
            "backend.indicare_connect_router",
            "backend.indicare_connect_calendar_router",
            "backend.indicare_connect_join_router",
            "backend.indicare_connect_realtime_router",
            "backend.indicare_connect_groups_router",
            "backend.os_assistant_bridge_router",
            "backend.reg44_report_reader_router",
            "backend.reg44_document_ingestion_router",
            "backend.reg44_trend_engine_router",
            "backend.os_live_data_router",
            "backend.os_command_router",
            "backend.os_command_shift_router",
            "backend.os_command_risk_router",
            "backend.os_command_inspection_router",
            "backend.os_command_patterns_router",
            "backend.os_command_chronology_intelligence_router",
            "backend.os_command_manager_review_router",
            "backend.os_command_wellbeing_router",
            "backend.os_provider_command_router",
            "backend.os_command_network_router",
            "backend.os_command_care_recording_router",
            "backend.os_command_young_person_workspace_router",
            "backend.os_production_diagnostics_router",
            "backend.os_enterprise_compat_router",
        ),
        classification="legacy_compatibility",
        notes="OS live data, command routers, Connect, Reg 44 ingestion and compatibility adapters.",
    ),
)

ROUTERS = [route for group in ROUTER_GROUPS for route in group.routers]

REQUIRED_ROUTERS = {
    route
    for group in ROUTER_GROUPS
    for route in group.required_routers
}

LEGACY_COMPATIBILITY_ROUTERS = {
    route
    for group in ROUTER_GROUPS
    if group.classification == "legacy_compatibility"
    for route in group.routers
}

ROUTER_DOMAIN_BY_MODULE = {
    route: group.name
    for group in ROUTER_GROUPS
    for route in group.routers
}

FAILED_ROUTERS: list[dict[str, str]] = []
ROUTER_LOAD_EVENTS: list[dict[str, object]] = []
ROUTE_CONFLICTS: list[dict[str, object]] = []


def include_router(app: FastAPI, module_path: str) -> list[str]:
    module = importlib.import_module(module_path)
    router = getattr(module, "router", None)
    if router is None:
        raise RuntimeError(f"No router found in {module_path}")
    app.include_router(router)
    mounted = ["router"]
    for attr in EXTRA_ROUTER_ATTRS:
        extra_router = getattr(module, attr, None)
        if extra_router is not None and extra_router is not router:
            app.include_router(extra_router)
            mounted.append(attr)
    return mounted


def _detect_route_conflicts(app: FastAPI) -> list[dict[str, object]]:
    seen: dict[tuple[str, str], str] = {}
    conflicts: list[dict[str, object]] = []
    for route in app.routes:
        path = getattr(route, "path", None)
        methods = getattr(route, "methods", None)
        name = getattr(route, "name", None) or repr(route)
        if not path or not methods:
            continue
        for method in sorted(methods):
            signature = (method, path)
            if signature in seen:
                conflicts.append(
                    {
                        "method": method,
                        "path": path,
                        "first": seen[signature],
                        "duplicate": name,
                    }
                )
            else:
                seen[signature] = name
    return conflicts


def include_routers(app: FastAPI, routers: list[str] | None = None) -> None:
    FAILED_ROUTERS.clear()
    ROUTER_LOAD_EVENTS.clear()
    ROUTE_CONFLICTS.clear()
    for route in routers or ROUTERS:
        domain = ROUTER_DOMAIN_BY_MODULE.get(route, "custom")
        try:
            mounted = include_router(app, route)
            ROUTER_LOAD_EVENTS.append(
                {
                    "router": route,
                    "domain": domain,
                    "required": route in REQUIRED_ROUTERS,
                    "mounted": mounted,
                }
            )
        except Exception as exc:
            FAILED_ROUTERS.append({"router": route, "domain": domain, "error": repr(exc)})
            level = logging.CRITICAL if route in REQUIRED_ROUTERS else logging.ERROR
            logger.log(level, "Failed to load %s router %s", domain, route, exc_info=True)
            if route in REQUIRED_ROUTERS:
                raise
    ROUTE_CONFLICTS.extend(_detect_route_conflicts(app))
    if ROUTE_CONFLICTS:
        logger.warning("Detected %s duplicate route method/path registrations", len(ROUTE_CONFLICTS))
    if FAILED_ROUTERS:
        logger.error(
            "Router startup completed with %s failed optional routers: %s",
            len(FAILED_ROUTERS),
            ", ".join(f"{item['domain']}:{item['router']}" for item in FAILED_ROUTERS),
        )
    logger.info(
        "Router startup loaded %s routers across %s domains (%s failed, %s conflicts)",
        len(ROUTER_LOAD_EVENTS),
        len(ROUTER_GROUPS),
        len(FAILED_ROUTERS),
        len(ROUTE_CONFLICTS),
    )


def get_failed_routers() -> list[dict[str, str]]:
    return FAILED_ROUTERS


def get_route_conflicts() -> list[dict[str, object]]:
    return ROUTE_CONFLICTS


def get_router_registry_summary() -> dict[str, object]:
    return {
        "groups": [
            {
                "name": group.name,
                "classification": group.classification,
                "router_count": len(group.routers),
                "required_routers": list(group.required_routers),
                "notes": group.notes,
            }
            for group in ROUTER_GROUPS
        ],
        "router_count": len(ROUTERS),
        "required_router_count": len(REQUIRED_ROUTERS),
        "legacy_compatibility_router_count": len(LEGACY_COMPATIBILITY_ROUTERS),
        "failed": list(FAILED_ROUTERS),
        "conflicts": list(ROUTE_CONFLICTS),
    }
