from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from db.connection import get_db
from auth.tokens import create_session_token
import bcrypt

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(payload: LoginRequest, conn=Depends(get_db)):

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, email, password_hash, role
            FROM users
            WHERE email = %s
            """,
            (payload.email,),
        )

        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not bcrypt.checkpw(
        payload.password.encode(),
        user["password_hash"].encode()
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_session_token(user["id"], user["role"])

    response = JSONResponse({"message": "Logged in"})

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        domain=".indicare.co.uk"   # IMPORTANT
    )

    return response


@router.post("/logout")
def logout():

    response = JSONResponse({"message": "Logged out"})

    response.delete_cookie(
        "access_token",
        path="/",
        domain=".indicare.co.uk"
    )

    return response
