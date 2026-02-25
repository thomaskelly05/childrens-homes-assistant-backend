# auth.py
import os
import jwt
import bcrypt
import datetime
from fastapi import Depends, HTTPException, Header
from pydantic import BaseModel

SECRET_KEY = os.getenv("JWT_SECRET", "change-me-in-prod")
ALGORITHM = "HS256"

class CurrentUser(BaseModel):
    sub: str
    role: str

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_access_token(data: dict, expires_delta=None):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + (expires_delta or datetime.timedelta(days=7))
    to_encode.update({
        "exp": expire,
        "iat": datetime.datetime.utcnow(),
        "iss": "indicare-backend",
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(authorization: str = Header(None)) -> CurrentUser:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = authorization.replace("Bearer ", "").strip()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return CurrentUser(sub=payload["sub"], role=payload["role"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def require_role(*roles):
    def dependency(user: CurrentUser = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dependency
