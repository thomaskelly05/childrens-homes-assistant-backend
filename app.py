import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

# routers
from assistant.routes import router as assistant_router
from auth.routes import router as auth_router

# ---------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------

app = FastAPI()

# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.indicare.co.uk",
        "https://indicare.co.uk",
        "https://childrens-homes-assistant-backend-new.onrender.com",
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

app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

# ---------------------------------------------------------
# LOCAL DEV
# ---------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=10000, reload=True)
