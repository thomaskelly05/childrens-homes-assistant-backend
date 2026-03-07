import os
import uvicorn

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Routers
from assistant.routes import router as assistant_router
from auth.routes import router as auth_router

from routers.tasks_routes import router as tasks_router
from routers.staff_journal_routes import router as journal_router
from routers.handover_routes import router as handover_router
from routers.dashboard_routes import router as dashboard_router
from routers.account_routes import router as account_router
from routers.conversation_routes import router as conversation_router
from routers.reports_routes import router as reports_router

# Optional knowledge validation
try:
    from assistant.knowledge_loader import validate_knowledge_files
except Exception:
    validate_knowledge_files = None


# ---------------------------------------------------------
# CONFIG
# ---------------------------------------------------------

APP_NAME = "IndiCare Assistant API"
VERSION = "1.0"

PORT = int(os.environ.get("PORT", 10000))

ALLOWED_ORIGINS = [
    "https://indicare.co.uk",
    "https://www.indicare.co.uk",

    # Render deployments
    "https://childrens-homes-assistant-backend.onrender.com",
    "https://childrens-homes-assistant-backend-new.onrender.com",

    # Local development
    "http://localhost:3000",
    "http://localhost:5173",
]


# ---------------------------------------------------------
# APP INITIALISATION
# ---------------------------------------------------------

app = FastAPI(
    title=APP_NAME,
    version=VERSION,
    docs_url="/docs",
    redoc_url=None
)


# ---------------------------------------------------------
# STARTUP EVENTS
# ---------------------------------------------------------

@app.on_event("startup")
def startup_event():
    """
    Run startup checks.
    """
    if validate_knowledge_files:
        try:
            validate_knowledge_files()
            print("Knowledge files validated.")
        except Exception as e:
            print("Knowledge validation failed:", e)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# ROUTERS
# ---------------------------------------------------------

# Authentication
app.include_router(auth_router)

# AI assistant
app.include_router(assistant_router)

# Conversation + chat memory
app.include_router(conversation_router)

# Tasks and staff tools
app.include_router(tasks_router)
app.include_router(journal_router)
app.include_router(handover_router)

# Incident report generator
app.include_router(reports_router)

# Manager / dashboard tools
app.include_router(dashboard_router)

# User account
app.include_router(account_router)


# ---------------------------------------------------------
# HEALTH / STATUS
# ---------------------------------------------------------

@app.get("/health", tags=["system"])
def health():
    return {
        "status": "ok",
        "service": APP_NAME,
        "version": VERSION
    }


@app.get("/", tags=["system"])
def root():
    return {
        "message": "IndiCare API running"
    }


# ---------------------------------------------------------
# STATIC FRONTEND (OPTIONAL)
# ---------------------------------------------------------

FRONTEND_DIR = "frontend"

if os.path.isdir(FRONTEND_DIR):

    app.mount(
        "/",
        StaticFiles(directory=FRONTEND_DIR, html=True),
        name="frontend"
    )


# ---------------------------------------------------------
# LOCAL DEVELOPMENT
# ---------------------------------------------------------

if __name__ == "__main__":

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=PORT,
        reload=True
    )
