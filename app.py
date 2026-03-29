import importlib
import logging
import os

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.sessions import SessionMiddleware

from auth.auth_guard import enforce_login_middleware
from auth.mfa_guard import enforce_mfa_middleware
from db.connection import (
    close_db_pool,
    get_db_connection,
    init_db_pool,
    release_db_connection,
)
from db.legal_acceptance_db import init_legal_acceptance_table
from db.mfa_db import init_mfa_tables

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
CSS_DIR = os.path.join(FRONTEND_DIR, "css")
JS_DIR = os.path.join(FRONTEND_DIR, "js")
ASSETS_DIR = os.path.join(FRONTEND_DIR, "assets")
COMPONENTS_DIR = os.path.join(FRONTEND_DIR, "components")

REQUIRED_ENV_VARS = [
    "SESSION_SECRET",
    "OPENAI_API_KEY",
    "DATABASE_URL",
]

missing = [key for key in REQUIRED_ENV_VARS if not os.getenv(key)]
if missing:
    raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "1.0")),
        profiles_sample_rate=float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "1.0")),
        environment=os.getenv("APP_ENV", "production"),
        release=os.getenv("APP_REVISION"),
    )

app = FastAPI(title="IndiCare API")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ["SESSION_SECRET"],
    same_site="lax",
    https_only=os.getenv("APP_ENV", "production").lower() == "production",
    max_age=60 * 60 * 12,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.indicare.co.uk",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def global_login_enforcement(request: Request, call_next):
    return await enforce_login_middleware(request, call_next)


@app.middleware("http")
async def global_mfa_enforcement(request: Request, call_next):
    return await enforce_mfa_middleware(request, call_next)


@app.on_event("startup")
def startup_event():
    init_db_pool()
    init_legal_acceptance_table()
    init_mfa_tables()
    logger.info("IndiCare API started")


@app.on_event("shutdown")
def shutdown_event():
    close_db_pool()
    logger.info("IndiCare API stopped")


def include_router(module_path: str):
    module = importlib.import_module(module_path)

    main_router = getattr(module, "router", None)
    compat_router = getattr(module, "compat_router", None)

    if main_router is None:
        raise RuntimeError(f"No router found in {module_path}")

    app.include_router(main_router)
    logger.info("[IndiCare] Loaded router: %s (router)", module_path)

    if compat_router is not None:
        app.include_router(compat_router)
        logger.info("[IndiCare] Loaded router: %s (compat_router)", module_path)


ROUTERS = [
    "routers.auth_routes",
    "routers.mfa_routes",
    "routers.legal_acceptance_routes",
    "routers.account_routes",
    "routers.admin_routes",
    "routers.billing_routes",
    "routers.ai_notes_routes",
    "routers.ai_note_templates_routes",
    "routers.ai_note_export_routes",
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
    "routers.document_rules_routes",
    "routers.document_ai_review_routes",
    "routers.document_ai_routes",
    "routers.manager_routes",
    "routers.young_people_profile_routes",
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
]

for route in ROUTERS:
    include_router(route)

app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
app.mount("/components", StaticFiles(directory=COMPONENTS_DIR), name="components")


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/health/ready")
def health_ready():
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()

        return {"ok": True, "ready": True}
    except Exception as exc:
        logger.exception("Readiness check failed")
        return JSONResponse(
            status_code=503,
            content={"ok": False, "ready": False, "error": str(exc)},
        )
    finally:
        release_db_connection(conn)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "ok": False,
            "error": "Internal server error",
        },
    )


def serve_page(file_name: str):
    path = os.path.join(FRONTEND_DIR, file_name)
    if not os.path.exists(path):
        return JSONResponse(status_code=404, content={"error": "Page not found"})
    return FileResponse(path)


def serve_component(file_name: str):
    path = os.path.join(COMPONENTS_DIR, file_name)
    if not os.path.exists(path):
        return JSONResponse(status_code=404, content={"error": "Component page not found"})
    return FileResponse(path)


@app.get("/")
def serve_index():
    return serve_component("assistant.html")


@app.get("/assistant")
def serve_assistant():
    return serve_component("assistant.html")


@app.get("/assistant.html")
def serve_assistant_html():
    return serve_component("assistant.html")


@app.get("/command")
def serve_command():
    return RedirectResponse(url="/assistant", status_code=302)


@app.get("/command.html")
def serve_command_html():
    return RedirectResponse(url="/assistant", status_code=302)


@app.get("/home")
def serve_home():
    return RedirectResponse(url="/assistant", status_code=302)


@app.get("/login")
def serve_login():
    return serve_page("login.html")


@app.get("/login.html")
def serve_login_html():
    return serve_page("login.html")


@app.get("/mfa")
def serve_mfa():
    return serve_page("mfa.html")


@app.get("/mfa.html")
def serve_mfa_html():
    return serve_page("mfa.html")


@app.get("/mfa-setup")
def serve_mfa_setup():
    return serve_page("mfa-setup.html")


@app.get("/mfa-setup.html")
def serve_mfa_setup_html():
    return serve_page("mfa-setup.html")


@app.get("/mfa-recovery")
def serve_mfa_recovery():
    return serve_page("mfa-recovery.html")


@app.get("/mfa-recovery.html")
def serve_mfa_recovery_html():
    return serve_page("mfa-recovery.html")


@app.get("/oslogin")
def serve_oslogin():
    return serve_page("oslogin.html")


@app.get("/oslogin.html")
def serve_oslogin_html():
    return serve_page("oslogin.html")


@app.get("/journal")
def serve_journal():
    return serve_page("journal.html")


@app.get("/journal.html")
def serve_journal_html():
    return serve_page("journal.html")


@app.get("/supervision")
def serve_supervision():
    return serve_page("supervision.html")


@app.get("/supervision.html")
def serve_supervision_html():
    return serve_page("supervision.html")


@app.get("/ai-notes")
def serve_ai_notes():
    return serve_page("ai-note.html")


@app.get("/ai-note.html")
def serve_ai_note_html():
    return serve_page("ai-note.html")


@app.get("/ai-notes.css")
def serve_ai_notes_css():
    return FileResponse(os.path.join(FRONTEND_DIR, "ai-notes.css"))


@app.get("/ai-notes.js")
def serve_ai_notes_js():
    return FileResponse(os.path.join(FRONTEND_DIR, "ai-notes.js"))


@app.get("/young-people-page")
def serve_young_people():
    return serve_page("young-people.html")


@app.get("/young-people-page.html")
def serve_young_people_html():
    return serve_page("young-people.html")


@app.get("/young-people-shell")
def serve_young_people_shell():
    return serve_page("young-people-shell.html")


@app.get("/young-people-shell.html")
def serve_young_people_shell_html():
    return serve_page("young-people-shell.html")


@app.get("/childrens-home-os")
def serve_childrens_home_os():
    return serve_page("young-people-shell.html")


@app.get("/childrens-home-os.html")
def serve_childrens_home_os_html():
    return serve_page("young-people-shell.html")


@app.get("/rostering")
def serve_rostering():
    return serve_page("rostering.html")


@app.get("/rostering.html")
def serve_rostering_html():
    return serve_page("rostering.html")
