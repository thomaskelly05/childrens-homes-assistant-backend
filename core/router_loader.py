import importlib
import logging

from fastapi import FastAPI

logger = logging.getLogger(__name__)

ROUTERS = """
routers.auth_routes
routers.mfa_routes
routers.passkey_routes
routers.session_security_routes
routers.legal_acceptance_routes
routers.debug_health_routes
routers.security_routes
routers.notifications_routes
routers.frontend_compat
routers.young_people_shell_item_compat_routes
routers.young_people_safe_routes
routers.home_selector_routes
routers.account_routes
routers.admin_routes
routers.founder_ai_routes
routers.admin_user_routes
routers.billing_routes
routers.indicare_mail_routes
routers.ai_notes_routes
routers.ai_note_templates_routes
routers.ai_note_export_routes
routers.assistant_general_routes
routers.assistant_general_safe_routes
routers.assistant_web_routes
routers.indicare_ai_orchestrator_routes
routers.indicare_ai_memory_routes
routers.standalone_assistant_library_routes
routers.standalone_intelligence_routes
routers.standalone_enterprise_intelligence_routes
routers.standalone_timeline_routes
routers.standalone_tier_routes
routers.standalone_workflow_routes
routers.standalone_search_routes
routers.assistant_os_routes
routers.assistant_os_knowledge_routes
routers.assistant_intelligence_routes
routers.manager_intelligence_routes
routers.proactive_intelligence_routes
routers.provider_intelligence_routes
routers.predictive_risk_routes
routers.realtime_alerts_routes
routers.workspace_records_routes
routers.child_documents_routes
routers.operational_memory_routes
routers.young_people_assistant_routes
routers.operational_intelligence_routes
routers.inspection_os_routes
routers.rm_dashboard_routes
routers.live_alerts_routes
routers.os_modules_routes
routers.os_shell_api_routes
routers.assistant_partner_api
routers.chat_routes
routers.document_library_routes
routers.dashboard_routes
routers.documents_routes
routers.handover_routes
routers.monthly_reviews_routes
routers.ofsted_ai_report_routes
routers.ofsted_pack_routes
routers.reports_routes
routers.risk_routes
routers.staff_journal_routes
routers.supervision_routes
routers.tasks_routes
routers.actions_routes
routers.visibility_routes
routers.document_rules_routes
routers.document_ai_review_routes
routers.document_ai_routes
routers.manager_routes
routers.home_inspection_compat_routes
routers.young_people_profile_routes
routers.child_experience_intelligence_routes
routers.young_people_daily_notes_routes
routers.young_people_incidents_routes
routers.young_people_health_routes
routers.young_people_education_routes
routers.young_people_family_routes
routers.young_people_keywork_routes
routers.young_people_plans_routes
routers.young_people_risk_routes
routers.young_people_chronology_routes
routers.young_people_calendar_routes
routers.young_people_appointments_routes
routers.young_people_compliance_routes
routers.young_people_standards_routes
routers.young_people_handover_routes
routers.young_people_reports_routes
routers.young_people_photo_routes
routers.young_people_statutory_documents_routes
routers.workflow_review_routes
routers.command_centre_routes
routers.events_routes
routers.evidence_routes
routers.qa_routes
routers.exports_routes
routers.rostering_routes
routers.academy_routes
routers.academy_intelligence_routes
routers.staff_profile_routes
routers.staff_today_routes
routers.workspace_routes
routers.workspace_review_routes
routers.workspace_ofsted_evidence_routes
backend.os_runtime_compat_router
backend.os_schema_audit_router
backend.os_record_viewer_router
backend.universal_records_router
backend.universal_record_edit_router
backend.therapeutic_recording_intelligence_router
backend.universal_document_intelligence_router
backend.indicare_connect_router
backend.indicare_connect_calendar_router
backend.indicare_connect_join_router
backend.indicare_connect_realtime_router
backend.indicare_connect_groups_router
backend.os_assistant_bridge_router
backend.reg44_report_reader_router
backend.reg44_document_ingestion_router
backend.reg44_trend_engine_router
backend.os_command_router
backend.os_command_shift_router
backend.os_command_risk_router
backend.os_command_inspection_router
backend.os_command_patterns_router
backend.os_command_chronology_intelligence_router
backend.os_command_manager_review_router
backend.os_command_wellbeing_router
backend.os_provider_command_router
backend.os_command_network_router
backend.os_command_care_recording_router
backend.os_command_young_person_workspace_router
""".split()

REQUIRED_ROUTERS = {
    "routers.auth_routes",
    "routers.mfa_routes",
    "routers.session_security_routes",
    "routers.debug_health_routes",
    "routers.frontend_compat",
    "routers.security_routes",
}

FAILED_ROUTERS: list[dict[str, str]] = []


def include_router(app: FastAPI, module_path: str) -> None:
    module = importlib.import_module(module_path)
    router = getattr(module, "router", None)
    compat_router = getattr(module, "compat_router", None)
    if router is None:
        raise RuntimeError(f"No router found in {module_path}")
    app.include_router(router)
    if compat_router is not None:
        app.include_router(compat_router)


def include_routers(app: FastAPI, routers: list[str] | None = None) -> None:
    FAILED_ROUTERS.clear()
    for route in routers or ROUTERS:
        try:
            include_router(app, route)
        except Exception as exc:
            FAILED_ROUTERS.append({"router": route, "error": repr(exc)})
            logger.exception("Failed to load router %s", route)
            if route in REQUIRED_ROUTERS:
                raise


def get_failed_routers() -> list[dict[str, str]]:
    return FAILED_ROUTERS
