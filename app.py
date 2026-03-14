import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from routers.account_routes import router as account_router
from routers.auth_routes import router as auth_router
from routers.chat_routes import router as chat_router
from routers.documents_routes import router as documents_router
from routers.handover_routes import router as handover_router
from routers.reports_routes import router as reports_router
from routers.staff_journal_routes import router as staff_journal_router
from routers.supervision_routes import router as supervision_router
from routers.tasks_routes import router as tasks_router

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
CSS_DIR = os.path.join(FRONTEND_DIR, "css")
JS_DIR = os.path.join(FRONTEND_DIR, "js")
ASSETS_DIR = os.path.join(FRONTEND_DIR, "assets")

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
app.include_router(chat_router)
app.include_router(documents_router)
app.include_router(handover_router)
app.include_router(reports_router)
app.include_router(staff_journal_router)
app.include_router(supervision_router)
app.include_router(tasks_router)

app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


@app.get("/")
def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/login")
def serve_login():
    return FileResponse(os.path.join(FRONTEND_DIR, "login.html"))


@app.get("/health")
def health():
    return {"ok": True}
