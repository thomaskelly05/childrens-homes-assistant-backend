from fastapi import APIRouter, Depends

from auth.current_user import get_current_user
from services.staff_profile_service import StaffProfileService


router = APIRouter(prefix="/staff", tags=["staff-profile"])


def my_profile(current_user: dict = Depends(get_current_user)):
    service = StaffProfileService()
    return {"ok": True, "data": service.get_my_profile(current_user=current_user)}


@router.get("/home/{home_id}")
def home_staff(home_id: int, current_user: dict = Depends(get_current_user)):
    service = StaffProfileService()
    return {"ok": True, "data": service.list_home_staff_profiles(home_id=home_id, current_user=current_user)}


@router.get("/{staff_user_id}")
def staff_profile(staff_user_id: int, current_user: dict = Depends(get_current_user)):
    service = StaffProfileService()
    return {"ok": True, "data": service.get_staff_profile(staff_user_id=staff_user_id, current_user=current_user)}
