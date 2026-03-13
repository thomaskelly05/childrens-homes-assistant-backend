from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel
import bcrypt
import jwt
from psycopg2.extras import RealDictCursor

from db.connection import get_db
from auth.tokens import create_session_token, JWT_SECRET, JWT_ALGORITHM


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
            SELECT id, email, password_hash, role, home_id, first_name, last_name
            FROM users
            WHERE email = %s
            """,
            (payload.email,)
        )

        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    password_hash = user["password_hash"]

    if isinstance(password_hash, str):
        password_hash = password_hash.encode()

    if not bcrypt.checkpw(payload.password.encode(), password_hash):
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
        path="/",
        max_age=86400
    )

    return {
        "message": "Logged in",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "home_id": user["home_id"],
            "first_name": user.get("first_name"),
            "last_name": user.get("last_name")
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
            "role": payload.get("role")
        }

    except Exception:
        return {"authenticated": False}


# ---------------------------------------------------------
# CURRENT USER
# ---------------------------------------------------------

@router.get("/me")
def get_current_user(request: Request, conn=Depends(get_db)):

    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid session")

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            raise HTTPException(status_code=401, detail="Invalid session")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    u.id,
                    u.email,
                    u.role,
                    u.home_id,
                    u.first_name,
                    u.last_name,
                    u.archived,
                    u.updated_at,
                    u.created_at,
                    h.name AS home_name
                FROM users u
                LEFT JOIN homes h
                    ON h.id = u.home_id
                WHERE u.id = %s
                LIMIT 1
                """,
                (user_id,)
            )
            user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        if user.get("archived") is True:
            raise HTTPException(status_code=403, detail="User is archived")

        return dict(user)

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")
