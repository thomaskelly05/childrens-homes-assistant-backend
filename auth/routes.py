from fastapi import APIRouter, Form, Depends, HTTPException, Response
from fastapi.responses import JSONResponse
from auth.tokens import create_session_token
from db.connection import get_db

# Router MUST be defined before any @router decorators
router = APIRouter()

@router.post("/login")
def login_post(
    response: Response,
    email: str = Form(...),
    password: str = Form(...),
    conn=Depends(get_db)
):
    # Debug logging (optional but helpful)
    print("DEBUG: login_post called with", email)

    with conn.cursor() as cur:
        print("DEBUG: DB cursor opened")
        cur.execute(
            "SELECT id, email, password_hash, role FROM users WHERE email=%s",
            (email,)
        )
        user = cur.fetchone()
        print("DEBUG: DB query result:", user)

    if not user:
        print("DEBUG: user not found")
        return JSONResponse({"success": False}, status_code=401)

    # If your DB returns tuples instead of dicts, fix here:
    # id = user[0]
    # role = user[3]
    # Otherwise, if using DictCursor:
    id = user["id"]
    role = user["role"]

    print("DEBUG: token creation starting")
    token = create_session_token(id)
    print("DEBUG: token created")

    # Set session cookie
    response.set_cookie(
        "session",
        token,
        httponly=True,
        secure=True,
        samesite="None",
        max_age=60 * 60 * 24 * 7
    )

    print("DEBUG: cookie set successfully")

    return JSONResponse({"success": True, "role": role})
