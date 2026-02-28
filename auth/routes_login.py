from fastapi import APIRouter, Depends, HTTPException, Response
from datetime import datetime, timedelta, timezone
from jose import jwt
from db.connection import get_db
from auth.dependencies import JWT_SECRET, JWT_ALGORITHM
from pydantic import BaseModel
import bcrypt

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/log-in")
@router.post("/login")
def login(data: LoginRequest, response: Response, conn = Depends(get_db)):
    email = data.email
    password = data.password

    with conn.cursor() as cur:
        cur.execute("""
            SELECT 
                id,
                email,
                password_hash,
                role,
                home_id,
                archived,
                created_at,
                updated_at
            FROM users
            WHERE email = %s
        """, (email,))
        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        expiry = datetime.now(timezone.utc) + timedelta(hours=12)

        payload = {
            "sub": user["id"],
            "role": user["role"],
            "exp": int(expiry.timestamp())
        }

        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        # 🔥 THE FIX: Explicit cookie domain so the browser stores it
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=60 * 60 * 12,
            path="/",
            domain="childrens-homes-assistant-backend-new.onrender.com"
        )

        return {
            "message": "Logged in successfully",
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "home_id": user["home_id"],
            "archived": user["archived"],
            "created_at": user["created_at"],
            "updated_at": user["updated_at"]
        }
