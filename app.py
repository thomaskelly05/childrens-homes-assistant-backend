import importlib
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from middleware.access_scope_middleware import AccessScopeMiddleware
from middleware.security_middleware import AuditLoggingMiddleware, SecurityHeadersMiddleware

from db.connection import close_db_pool, init_db_pool
from db.legal_acceptance_db import init_legal_acceptance_table
from db.mfa_db import init_mfa_tables
from db.partner_assistant_db import init_partner_assistant_tables
from db.passkeys_db import init_passkeys_table


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("indicare.app")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
ACADEMY_DIR = os.path.join(FRONTEND_DIR, "academy")
CSS_DIR = os.path.join(FRONTEND_DIR, "css")
JS_DIR = os.path.join(FRONTEND_DIR, "js")
ASSETS_DIR = os.path.join(FRONTEND_DIR, "assets")
COMPONENTS_DIR = os.path.join(FRONTEND_DIR, "components")

ROUTERS = [
    "routers.auth_routes",
    "routers.mfa_routes",
    "routers.passkey_routes",
    "routers.legal_acceptance_routes",
    "routers.debug_health_routes",
    "routers.security_routes",
    "routers.frontend_compat",
    "routers.young_people_shell_item_compat_routes",
    "routers.account_routes",
    "routers.admin_routes",
    "routers.founder_ai_routes",
    "routers.admin_user_routes",
    "routers.billing_routes",
    "routers.ai_notes_routes",
    "routers.ai_note_templates_routes",
    "routers.ai_note_export_routes",
    "routers.assistant_general_routes",
    "routers.assistant_os_routes",
    "routers.operational_intelligence_routes",
    "routers.inspection_os_routes",
    "routers.assistant_partner_api",
    "routers.chat_routes",
    "routers.document_library_routes",
    "routers.dashboard_routes",
    "routers.documents_routes",
    "routers.handover_routes",
    "routers.monthly_reviews_routes",
    "routers.ofsted_ai_report_routes",
    "routers.ofsted_pack_routes",
    "routers.reports_routes",
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
    "routers.workflow_review_routes",
    "routers.command_centre_routes",
    "routers.events_routes",
    "routers.evidence_routes",
    "routers.qa_routes",
    "routers.exports_routes",
    "routers.rostering_routes",
    "routers.academy_routes",
    "routers.academy_intelligence_routes",
    "routers.staff_profile_routes",
    "routers.staff_today_routes",
    "routers.rm_dashboard_routes",
]

# rest unchanged...
