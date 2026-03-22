import os
from datetime import datetime, timedelta, timezone

import jwt


JWT_SECRET = os.environ.get("SESSION_SECRET")
if not JWT_SECRET:
    raise RuntimeError("SESSION_SECRET is not set")

JWT_ALGORITHM = "HS256"
JWT_EXPIRES_MINUTES = 30
JWT_ISSUER = os.environ.get("JWT_ISSUER", "indicare")


def create_session_token(user_id: int):
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=JWT_EXPIRES_MINUTES)

    payload = {
        "sub": str(user_id),
        "iss": JWT_ISSUER,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def decode_session_token(token: str):
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            options={
                "require": ["sub", "iss", "iat", "exp"]
            }
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
