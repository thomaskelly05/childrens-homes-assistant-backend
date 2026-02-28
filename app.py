from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import your route modules
from auth.routes_login import router as login_router
from auth.routes_admin import router as admin_router
from providers.routes import router as providers_router
from homes.routes import router as homes_router
from staff.routes import router as staff_router

app = FastAPI(
    title="IndiCare Backend",
    description="Safe AI layer for children's homes",
    version="1.0.0"
)

# CORS for Squarespace + your live domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://indicare.co.uk",
        "https://www.indicare.co.uk",
        "https://indicarelimited.squarespace.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check for Render
@app.get("/health")
def health():
    return {"status": "ok"}

# Mount routes
app.include_router(login_router, prefix="")
app.include_router(admin_router, prefix="")
app.include_router(providers_router, prefix="")
app.include_router(homes_router, prefix="")
app.include_router(staff_router, prefix="")

@app.get("/")
def root():
    return {"message": "IndiCare backend running"}
