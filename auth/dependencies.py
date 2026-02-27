import jwt
from fastapi import Depends, HTTPException, Cookie
from fastapi.responses import RedirectResponse
from db.connection import get_db

SECRET = "your-secret-key"

def get_current_user(session: str = Cookie(None), conn=Depends(get_db)):
    if not session:
        raise HTTPException(401, "Missing session cookie")

    try:
        payload = jwt.decode(session, SECRET, algorithms=["HS256"])
    except:
        raise HTTPException(401, "Invalid session")

    user_id = payload["sub"]

    with conn.cursor() as cur:
        cur.execute("SELECT id, email, role FROM users WHERE id=%s", (user_id,))
        user = cur.fetchone()

    if not user:
        raise HTTPException(401, "User not found")

    return user


def require_role(roles: list[str]):
    def wrapper(user = Depends(get_current_user)):
        if user["role"] not in roles:
            return RedirectResponse("/login")
        return user
    return wrapper
