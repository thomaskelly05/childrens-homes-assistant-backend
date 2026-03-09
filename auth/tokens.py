import jwt
import os

SECRET = os.environ.get("SESSION_SECRET", "super-secret-key")


def create_session_token(user_id, role):

    payload = {
        "user_id": user_id,
        "role": role
    }

    return jwt.encode(payload, SECRET, algorithm="HS256")


def decode_session_token(token):

    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        return None
