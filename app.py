from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles

# Create app FIRST
app = FastAPI(
    title="IndiCare Backend",
    description="Safe AI layer for children's homes",
    version="1.0.0"
)

# Apply CORS IMMEDIATELY after app creation
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

# Import routers AFTER CORS is set
from auth.routes_login import router as login_router
from auth.routes_admin import router as admin_router
from providers.routes import router as providers_router
from homes.routes import router as homes_router
from staff.routes import router as staff_router
from assistant.routes import router as assistant_router
from routers.staff_journal_routes import router as staff_journal_router

app.include_router(staff_journal_router)

# Health check
@app.get("/health")
def health():
    return {"status": "ok"}

# robots.txt (Googlebot will stop probing /admin)
@app.get("/robots.txt", response_class=PlainTextResponse)
def robots():
    return "User-agent: *\nDisallow: /admin"

# Mount routes
app.include_router(login_router, prefix="")
app.include_router(admin_router, prefix="")
app.include_router(providers_router, prefix="")
app.include_router(homes_router, prefix="")
app.include_router(staff_router, prefix="")
app.include_router(assistant_router, prefix="/api")

# 🔥 Serve the frontend folder at the root URL
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
