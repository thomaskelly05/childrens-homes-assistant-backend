from fastapi import APIRouter, Depends, HTTPException, Response
from datetime import datetime, timedelta, timezone
from jose import jwt
from db.connection import get_db
from auth.dependencies import JWT_SECRET, JWT_ALGORITHM
import bcrypt

router = APIRouter()

@router.post("/log-in")
def login(response: Response, username: str, password: str, conn = Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT 
                id,
                username,
                full_name,
                password_hash,
                role
            FROM users
            WHERE username = %s
        """, (username,))
        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")

        if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
            raise HTTPException(status_code=401, detail="Invalid username or password")

        expiry = datetime.now(timezone.utc) + timedelta(hours=12)

        payload = {
            "sub": user["id"],
            "role": user["role"],
            "exp": int(expiry.timestamp())
        }

        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=60 * 60 * 12,
            path="/"
        )

        return {
            "message": "Logged in successfully",
            "id": user["id"],
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"]
        }


@router.post("/log-out")
def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        path="/"
    )
    return {"message": "Logged out successfully"}
