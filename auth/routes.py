from fastapi import APIRouter, Form, Depends, HTTPException, Response
from fastapi.responses import JSONResponse
from auth.tokens import create_session_token
from db.connection import get_db

router = APIRouter()

@router.post("/login")
def login_post(
    email: str = Form(...),
    password: str = Form(...),
    response: Response,
    conn=Depends(get_db)
):
    with conn.cursor() as cur:
        cur.execute("SELECT id, email, password_hash, role FROM users WHERE email=%s", (email,))
        user = cur.fetchone()

    if not user:
        return JSONResponse({"success": False}, status_code=401)

    token = create_session_token(user["id"])
    role = user["role"]

    response.set_cookie(
        "session",
        token,
        httponly=True,
        secure=True,
        samesite="None",
        max_age=60*60*24*7
    )

    return JSONResponse({"success": True, "role": role})
