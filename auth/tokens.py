import jwt
import os

JWT_SECRET = os.environ.get("SESSION_SECRET", "indicare-secret")
JWT_ALGORITHM = "HS256"


def create_session_token(user_id, email, role, home_id):

    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "home_id": home_id
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return token


def decode_session_token(token):

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )

        return payload

    except Exception:
        return None
