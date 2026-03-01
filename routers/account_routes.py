from fastapi import APIRouter, Depends
from auth.dependencies import get_current_user

router = APIRouter(prefix="/account", tags=["Account"])

@router.get("/me")
def get_me(user = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "home_id": user["home_id"],
        "archived": user["archived"],
        "created_at": user["created_at"],
        "updated_at": user["updated_at"]
    }
