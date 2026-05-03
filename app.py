import importlib
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

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
]


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db_pool()
    init_legal_acceptance_table()
    init_mfa_tables()
    init_passkeys_table()
    init_partner_assistant_tables()
    logger.info("IndiCare API started")
    try:
        yield
    finally:
        close_db_pool()
        logger.info("IndiCare API stopped")


def include_router(app: FastAPI, module_path: str) -> None:
    module = importlib.import_module(module_path)
    router = getattr(module, "router", None)
    compat_router = getattr(module, "compat_router", None)
    if router is None:
        raise RuntimeError(f"No router found in {module_path}")
    app.include_router(router)
    if compat_router is not None:
        app.include_router(compat_router)


def serve_from(paths: list[str], error: str):
    for path in paths:
        if os.path.exists(path):
            return FileResponse(path)
    return JSONResponse(status_code=404, content={"error": error})


def register_file_route(app: FastAPI, route_path: str, paths: list[str], name_prefix: str) -> None:
    def endpoint():
        return serve_from(paths, "Page not found")

    endpoint.__name__ = f"{name_prefix}_{route_path.strip('/').replace('-', '_').replace('.', '_') or 'root'}"
    app.get(route_path)(endpoint)


def register_frontend_routes(app: FastAPI) -> None:
    @app.get("/")
    def root():
        return RedirectResponse(url="/my-profile", status_code=302)

    def frontend(file_name: str) -> list[str]:
        return [os.path.join(FRONTEND_DIR, file_name)]

    def component(file_name: str) -> list[str]:
        return [os.path.join(COMPONENTS_DIR, file_name)]

    def academy(file_name: str) -> list[str]:
        return [os.path.join(ACADEMY_DIR, file_name), os.path.join(FRONTEND_DIR, file_name)]

    page_routes = {
        "/login": frontend("login.html"),
        "/login.html": frontend("login.html"),
        "/mfa": frontend("mfa.html"),
        "/mfa.html": frontend("mfa.html"),
        "/mfa-setup": frontend("mfa-setup.html"),
        "/mfa-setup.html": frontend("mfa-setup.html"),
        "/mfa-recovery": frontend("mfa-recovery.html"),
        "/mfa-recovery.html": frontend("mfa-recovery.html"),
        "/oslogin": frontend("oslogin.html"),
        "/oslogin.html": frontend("oslogin.html"),
        "/journal": frontend("journal.html"),
        "/journal.html": frontend("journal.html"),
        "/supervision": frontend("supervision.html"),
        "/supervision.html": frontend("supervision.html"),
        "/ai-notes": frontend("ai-note.html"),
        "/ai-note.html": frontend("ai-note.html"),
        "/young-people": frontend("young-people.html"),
        "/young-people.html": frontend("young-people.html"),
        "/young-people-page": frontend("young-people.html"),
        "/young-people-page.html": frontend("young-people.html"),
        "/young-people-shell": frontend("young-people-shell.html"),
        "/young-people-shell.html": frontend("young-people-shell.html"),
        "/childrens-home-os": frontend("young-people-shell.html"),
        "/childrens-home-os.html": frontend("young-people-shell.html"),
        "/rostering": frontend("rostering.html"),
        "/rostering.html": frontend("rostering.html"),
        "/founder-hq": frontend("founder-hq.html"),
        "/founder-hq.html": frontend("founder-hq.html"),
        "/admin-users": frontend("admin-users.html"),
        "/admin-users.html": frontend("admin-users.html"),
        "/assistant": component("assistant.html"),
        "/assistant.html": component("assistant.html"),
        "/academy": academy("academy.html"),
        "/academy.html": academy("academy.html"),
        "/academy-ui": academy("academy.html"),
        "/academy-ui.html": academy("academy.html"),
        "/academy/intelligence.html": academy("intelligence.html"),
        "/academy/module-detail.html": academy("module-detail.html"),
        "/academy/workbook-detail.html": academy("workbook-detail.html"),
        "/academy/qualification-detail.html": academy("qualification-detail.html"),
        "/academy/module-list.html": academy("module-list.html"),
        "/academy/qualification-list.html": academy("qualification-list.html"),
        "/academy/manager-compliance.html": academy("manager-compliance.html"),
        "/academy/evidence-portfolio.html": academy("evidence-portfolio.html"),
        "/academy/certificates.html": academy("certificates.html"),
        "/staff-profile.html": frontend("staff-profile.html"),
        "/my-profile": frontend("staff-profile.html"),
        "/my-profile.html": frontend("staff-profile.html"),
        "/staff-profiles": component("staff-profiles.html"),
        "/staff-profiles.html": component("staff-profiles.html"),
    }
    for route_path, paths in page_routes.items():
        register_file_route(app, route_path, paths, "page")

    @app.get("/command")
    @app.get("/command.html")
    @app.get("/home")
    def redirect_to_assistant():
        return RedirectResponse(url="/assistant", status_code=302)

    @app.get("/ai-notes.css")
    def ai_notes_css():
        return FileResponse(os.path.join(FRONTEND_DIR, "ai-notes.css"))

    @app.get("/ai-notes.js")
    def ai_notes_js():
        return FileResponse(os.path.join(FRONTEND_DIR, "ai-notes.js"))


def create_app() -> FastAPI:
    app = FastAPI(title="IndiCare API", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "https://app.indicare.co.uk,http://localhost:3000,http://127.0.0.1:3000").split(",") if origin.strip()],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-CSRF-Token", "X-Debug-Error", "x-api-key"],
    )

    for route in ROUTERS:
        include_router(app, route)

    app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
    app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
    app.mount("/components", StaticFiles(directory=COMPONENTS_DIR), name="components")

    @app.get("/health")
    def health():
        return {"ok": True}

    register_frontend_routes(app)
    return app


app = create_app()
