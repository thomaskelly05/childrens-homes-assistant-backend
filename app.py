import os
import importlib

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles


# =========================================================
# BASE PATHS
# =========================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
CSS_DIR = os.path.join(FRONTEND_DIR, "css")
JS_DIR = os.path.join(FRONTEND_DIR, "js")
ASSETS_DIR = os.path.join(FRONTEND_DIR, "assets")
COMPONENTS_DIR = os.path.join(FRONTEND_DIR, "components")


# =========================================================
# ENV VALIDATION (FAIL FAST)
# =========================================================
REQUIRED_ENV_VARS = [
    "SESSION_SECRET",
    "OPENAI_API_KEY"
]

missing = [key for key in REQUIRED_ENV_VARS if not os.getenv(key)]
if missing:
    raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")


# =========================================================
# APP INIT
# =========================================================
app = FastAPI(title="IndiCare API")


# =========================================================
# CORS
# =========================================================
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


# =========================================================
# ROUTER LOADER (SAFE)
# =========================================================
def include_router(module_path: str):
    try:
        module = importlib.import_module(module_path)
        router = getattr(module, "router", None)

        if router is None:
            raise RuntimeError(f"No router found in {module_path}")

        app.include_router(router)
        print(f"[IndiCare] Loaded router: {module_path}")

    except Exception as e:
        print(f"[IndiCare ERROR] Failed to load {module_path}: {str(e)}")


# =========================================================
# ROUTERS
# =========================================================
ROUTERS = [
    "routers.auth_routes",
    "routers.account_routes",
    "routers.admin_routes",
    "routers.billing_routes",

    "routers.ai_notes_routes",
    "routers.ai_note_templates_routes",
    "routers.ai_note_export_routes",

    "routers.chat_routes",
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

    "routers.young_people_routes",
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


# =========================================================
# STATIC FILES
# =========================================================
app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
app.mount("/components", StaticFiles(directory=COMPONENTS_DIR), name="components")


# =========================================================
# BASIC HEALTH CHECK
# =========================================================
@app.get("/health")
def health():
    return {"ok": True}


# =========================================================
# GLOBAL ERROR HANDLER (CLEAN API ERRORS)
# =========================================================
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print(f"[GLOBAL ERROR] {str(exc)}")

    return JSONResponse(
        status_code=500,
        content={
            "ok": False,
            "error": "Internal server error"
        }
    )


# =========================================================
# FRONTEND ROUTES
# =========================================================
def serve_page(file_name: str):
    path = os.path.join(FRONTEND_DIR, file_name)
    if not os.path.exists(path):
        return JSONResponse(status_code=404, content={"error": "Page not found"})
    return FileResponse(path)


@app.get("/")
def serve_index():
    return serve_page("index.html")


@app.get("/login")
def serve_login():
    return serve_page("login.html")


@app.get("/oslogin")
def serve_oslogin():
    return serve_page("oslogin.html")


@app.get("/assistant")
def serve_assistant():
    return FileResponse(os.path.join(COMPONENTS_DIR, "assistant.html"))


@app.get("/journal")
def serve_journal():
    return serve_page("journal.html")


@app.get("/supervision")
def serve_supervision():
    return serve_page("supervision.html")


@app.get("/ai-notes")
def serve_ai_notes():
    return serve_page("ai-note.html")


@app.get("/young-people-page")
def serve_young_people():
    return serve_page("young-people.html")


@app.get("/young-people-shell")
def serve_young_people_shell():
    return serve_page("young-people-shell.html")


@app.get("/childrens-home-os")
def serve_childrens_home_os():
    return serve_page("young-people-shell.html")


@app.get("/rostering")
def serve_rostering():
    return serve_page("rostering.html")
