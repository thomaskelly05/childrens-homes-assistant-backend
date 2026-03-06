import jwt
import os
from datetime import datetime, timedelta

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key")
JWT_ALGORITHM = "HS256"


def create_session_token(user_id, email, role, home_id):

    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "home_id": home_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
