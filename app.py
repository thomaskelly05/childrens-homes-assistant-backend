import os
import uvicorn

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware


# --------------------------------------------------
# ROUTERS
# --------------------------------------------------

from auth.routes import router as auth_router

from routers.chat_routes import router as chat_router
from routers.tasks_routes import router as tasks_router
from routers.staff_journal_routes import router as journal_router
from routers.supervision_routes import router as supervision_router
from routers.handover_routes import router as handover_router

from routers.reports_routes import router as reports_router
from routers.documents_routes import router as documents_router

from routers.dashboard_routes import router as dashboard_router
from routers.account_routes import router as account_router

from routers.ai_notes_routes import router as ai_notes_router
from routers.ai_note_templates_routes import router as ai_note_templates_router
from routers.ai_note_export_routes import router as ai_note_export_router


# --------------------------------------------------
# APP INFO
# --------------------------------------------------

APP_NAME = "IndiCare Assistant API"
VERSION = "2.0"
PORT = int(os.environ.get("PORT", 10000))

SESSION_SECRET = os.environ.get("SESSION_SECRET")
if not SESSION_SECRET:
    raise RuntimeError("SESSION_SECRET is not set")

IS_PROD = os.environ.get("RENDER") is not None


# --------------------------------------------------
# CREATE APP
# --------------------------------------------------

app = FastAPI(
    title=APP_NAME,
    version=VERSION,
    docs_url="/docs",
    redoc_url=None
)


# --------------------------------------------------
# SECURITY HEADERS
# --------------------------------------------------

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)

    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin"
    response.headers["Permissions-Policy"] = "microphone=(self)"
    response.headers["X-Accel-Buffering"] = "no"

    return response


# --------------------------------------------------
# CORS CONFIG
# --------------------------------------------------

ALLOWED_ORIGINS = [
    "https://indicare.co.uk",
    "https://www.indicare.co.uk",
    "https://app.indicare.co.uk",
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# SESSION COOKIE
# --------------------------------------------------

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    session_cookie="indicare_session",
    same_site="none" if IS_PROD else "lax",
    https_only=IS_PROD,
    max_age=86400
)


# --------------------------------------------------
# ROUTERS
# --------------------------------------------------

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(tasks_router)
app.include_router(journal_router)
app.include_router(supervision_router)
app.include_router(handover_router)
app.include_router(reports_router)
app.include_router(documents_router)
app.include_router(dashboard_router)
app.include_router(account_router)
app.include_router(ai_notes_router)
app.include_router(ai_note_templates_router)
app.include_router(ai_note_export_router)


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": APP_NAME,
        "version": VERSION
    }


# --------------------------------------------------
# API ROOT
# --------------------------------------------------

@app.get("/api")
def api_root():
    return {
        "message": "IndiCare API running",
        "docs": "/docs",
        "health": "/health"
    }


# --------------------------------------------------
# FRONTEND HOSTING
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

if os.path.isdir(FRONTEND_DIR):
    app.mount(
        "/",
        StaticFiles(directory=FRONTEND_DIR, html=True),
        name="frontend"
    )


# --------------------------------------------------
# SPA ROUTING (OPTIONAL FALLBACK)
# --------------------------------------------------

@app.get("/{full_path:path}")
async def spa_fallback(request: Request, full_path: str):
    api_prefixes = (
        "auth",
        "chat",
        "tasks",
        "staff-journal",
        "supervision",
        "handover",
        "reports",
        "documents",
        "dashboard",
        "account",
        "ai-notes",
        "ai-note-templates",
        "health",
        "docs",
        "api",
    )

    if full_path.startswith(api_prefixes):
        raise HTTPException(status_code=404, detail="Not found")

    index_file = os.path.join(FRONTEND_DIR, "index.html")

    if os.path.exists(index_file):
        return FileResponse(index_file)

    raise HTTPException(status_code=404, detail="Frontend not found")


# --------------------------------------------------
# LOCAL DEVELOPMENT
# --------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=PORT,
        reload=True
    )
