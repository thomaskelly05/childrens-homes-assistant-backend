from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel
import bcrypt
import jwt
from psycopg2.extras import RealDictCursor

from db.connection import get_db
from auth.tokens import create_session_token, JWT_SECRET, JWT_ALGORITHM


router = APIRouter(prefix="/auth", tags=["Auth"])


# -----------------------------
# LOGIN MODEL
# -----------------------------
class LoginRequest(BaseModel):
    email: str
    password: str


# -----------------------------
# LOGIN
# -----------------------------
@router.post("/login")
def login(payload: LoginRequest, response: Response, conn=Depends(get_db)):

    # Use RealDictCursor so we can access fields by name
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

    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check password
    if not bcrypt.checkpw(
        payload.password.encode("utf-8"),
        user["password_hash"].encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create session token
    token = create_session_token(
        user["id"],
        user["email"],
        user["role"],
        user["home_id"]
    )

    # Set cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,       # required for HTTPS
        samesite="none",   # required for cross-site cookies
        path="/"
    )

    return {
        "message": "Logged in",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"]
        }
    }


# -----------------------------
# LOGOUT
# -----------------------------
@router.post("/logout")
def logout(response: Response):

    response.delete_cookie(
        key="access_token",
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
