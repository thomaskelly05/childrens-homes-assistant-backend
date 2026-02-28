from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth.routes import router as auth_router
from providers.routes import router as providers_router
from homes.routes import router as homes_router
from staff.routes import router as staff_router
from admin.routes import router as admin_router

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.indicare.co.uk",
        "https://indicare.co.uk",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(providers_router)
app.include_router(homes_router)
app.include_router(staff_router)
app.include_router(admin_router)
