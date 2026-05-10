from fastapi import APIRouter, Depends

from auth.current_user import get_current_user
from services.academy_intelligence_service import AcademyIntelligenceService


router = APIRouter(prefix="/academy/intelligence", tags=["academy-intelligence"])


@router.get("/me")
def my_intelligence(current_user: dict = Depends(get_current_user)):
    service = AcademyIntelligenceService()
    return {"ok": True, "data": service.get_my_intelligence(current_user=current_user)}


@router.get("/user/{user_id}")
def user_intelligence(user_id: int, current_user: dict = Depends(get_current_user)):
    service = AcademyIntelligenceService()
    return {"ok": True, "data": service.get_user_intelligence(user_id=user_id, current_user=current_user)}


@router.get("/home/{home_id}")
def home_intelligence(home_id: int, current_user: dict = Depends(get_current_user)):
    service = AcademyIntelligenceService()
    return {"ok": True, "data": service.get_home_intelligence(home_id=home_id, current_user=current_user)}


@router.post("/user/{user_id}/assign-recommendations")
def assign_recommendations(user_id: int, current_user: dict = Depends(get_current_user)):
    service = AcademyIntelligenceService()
    return {"ok": True, "data": service.assign_recommendations(user_id=user_id, current_user=current_user)}
