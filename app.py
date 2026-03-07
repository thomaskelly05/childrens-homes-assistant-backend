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


# ---------------------------------------------------------
# APP
# ---------------------------------------------------------

app = FastAPI(
    title="IndiCare Assistant API",
    version="1.0",
    docs_url="/docs",
    redoc_url=None
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://indicare.co.uk",
        "https://www.indicare.co.uk",

        # Render backends
        "https://childrens-homes-assistant-backend.onrender.com",
        "https://childrens-homes-assistant-backend-new.onrender.com",

        # Local development
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# ROUTERS
# ---------------------------------------------------------

# Authentication
app.include_router(auth_router)

# AI Assistant
app.include_router(assistant_router)

# Core system
app.include_router(tasks_router)
app.include_router(journal_router)
app.include_router(handover_router)

# Manager features
app.include_router(dashboard_router)

# User account
app.include_router(account_router)

# Conversation memory
app.include_router(conversation_router)


# ---------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"service": "IndiCare API running"}


# ---------------------------------------------------------
# STATIC FRONTEND (optional)
# ---------------------------------------------------------

if os.path.isdir("frontend"):
    app.mount(
        "/",
        StaticFiles(directory="frontend", html=True),
        name="frontend"
    )


# ---------------------------------------------------------
# LOCAL DEVELOPMENT
# ---------------------------------------------------------

if __name__ == "__main__":

    port = int(os.environ.get("PORT", 10000))

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
