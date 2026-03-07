import os
import uvicorn

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


# ---------------------------
# ROUTERS
# ---------------------------

from auth.routes import router as auth_router

from routers.chat_routes import router as chat_router
from routers.conversation_routes import router as conversation_router

from routers.tasks_routes import router as tasks_router
from routers.staff_journal_routes import router as journal_router
from routers.handover_routes import router as handover_router

from routers.reports_routes import router as reports_router
from routers.documents_routes import router as documents_router

from routers.dashboard_routes import router as dashboard_router
from routers.account_routes import router as account_router


APP_NAME = "IndiCare Assistant API"
VERSION = "1.3"

PORT = int(os.environ.get("PORT", 10000))


# ---------------------------
# CORS SETTINGS
# ---------------------------

ALLOWED_ORIGINS = [
    "https://indicare.co.uk",
    "https://www.indicare.co.uk",

    "https://childrens-homes-assistant-backend.onrender.com",
    "https://childrens-homes-assistant-backend-new.onrender.com",

    "http://localhost:3000",
    "http://localhost:5173",
]


app = FastAPI(
    title=APP_NAME,
    version=VERSION,
    docs_url="/docs",
    redoc_url=None
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------
# ROUTERS
# ---------------------------

app.include_router(auth_router)

# Chat system
app.include_router(chat_router)

# Conversation utilities
app.include_router(conversation_router)

# Core platform features
app.include_router(tasks_router)
app.include_router(journal_router)
app.include_router(handover_router)

app.include_router(reports_router)
app.include_router(documents_router)

app.include_router(dashboard_router)
app.include_router(account_router)


# ---------------------------
# HEALTH CHECK
# ---------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": APP_NAME,
        "version": VERSION
    }


@app.get("/")
def root():
    return {
        "message": "IndiCare API running"
    }


# ---------------------------
# OPTIONAL FRONTEND HOSTING
# ---------------------------

FRONTEND_DIR = "frontend"

if os.path.isdir(FRONTEND_DIR):

    app.mount(
        "/",
        StaticFiles(directory=FRONTEND_DIR, html=True),
        name="frontend"
    )


# ---------------------------
# LOCAL DEVELOPMENT
# ---------------------------

if __name__ == "__main__":

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=PORT,
        reload=True
    )
