from fastapi import Cookie, HTTPException

from auth.tokens import decode_session_token


def get_current_user(access_token: str | None = Cookie(default=None)):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_session_token(access_token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    email = payload.get("email")
    role = payload.get("role")
    home_id = payload.get("home_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    return {
        "user_id": int(user_id),
        "email": email,
        "role": role,
        "home_id": home_id
    }
