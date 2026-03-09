from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel
import bcrypt
import jwt
from psycopg2.extras import RealDictCursor

from db.connection import get_db
from auth.tokens import create_session_token


router = APIRouter(prefix="/auth", tags=["Auth"])


# ---------------------------------------------------------
# LOGIN MODEL
# ---------------------------------------------------------

class LoginRequest(BaseModel):
    email: str
    password: str


# ---------------------------------------------------------
# LOGIN
# ---------------------------------------------------------

@router.post("/login")
def login(payload: LoginRequest, response: Response, conn=Depends(get_db)):

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
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
        raise HTTPException(status_code=401, detail="Invalid email or password")

    password_hash = user.get("password_hash")

    if isinstance(password_hash, str):
        password_hash = password_hash.encode("utf-8")

    if not bcrypt.checkpw(payload.password.encode("utf-8"), password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

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

    return {
        "message": "Logged in",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "home_id": user["home_id"]
        }
    }


# ---------------------------------------------------------
# LOGOUT
# ---------------------------------------------------------

@router.post("/logout")
def logout(response: Response):

    response.delete_cookie(
        key="access_token",
        path="/"
    )

    return {"message": "Logged out"}


# ---------------------------------------------------------
# AUTH CHECK
# ---------------------------------------------------------

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


# ---------------------------------------------------------
# CURRENT USER
# ---------------------------------------------------------

@router.get("/me")
def get_current_user(request: Request):

    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )

        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role"),
            "home_id": payload.get("home_id")
        }

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")
