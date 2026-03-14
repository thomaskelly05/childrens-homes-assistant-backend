from fastapi import Header, HTTPException

from auth.tokens import decode_session_token


def get_bearer_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")

    parts = authorization.split(" ", 1)

    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = parts[1].strip()

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return token


def get_current_user(authorization: str | None = Header(default=None)):
    token = get_bearer_token(authorization)

    payload = decode_session_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    email = payload.get("email")
    role = payload.get("role")
    home_id = payload.get("home_id")

    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token payload")

    return {
        "id": user_id,
        "user_id": user_id,
        "email": email,
        "role": role,
        "home_id": home_id,
    }
