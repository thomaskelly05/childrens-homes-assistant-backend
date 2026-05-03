from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from services.inspection_os_service import InspectionOSService

router = APIRouter(prefix="/inspection-os", tags=["inspection-os"])

@router.get("/me")
def my_operating_brief(current_user: dict = Depends(get_current_user)):
    return {"ok": True, "data": InspectionOSService().my_operating_brief(current_user=current_user)}

@router.get("/home/{home_id}")
def home_operating_brief(home_id: int, current_user: dict = Depends(get_current_user)):
    return {"ok": True, "data": InspectionOSService().home_operating_brief(home_id=home_id, current_user=current_user)}

@router.get("/child/{young_person_id}")
def child_operating_brief(young_person_id: int, current_user: dict = Depends(get_current_user)):
    return {"ok": True, "data": InspectionOSService().child_operating_brief(young_person_id=young_person_id, current_user=current_user)}
