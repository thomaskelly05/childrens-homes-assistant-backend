import jwt

from fastapi import Depends, HTTPException, Request
from psycopg2.extras import RealDictCursor

from db.connection import get_db
from auth.tokens import JWT_SECRET, JWT_ALGORITHM


def _get_token_payload(request: Request) -> dict:
    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated"
        )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )
        return payload

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid session"
        )


def get_current_user(
    request: Request,
    conn=Depends(get_db)
):
    payload = _get_token_payload(request)

    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid session"
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid session"
        )

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT
                id,
                email,
                first_name,
                last_name,
                role,
                home_id,
                archived
            FROM users
            WHERE id = %s
            LIMIT 1
        """, (user_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    user = dict(row)

    if user.get("archived") is True:
        raise HTTPException(
            status_code=403,
            detail="User is archived"
        )

    return user
