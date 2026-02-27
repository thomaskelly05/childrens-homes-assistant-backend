# app/auth/routes.py
from fastapi import APIRouter, Form, Depends
from fastapi.responses import RedirectResponse
from .pages import login_page
from .tokens import create_session_token
from ..db.connection import get_db

router = APIRouter()

@router.get("/login")
def login_get():
    return login_page()

@router.post("/login")
def login_post(email: str = Form(...), password: str = Form(...), conn=Depends(get_db)):
    user = authenticate_user(conn, email, password)
    if not user:
        raise HTTPException(401, "Invalid credentials")

    token = create_session_token(user["id"])

    # Role-based redirect
    role = user["role"]
    if role == "provider_admin":
        target = "/admin"
    elif role in ("regional_manager", "registered_manager"):
        target = "/manager"
    else:
        target = "/staff"

    response = RedirectResponse(target, status_code=302)
    response.set_cookie("session", token, httponly=True, secure=True, samesite="None")
    return response
