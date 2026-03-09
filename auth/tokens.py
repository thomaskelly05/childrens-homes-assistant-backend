import jwt
import os

JWT_SECRET = os.environ.get("SESSION_SECRET", "indicare-super-secret-key")
JWT_ALGORITHM = "HS256"


def create_session_token(user_id: int, role: str):

    payload = {
        "user_id": user_id,
        "role": role
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return token


def decode_session_token(token: str):

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        return None
