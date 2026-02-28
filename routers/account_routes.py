from fastapi import APIRouter, Depends, Response
from db.connection import get_db
from auth.dependencies import get_current_user

router = APIRouter(prefix="/account", tags=["Account"])

@router.get("/me")
def get_me(user = Depends(get_current_user)):
    return user

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token", path="/", domain="indicare.co.uk")
    return {"message": "Logged out"}
