import jwt
import os
from datetime import datetime, timedelta, timezone

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"

def create_session_token(user_id: int, email: str, role: str, home_id: int):

    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "home_id": home_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
