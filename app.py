import os
import importlib

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
CSS_DIR = os.path.join(FRONTEND_DIR, "css")
JS_DIR = os.path.join(FRONTEND_DIR, "js")
ASSETS_DIR = os.path.join(FRONTEND_DIR, "assets")
COMPONENTS_DIR = os.path.join(FRONTEND_DIR, "components")

app = FastAPI(title="IndiCare")


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


def include_router(module_path: str):
    module = importlib.import_module(module_path)
    router = getattr(module, "router", None)
    if router is None:
        raise RuntimeError(f"No router object found in {module_path}")
    app.include_router(router)
    print(f"[IndiCare] Loaded router: {module_path}")


# =========================================================
# Core routers
# =========================================================
include_router("routers.auth_routes")
include_router("routers.account_routes")
include_router("routers.admin_routes")
include_router("routers.ai_note_export_routes")
include_router("routers.ai_note_templates_routes")
include_router("routers.ai_notes_routes")
include_router("routers.chat_routes")
include_router("routers.dashboard_routes")
include_router("routers.documents_routes")
include_router("routers.handover_routes")
include_router("routers.monthly_reviews_routes")
include_router("routers.ofsted_ai_report_routes")
include_router("routers.ofsted_pack_routes")
include_router("routers.reports_routes")
include_router("routers.risk_routes")
include_router("routers.staff_journal_routes")
include_router("routers.supervision_routes")
include_router("routers.tasks_routes")

# =========================================================
# Young people routers
# =========================================================
include_router("routers.young_people_routes")
include_router("routers.young_people_profile_routes")
include_router("routers.young_people_daily_notes_routes")
include_router("routers.young_people_incidents_routes")
include_router("routers.young_people_health_routes")
include_router("routers.young_people_education_routes")
include_router("routers.young_people_family_routes")
include_router("routers.young_people_keywork_routes")
include_router("routers.young_people_plans_routes")
include_router("routers.young_people_risk_routes")
include_router("routers.young_people_chronology_routes")
include_router("routers.young_people_compliance_routes")
include_router("routers.young_people_standards_routes")

# =========================================================
# Extra young people feature routers
# =========================================================
include_router("routers.young_people_handover_routes")
include_router("routers.young_people_reports_routes")
include_router("routers.young_people_photo_routes")
include_router("routers.young_people_statutory_documents_routes")

# =========================================================
# Workflow / QA routers
# =========================================================
include_router("routers.workflow_review_routes")

# =========================================================
# OS layer routers
# =========================================================
include_router("routers.command_centre_routes")
include_router("routers.events_routes")
include_router("routers.evidence_routes")
include_router("routers.qa_routes")
include_router("routers.exports_routes")
include_router("routers.rostering_routes")


# =========================================================
# Static mounts
# =========================================================
app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
app.mount("/components", StaticFiles(directory=COMPONENTS_DIR), name="components")


# =========================================================
# Page routes
# =========================================================
@app.get("/")
def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/login")
def serve_login():
    return FileResponse(os.path.join(FRONTEND_DIR, "login.html"))


@app.get("/login.html")
def serve_login_html():
    return FileResponse(os.path.join(FRONTEND_DIR, "login.html"))


@app.get("/assistant")
def serve_assistant():
    return FileResponse(os.path.join(COMPONENTS_DIR, "assistant.html"))


@app.get("/journal")
def serve_journal():
    return FileResponse(os.path.join(FRONTEND_DIR, "journal.html"))


@app.get("/journal.html")
def serve_journal_html():
    return FileResponse(os.path.join(FRONTEND_DIR, "journal.html"))


@app.get("/journal.css")
def serve_journal_css():
    return FileResponse(os.path.join(FRONTEND_DIR, "journal.css"))


@app.get("/journal.js")
def serve_journal_js():
    return FileResponse(os.path.join(FRONTEND_DIR, "journal.js"))


@app.get("/supervision")
def serve_supervision():
    return FileResponse(os.path.join(FRONTEND_DIR, "supervision.html"))


@app.get("/supervision.html")
def serve_supervision_html():
    return FileResponse(os.path.join(FRONTEND_DIR, "supervision.html"))


@app.get("/supervision.js")
def serve_supervision_js():
    return FileResponse(os.path.join(FRONTEND_DIR, "supervision.js"))


@app.get("/ai-notes")
def serve_ai_notes():
    return FileResponse(os.path.join(FRONTEND_DIR, "ai-note.html"))


@app.get("/ai-note.html")
def serve_ai_note_html():
    return FileResponse(os.path.join(FRONTEND_DIR, "ai-note.html"))


@app.get("/ai-notes.css")
def serve_ai_notes_css():
    return FileResponse(os.path.join(FRONTEND_DIR, "ai-notes.css"))


@app.get("/ai-notes.js")
def serve_ai_notes_js():
    return FileResponse(os.path.join(FRONTEND_DIR, "ai-notes.js"))


@app.get("/young-people-page")
def serve_young_people():
    return FileResponse(os.path.join(FRONTEND_DIR, "young-people.html"))


@app.get("/young-people-page.html")
def serve_young_people_html():
    return FileResponse(os.path.join(FRONTEND_DIR, "young-people.html"))


@app.get("/young-people-shell")
def serve_young_people_shell():
    return FileResponse(os.path.join(FRONTEND_DIR, "young-people-shell.html"))


@app.get("/young-people-shell.html")
def serve_young_people_shell_html():
    return FileResponse(os.path.join(FRONTEND_DIR, "young-people-shell.html"))


@app.get("/childrens-home-os")
def serve_childrens_home_os():
    return FileResponse(os.path.join(FRONTEND_DIR, "young-people-shell.html"))


@app.get("/childrens-home-os.html")
def serve_childrens_home_os_html():
    return FileResponse(os.path.join(FRONTEND_DIR, "young-people-shell.html"))


@app.get("/rostering")
def serve_rostering():
    return FileResponse(os.path.join(FRONTEND_DIR, "rostering.html"))


@app.get("/rostering.html")
def serve_rostering_html():
    return FileResponse(os.path.join(FRONTEND_DIR, "rostering.html"))


@app.get("/health")
def health():
    return {"ok": True}
