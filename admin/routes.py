from fastapi import APIRouter, Depends
from auth.dependencies import require_role

router = APIRouter()

@router.get("/admin")
def admin_dashboard(user = Depends(require_role(["provider_admin", "regional_manager"]))):
    return {
        "username": user["email"],
        "role": user["role"]
    }
