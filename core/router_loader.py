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
            "routers.connect_routes",
            "routers.shift_routes",
            "routers.frontend_compat",
            "routers.young_people_shell_item_compat_routes",
            "routers.home_selector_routes",
            "routers.staff_evidence_routes",
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
            "routers.provider_oversight_routes",
            "routers.referral_matching_routes",
            "routers.referral_decision_routes",
            "routers.referral_portal_page_routes",
            "routers.referral_upload_routes",
            "routers.referral_risk_review_routes",
        ),
        notes="Account, admin, billing, provider administration and referral matching.",
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
            "routers.realtime_replay_routes",
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
            "routers.document_template_routes",
            "routers.document_upload_extraction_routes",
            "routers.document_signoff_routes",
            "routers.child_friendly_output_routes",
            "routers.meetings_routes",
            "routers.external_collaboration_routes",
        ),
        notes="Document library, document engine, Documents OS and document helper endpoints.",
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
            "backend.os_live_data_router",
        ),
        notes="Compliance, workflow review, schema-live, OS workflow wiring audit and OS live data gateways.",
    ),
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


def include_router_groups(app: FastAPI) -> RouterLoadReport:
    report = RouterLoadReport()
    seen: dict[str, str] = {}

    for group in ROUTER_GROUPS:
        for module_name in group.routers:
            try:
                module = importlib.import_module(module_name)
                routers = [getattr(module, "router", None)]
                routers.extend(getattr(module, attr, None) for attr in EXTRA_ROUTER_ATTRS)
                routers = [router for router in routers if router is not None]
                if not routers:
                    raise RuntimeError("module has no router")
                for router in routers:
                    app.include_router(router)
                    for route in getattr(router, "routes", []):
                        key = _route_key(route)
                        if not key:
                            continue
                        if key in seen:
                            if group.classification == "legacy_compatibility" or "compat" in module_name:
                                report.compatibility_shadows.append(f"{key} via {module_name} shadows {seen[key]}")
                            else:
                                report.duplicate_routes.append(f"{key} via {module_name} duplicates {seen[key]}")
                        else:
                            seen[key] = module_name
                report.loaded.append(module_name)
            except Exception as exc:
                report.failed.append((module_name, str(exc)))
                if module_name in group.required_routers:
                    raise
                logger.warning("Optional router failed to load: %s (%s)", module_name, exc)

    if report.duplicate_routes:
        logger.warning("Detected %s accidental duplicate route method/path registrations", len(report.duplicate_routes))
    if report.compatibility_shadows:
        logger.info("Detected %s intentional compatibility route shadows", len(report.compatibility_shadows))
    logger.info("Router startup loaded %s routers across %s domains (%s failed, %s conflicts)", len(report.loaded), len(ROUTER_GROUPS), len(report.failed), len(report.duplicate_routes))
    return report


def include_routers(app: FastAPI) -> RouterLoadReport:
    """Backwards-compatible entrypoint used by core.app_factory."""
    return include_router_groups(app)