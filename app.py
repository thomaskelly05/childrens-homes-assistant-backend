from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# -------------------------------------------------------------------
# ROUTERS (must match your actual filenames)
# -------------------------------------------------------------------
from routers.auth_routes import router as auth_router
from routers.staff_journal_routes import router as journal_router
from routers.handover_routes import router as handover_router
from routers.tasks_routes import router as tasks_router
from routers.account_routes import router as account_router
from routers.assistant_routes import router as assistant_router
from routers.dashboard_routes import router as dashboard_router

app = FastAPI(title="IndiCare Staff Backend")

# -------------------------------------------------------------------
# CORS (required for cookies)
# -------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------
# API ROUTERS
# -------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(journal_router)
app.include_router(handover_router)
app.include_router(tasks_router)
app.include_router(account_router)
app.include_router(assistant_router)
app.include_router(dashboard_router)

# -------------------------------------------------------------------
# ROOT ROUTES (served BEFORE static files)
# -------------------------------------------------------------------
@app.get("/")
def serve_dashboard():
    return FileResponse("frontend/index.html")

@app.get("/login.html")
def serve_login():
    return FileResponse("frontend/login.html")

# -------------------------------------------------------------------
# STATIC FILES (mounted LAST so they don't override API routes)
# -------------------------------------------------------------------
app.mount("/", StaticFiles(directory="frontend", html=False), name="static")
