from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from db.connection import get_db
from auth.tokens import create_session_token
import bcrypt
import json

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(payload: LoginRequest, response: Response, conn = Depends(get_db)):
    # Fetch user
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, email, password_hash, role
            FROM users
            WHERE email = %s
        """, (payload.email,))
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Password check
    if not bcrypt.checkpw(payload.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create JWT
    token = create_session_token(user["id"], user["role"])

    # Set cookie (secure=False required on Render free tier)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,      # ← REQUIRED for Render free-tier
        samesite="lax",
        path="/"
    )

    # Return the SAME response object so the cookie is preserved
    response.status_code = 200
    response.media_type = "application/json"
    response.body = json.dumps({"message": "Logged in"}).encode()

    return response


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out"}
