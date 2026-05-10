from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from services.inspection_os_service import InspectionOSService

router = APIRouter(prefix="/inspection-os", tags=["inspection-os"])


def _safe_data(scope: str, error: Exception | None = None):
    return {
        "generated_at": None,
        "scope": scope,
        "shift_safety": {"status": "unavailable", "warnings": []},
        "enforcement": {"status": "unavailable", "gates": []},
        "responsibility": {},
        "child_voice": {"items": [], "count": 0, "status": "not_loaded"},
        "safeguarding_story": {"stories": [], "gap_count": 0, "status": "not_loaded"},
        "consistency": {"warnings": [], "status": "not_loaded"},
        "leadership_oversight": {"recent_reviews": [], "review_count": 0, "status": "not_loaded"},
        "error": str(error) if error else None,
    }


@router.get("/me")
def my_operating_brief(current_user: dict = Depends(get_current_user)):
    try:
        return {"ok": True, "data": InspectionOSService().my_operating_brief(current_user=current_user)}
    except Exception as exc:
        return {"ok": True, "data": _safe_data("me", exc)}


@router.get("/home/{home_id}")
def home_operating_brief(home_id: int, current_user: dict = Depends(get_current_user)):
    try:
        return {"ok": True, "data": InspectionOSService().home_operating_brief(home_id=home_id, current_user=current_user)}
    except Exception as exc:
        data = _safe_data("home", exc)
        data["home_id"] = home_id
        return {"ok": True, "data": data}


@router.get("/child/{young_person_id}")
def child_operating_brief(young_person_id: int, current_user: dict = Depends(get_current_user)):
    try:
        return {"ok": True, "data": InspectionOSService().child_operating_brief(young_person_id=young_person_id, current_user=current_user)}
    except Exception as exc:
        data = _safe_data("child", exc)
        data["young_person_id"] = young_person_id
        return {"ok": True, "data": data}
