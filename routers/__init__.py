from fastapi import APIRouter

from .assistant_routes import router as operational_assistant_router
from .young_people_assistant_routes import router as young_people_assistant_router

api_router = APIRouter()

api_router.include_router(operational_assistant_router)
api_router.include_router(young_people_assistant_router)
