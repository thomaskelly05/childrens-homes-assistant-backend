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
            SELECT id, email, password_hash, role, home_id
            FROM users
            WHERE email = %s
            """,
            (payload.email,),
        )

        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    password_hash = user["password_hash"]

    if isinstance(password_hash, str):
        password_hash = password_hash.encode()

    if not bcrypt.checkpw(
        payload.password.encode(),
        password_hash
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_session_token(
        user["id"],
        user["email"],
        user["role"],
        user.get("home_id")
    )

    response = JSONResponse({
        "message": "Logged in",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "home_id": user.get("home_id")
        }
    })

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=86400
    )

    return response


@router.post("/logout")
def logout():

    response = JSONResponse({"message": "Logged out"})

    response.delete_cookie(
        key="access_token",
        path="/"
    )

    return response
