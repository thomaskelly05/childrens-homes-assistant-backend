from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel
import bcrypt
import jwt

from db.connection import get_db
from auth.tokens import create_session_token, JWT_SECRET, JWT_ALGORITHM


router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


# -----------------------------
# LOGIN
# -----------------------------
@router.post("/login")
def login(payload: LoginRequest, response: Response, conn=Depends(get_db)):

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, email, password_hash, role, home_id
            FROM users
            WHERE email = %s
            """,
            (payload.email,)
        )

        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not bcrypt.checkpw(
        payload.password.encode(),
        user["password_hash"].encode()
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_session_token(
        user["id"],
        user["email"],
        user["role"],
        user["home_id"]
    )

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/"
    )

    return {"message": "Logged in"}


# -----------------------------
# LOGOUT
# -----------------------------
@router.post("/logout")
def logout(response: Response):

    response.delete_cookie(
        "access_token",
        path="/"
    )

    return {"message": "Logged out"}


# -----------------------------
# AUTH CHECK
# -----------------------------
@router.get("/check")
def check_auth(request: Request):

    token = request.cookies.get("access_token")

    if not token:
        return {"authenticated": False}

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )

        return {
            "authenticated": True,
            "user_id": payload.get("sub"),
            "role": payload.get("role"),
        }

    except Exception:
        return {"authenticated": False}
