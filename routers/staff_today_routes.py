from fastapi import APIRouter, Depends

from auth.current_user import get_current_user
from services.staff_today_service import StaffTodayService

router = APIRouter(prefix="/staff-today", tags=["staff-today"])

@router.get("/me")
def my_today(current_user: dict = Depends(get_current_user)):
    service = StaffTodayService()
    return {"ok": True, "data": service.get_my_today(current_user=current_user)}

@router.get("/{staff_user_id}")
def staff_today(staff_user_id: int, current_user: dict = Depends(get_current_user)):
    service = StaffTodayService()
    return {"ok": True, "data": service.get_staff_today(staff_user_id=staff_user_id, current_user=current_user)}
