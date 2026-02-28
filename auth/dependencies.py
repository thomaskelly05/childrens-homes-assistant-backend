from fastapi import Depends, HTTPException, Request
from jose import jwt, JWTError
from datetime import datetime, timezone
from db.connection import get_db

# Your JWT secret + algorithm
JWT_SECRET = "your_jwt_secret_here"
JWT_ALGORITHM = "HS256"


def get_current_user(request: Request, conn = Depends(get_db)):
    """
    Extracts and validates the JWT from the secure cookie.
    Returns the user record from the database.
    """

    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    role = payload.get("role")
    exp = payload.get("exp")

    if not user_id or not role:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Check expiry
    if exp and datetime.now(timezone.utc).timestamp() > exp:
        raise HTTPException(status_code=401, detail="Token expired")

    # Fetch user from DB
    with conn.cursor() as cur:
        cur.execute("""
            SELECT 
                id,
                username,
                full_name,
                role
            FROM users
            WHERE id = %s
        """, (user_id,))
        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return user


def require_role(allowed_roles: list):
    """
    Dependency factory.
    Ensures the authenticated user has one of the allowed roles.
    """

    def role_checker(user = Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Not authorised")
        return user

    return role_checker
