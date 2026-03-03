from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Routers
from routers.auth_routes import router as auth_router
from routers.staff_journal_routes import router as journal_router
from routers.handover_routes import router as handover_router
from routers.tasks_routes import router as tasks_router
from routers.account_routes import router as account_router
from routers.assistant_routes import router as assistant_router
from routers.dashboard_routes import router as dashboard_router

# ------------------------------------------------------------
# APP INITIALISATION
# ------------------------------------------------------------

app = FastAPI(title="IndiCare Staff Backend")

# ------------------------------------------------------------
# CORS CONFIGURATION (STRICT — REQUIRED FOR COOKIES)
# ------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.indicare.co.uk",
        "https://indicare.co.uk",
        "https://childrens-homes-assistant-frontend.onrender.com",  # if used
        "http://localhost:5173",  # local dev
        "http://localhost:3000",  # local dev
    ],
    allow_credentials=True,   # required for JWT cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------
# ROUTERS
# ------------------------------------------------------------

app.include_router(auth_router, prefix="/api")
app.include_router(journal_router, prefix="/api")
app.include_router(handover_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(account_router, prefix="/api")
app.include_router(assistant_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")

# ------------------------------------------------------------
# FRONTEND STATIC FILES
# ------------------------------------------------------------

@app.get("/")
def serve_dashboard():
    return FileResponse("frontend/index.html")

@app.get("/login.html")
def serve_login():
    return FileResponse("frontend/login.html")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
SECTIONS_DIR = os.path.join(BASE_DIR, "frontend", "static", "sections")

# IMPORTANT: mount sections FIRST
app.mount("/static/sections", StaticFiles(directory=SECTIONS_DIR), name="sections")

# Then mount the general static folder
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
