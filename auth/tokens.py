import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt


JWT_SECRET = os.environ.get("SESSION_SECRET")
if not JWT_SECRET:
    raise RuntimeError("SESSION_SECRET is not set")

JWT_ALGORITHM = "HS256"
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "30"))
JWT_ISSUER = os.environ.get("JWT_ISSUER", "indicare")


def create_session_token(
    user_id: int,
    *,
    expires_seconds: int | None = None,
    mfa_verified: bool = False,
    remember: bool = False,
    session_id: str | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    expires_delta = (
        timedelta(seconds=int(expires_seconds))
        if expires_seconds and int(expires_seconds) > 0
        else timedelta(minutes=JWT_EXPIRES_MINUTES)
    )
    expires_at = now + expires_delta

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "iss": JWT_ISSUER,
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": secrets.token_urlsafe(16),
        "sid": session_id or secrets.token_urlsafe(24),
        "mfa_verified": bool(mfa_verified),
        "remember": bool(remember),
    }

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_session_token(token: str | None) -> dict[str, Any] | None:
    if not token:
        return None

    try:
        return jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            options={"require": ["sub", "iss", "iat", "nbf", "exp", "jti"]},
        )
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
