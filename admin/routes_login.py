from fastapi import APIRouter, Depends, HTTPException
from auth.dependencies import get_current_user

router = APIRouter()

@router.get("/admin")
def get_admin_identity(user = Depends(get_current_user)):
    """
    Returns the authenticated user's identity for the IndiCare dashboard.
    """

    # Allowed roles based on your actual system
    allowed_roles = ["manager", "ri", "staff"]

    if user["role"] not in allowed_roles:
        raise HTTPException(status_code=403, detail="Not authorised")

    # user already contains the full DB record from get_current_user
    return {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "home_id": user["home_id"],
        "archived": user["archived"],
        "created_at": user["created_at"],
        "updated_at": user["updated_at"]
    }
