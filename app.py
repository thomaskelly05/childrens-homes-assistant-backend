import os
import uvicorn

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Routers
from assistant.routes import router as assistant_router
from auth.routes import router as auth_router


# ---------------------------------------------------------
# APP
# ---------------------------------------------------------

app = FastAPI(
    title="IndiCare Assistant API",
    version="1.0"
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://indicare.co.uk",
        "https://www.indicare.co.uk",

        # Backend (Render)
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

app.include_router(auth_router)
app.include_router(assistant_router)


# ---------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------
# STATIC FRONTEND
# ---------------------------------------------------------

# Only mount frontend if the folder exists
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
