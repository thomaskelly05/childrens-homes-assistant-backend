from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles

# Create app FIRST
app = FastAPI(
    title="IndiCare Backend",
    description="Safe AI layer for staff practice, reflection, and operational clarity",
    version="1.0.0"
)

# Apply CORS immediately
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://indicare.co.uk",
        "https://www.indicare.co.uk",
        "https://indicarelimited.squarespace.com",
        "https://indicare.squarespace.com",
        "https://www.indicare.squarespace.com",
        "https://static1.squarespace.com",
        "https://static.squarespace.com",
        "https://assets.squarespace.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import staff‑only routers
from auth.routes_login import router as login_router
from auth.routes_admin import router as admin_router  # optional, if admin is staff-only
from routers.dashboard_routes import router as dashboard_router
from routers.assistant_routes import router as assistant_router
from routers.staff_journal_routes import router as staff_journal_router
from routers.handover_routes import router as handover_router
from routers.tasks_routes import router as tasks_router
from routers.account_routes import router as account_router

# Health check
@app.get("/health")
def health():
    return {"status": "ok"}

# robots.txt
@app.get("/robots.txt", response_class=PlainTextResponse)
def robots():
    return "User-agent: *\nDisallow: /admin"

# Mount staff‑only routes
app.include_router(login_router)
app.include_router(admin_router)          # optional
app.include_router(dashboard_router)
app.include_router(assistant_router, prefix="/api")
app.include_router(staff_journal_router)
app.include_router(handover_router)
app.include_router(tasks_router)
app.include_router(account_router)

# Serve the frontend at root
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
