from fastapi import APIRouter, Form, Depends, HTTPException, Response
from auth.tokens import create_session_token
from db.connection import get_db

router = APIRouter()

@router.get("/login")
def login_get():
    return login_page()

@router.post("/login")
def login_post(
    email: str = Form(...),
    password: str = Form(...),
    response: Response = None,
    conn=Depends(get_db)
):
    with conn.cursor() as cur:
        cur.execute("SELECT id, email, password_hash, role FROM users WHERE email=%s", (email,))
        user = cur.fetchone()

    if not user:
        raise HTTPException(401, "Invalid credentials")

    token = create_session_token(user["id"])
    role = user["role"]

    # Set cookie but DO NOT redirect
    response.set_cookie(
        "session",
        token,
        httponly=True,
        secure=True,
        samesite="None",
        max_age=60*60*24*7
    )

    # Return JSON so frontend can redirect safely
    return {"success": True, "role": role}
