from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from db.connection import get_db
from auth.jwt import create_access_token
import bcrypt

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(payload: LoginRequest, response: Response, conn = Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute("SELECT id, email, password_hash FROM staff WHERE email = %s", (payload.email,))
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not bcrypt.checkpw(payload.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"id": user["id"], "email": user["email"]})

    # Set cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/"
    )

    return {"message": "Logged in"}
