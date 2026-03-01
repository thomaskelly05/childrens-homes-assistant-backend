from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Routers
from routers.auth_routes import router as auth_router
from routers.journal_routes import router as journal_router
from routers.handover_routes import router as handover_router
from routers.tasks_routes import router as tasks_router
from routers.account_routes import router as account_router

app = FastAPI(title="IndiCare Staff Backend")

# -------------------------------------------------------------------
# CORS (required for cookies + frontend on same domain)
# -------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # If you want to restrict later, use your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------
# STATIC FRONTEND
# -------------------------------------------------------------------
# Serve everything inside /frontend as static files
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")


# -------------------------------------------------------------------
# ROUTERS
# -------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(journal_router)
app.include_router(handover_router)
app.include_router(tasks_router)
app.include_router(account_router)


# -------------------------------------------------------------------
# ROOT ROUTE (serves dashboard)
# -------------------------------------------------------------------
@app.get("/")
def serve_dashboard():
    return FileResponse("frontend/index.html")


# -------------------------------------------------------------------
# LOGIN PAGE
# -------------------------------------------------------------------
@app.get("/login.html")
def serve_login():
    return FileResponse("frontend/login.html")
