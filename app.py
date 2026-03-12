import os
import uvicorn

from fastapi import FastAPI, Request
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
from routers.handover_routes import router as handover_router

from routers.reports_routes import router as reports_router
from routers.documents_routes import router as documents_router

from routers.dashboard_routes import router as dashboard_router
from routers.account_routes import router as account_router

from routers.ai_notes_routes import router as ai_notes_router


# --------------------------------------------------
# APP INFO
# --------------------------------------------------

APP_NAME = "IndiCare Assistant API"
VERSION = "2.0"

PORT = int(os.environ.get("PORT", 10000))


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
async def security_headers(request, call_next):
    response = await call_next(request)

    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin"

    return response


# --------------------------------------------------
# STREAM BUFFER FIX (Render)
# --------------------------------------------------

@app.middleware("http")
async def disable_buffering(request, call_next):
    response = await call_next(request)

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
    secret_key=os.environ.get(
        "SESSION_SECRET",
        "indicare-super-secret-key"
    ),
    session_cookie="indicare_session",
    same_site="none",
    https_only=True,
    max_age=86400
)


# --------------------------------------------------
# ROUTERS
# --------------------------------------------------

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(tasks_router)
app.include_router(journal_router)
app.include_router(handover_router)
app.include_router(reports_router)
app.include_router(documents_router)
app.include_router(dashboard_router)
app.include_router(account_router)
app.include_router(ai_notes_router)


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
# SPA ROUTING (FRONTEND FALLBACK)
# --------------------------------------------------

@app.get("/{full_path:path}")
async def spa_fallback(request: Request, full_path: str):

    if full_path.startswith("auth") \
    or full_path.startswith("chat") \
    or full_path.startswith("tasks") \
    or full_path.startswith("staff-journal") \
    or full_path.startswith("reports") \
    or full_path.startswith("documents") \
    or full_path.startswith("dashboard") \
    or full_path.startswith("account") \
    or full_path.startswith("ai-notes") \
    or full_path.startswith("health") \
    or full_path.startswith("docs") \
    or full_path.startswith("api"):
        return {"error": "Not found"}

    index_file = os.path.join(FRONTEND_DIR, "index.html")
    return FileResponse(index_file)

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

