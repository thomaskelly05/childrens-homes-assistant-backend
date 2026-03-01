from fastapi import Depends, HTTPException, Request
from jose import jwt, JWTError
from datetime import datetime, timezone
from db.connection import get_db
from auth.tokens import JWT_SECRET, JWT_ALGORITHM

def verify_jwt(request: Request):
    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_current_user(request: Request, conn = Depends(get_db)):
    payload = verify_jwt(request)

    user_id = payload.get("sub")
    role = payload.get("role")
    exp = payload.get("exp")

    if not user_id or not role:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    if exp and datetime.now(timezone.utc).timestamp() > exp:
        raise HTTPException(status_code=401, detail="Token expired")

    with conn.cursor() as cur:
        cur.execute("""
            SELECT 
                id,
                email,
                full_name,
                role,
                home_id,
                archived,
                created_at,
                updated_at
            FROM users
            WHERE id = %s
        """, (user_id,))
        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return user

def require_role(allowed_roles: list):
    def role_checker(user = Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Not authorised")
        return user
    return role_checker
