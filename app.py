import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from routers.account_routes import router as account_router
from routers.admin_routes import router as admin_router
from routers.ai_note_export_routes import router as ai_note_export_router
from routers.ai_note_templates_routes import router as ai_note_templates_router
from routers.ai_notes_routes import router as ai_notes_router
from routers.auth_routes import router as auth_router
from routers.chat_routes import router as chat_router
from routers.dashboard_routes import router as dashboard_router
from routers.documents_routes import router as documents_router
from routers.handover_routes import router as handover_router
from routers.incident_routes import router as incident_router
from routers.reports_routes import router as reports_router
from routers.risk_routes import router as risk_router
from routers.staff_journal_routes import router as staff_journal_router
from routers.supervision_routes import router as supervision_router
from routers.tasks_routes import router as tasks_router
from routers.young_people_routes import router as young_people_router
from routers.young_people_profile_routes import router as young_people_profile_router
from routers.young_people_plans_routes import router as young_people_plans_router
from routers.young_people_risk_routes import router as young_people_risk_router
from routers.young_people_daily_notes_routes import router as young_people_daily_notes_router
from routers.young_people_incidents_routes import router as young_people_incidents_router
from routers.young_people_health_routes import router as young_people_health_router
from routers.young_people_education_routes import router as young_people_education_router
from routers.young_people_family_routes import router as young_people_family_router
from routers.young_people_keywork_routes import router as young_people_keywork_router

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

app.include_router(auth_router)
app.include_router(account_router)
app.include_router(admin_router)
app.include_router(ai_note_export_router)
app.include_router(ai_note_templates_router)
app.include_router(ai_notes_router)
app.include_router(chat_router)
app.include_router(dashboard_router)
app.include_router(documents_router)
app.include_router(handover_router)
app.include_router(incident_router)
app.include_router(reports_router)
app.include_router(risk_router)
app.include_router(staff_journal_router)
app.include_router(supervision_router)
app.include_router(tasks_router)
app.include_router(young_people_router)
app.include_router(young_people_profile_router)
app.include_router(young_people_plans_router)
app.include_router(young_people_risk_router)
app.include_router(young_people_daily_notes_router)
app.include_router(young_people_incidents_router)
app.include_router(young_people_health_router)
app.include_router(young_people_education_router)
app.include_router(young_people_family_router)
app.include_router(young_people_keywork_router)

app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
app.mount("/components", StaticFiles(directory=COMPONENTS_DIR), name="components")


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


@app.get("/health")
def health():
    return {"ok": True}
