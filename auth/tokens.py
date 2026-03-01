import jwt
from datetime import datetime, timedelta, timezone

JWT_SECRET = "your_jwt_secret_here"
JWT_ALGORITHM = "HS256"

def create_session_token(user_id: int, role: str):
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
