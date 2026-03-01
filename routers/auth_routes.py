from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from db.connection import get_db
from auth.tokens import create_session_token
import bcrypt

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(payload: LoginRequest, response: Response, conn = Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, email, password_hash, role
            FROM users
            WHERE email = %s
        """, (payload.email,))
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not bcrypt.checkpw(payload.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_session_token(user["id"], user["role"])

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/"
    )

    return {"message": "Logged in"}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out"}
