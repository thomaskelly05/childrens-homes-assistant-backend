from fastapi import APIRouter, Request, HTTPException

router = APIRouter(prefix="/admin")


@router.get("/users")
async def list_users(request: Request):

    user = request.session.get("user")

    if not user or user["role"] != "admin":
        raise HTTPException(status_code=403)

    return [
        {"name": "Admin User", "email": "admin@indicare.co.uk", "role": "admin"},
        {"name": "Staff Member", "email": "staff@indicare.co.uk", "role": "staff"}
    ]
