from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Existing route modules
from auth.routes_login import router as login_router
from auth.routes_admin import router as admin_router
from providers.routes import router as providers_router
from homes.routes import router as homes_router
from staff.routes import router as staff_router

# NEW — Assistant router
from assistant.routes import router as assistant_router

app = FastAPI(
    title="IndiCare Backend",
    description="Safe AI layer for children's homes",
    version="1.0.0"
)

# CORS for Squarespace + IndiCare domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://indicare.co.uk",
        "https://www.indicare.co.uk",
        "https://indicarelimited.squarespace.com",
        "https://static1.squarespace.com",
        "https://static.squarespace.com",
        "https://assets.squarespace.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check for Render
@app.get("/health")
def health():
    return {"status": "ok"}

# Mount existing routes
app.include_router(login_router, prefix="")
app.include_router(admin_router, prefix="")
app.include_router(providers_router, prefix="")
app.include_router(homes_router, prefix="")
app.include_router(staff_router, prefix="")

# Mount assistant routes under /api
app.include_router(assistant_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "IndiCare backend running"}
