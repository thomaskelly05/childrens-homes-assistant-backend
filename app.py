from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Routers
from routers.auth_routes import router as auth_router
from routers.staff_journal_routes import router as journal_router
from routers.handover_routes import router as handover_router
from routers.tasks_routes import router as tasks_router
from routers.account_routes import router as account_router
from routers.assistant_routes import router as assistant_router
from routers.dashboard_routes import router as dashboard_router

app = FastAPI(title="IndiCare Staff Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API ROUTERS (must come BEFORE static files)
app.include_router(auth_router)
app.include_router(journal_router)
app.include_router(handover_router)
app.include_router(tasks_router)
app.include_router(account_router)
app.include_router(assistant_router)
app.include_router(dashboard_router)

# HTML ROUTES
@app.get("/")
def serve_dashboard():
    return FileResponse("frontend/index.html")

@app.get("/login.html")
def serve_login():
    return FileResponse("frontend/login.html")

# STATIC FILES (mounted at /static, NOT at /)
app.mount("/static", StaticFiles(directory="frontend"), name="static")
