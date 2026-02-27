from fastapi import APIRouter, Form, Depends, HTTPException
from fastapi.responses import RedirectResponse
from auth.pages import login_page
from auth.tokens import create_session_token
from db.connection import get_db

router = APIRouter()

@router.get("/login")
def login_get():
    return login_page()

@router.post("/login")
def login_post(email: str = Form(...), password: str = Form(...), conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute("SELECT id, email, password_hash, role FROM users WHERE email=%s", (email,))
        user = cur.fetchone()

    if not user:
        raise HTTPException(401, "Invalid credentials")

    # TODO: verify password
    # if not verify_password(password, user["password_hash"]):
    #     raise HTTPException(401, "Invalid credentials")

    token = create_session_token(user["id"])

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
