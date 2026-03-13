import os
from datetime import datetime, timedelta, timezone

import jwt


JWT_SECRET = os.environ.get("SESSION_SECRET")
if not JWT_SECRET:
    raise RuntimeError("SESSION_SECRET is not set")

JWT_ALGORITHM = "HS256"
JWT_EXPIRES_HOURS = 24


def create_session_token(user_id, email, role, home_id):
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=JWT_EXPIRES_HOURS)

    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "home_id": home_id,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp())
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
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
