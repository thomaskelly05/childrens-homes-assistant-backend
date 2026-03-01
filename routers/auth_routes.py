from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from db.connection import get_db
from auth.tokens import create_session_token
import bcrypt

router = APIRouter(prefix="/auth", tags=["Auth"])


# ---------------------------------------------------------
# LOGIN REQUEST MODEL
# ---------------------------------------------------------
class LoginRequest(BaseModel):
    email: str
    password: str


# ---------------------------------------------------------
# LOGIN ROUTE
# ---------------------------------------------------------
@router.post("/login")
def login(payload: LoginRequest, conn = Depends(get_db)):
    # Fetch user from DB
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, email, password_hash, role, home_id, archived, created_at, updated_at
            FROM users
            WHERE email = %s
        """, (payload.email,))
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Check password
    if not bcrypt.checkpw(payload.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create JWT
    token = create_session_token(user["id"], user["role"])

    # Return JSONResponse so cookie is preserved
    response = JSONResponse({"message": "Logged in"})

    # Cookie settings that work on:
    # - Render free-tier (secure=False)
    # - Android Chrome (SameSite=None)
    # - Desktop browsers
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="none",
        path="/"
    )

    return response


# ---------------------------------------------------------
# LOGOUT ROUTE
# ---------------------------------------------------------
@router.post("/logout")
def logout():
    response = JSONResponse({"message": "Logged out"})
    response.delete_cookie("access_token", path="/")
    return response
