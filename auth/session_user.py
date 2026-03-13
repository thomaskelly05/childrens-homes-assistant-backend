from fastapi import Depends, HTTPException, Request
from psycopg2.extras import RealDictCursor

from db.connection import get_db


SESSION_USER_KEYS = (
    "user_id",
    "account_id",
    "staff_id",
    "id",
)


def _extract_session_user_id(request: Request) -> int:
    session = getattr(request, "session", {}) or {}

    for key in SESSION_USER_KEYS:
        value = session.get(key)
        if value is not None:
            try:
                return int(value)
            except (TypeError, ValueError):
                pass

    user_obj = session.get("user")
    if isinstance(user_obj, dict):
        for key in SESSION_USER_KEYS:
            value = user_obj.get(key)
            if value is not None:
                try:
                    return int(value)
                except (TypeError, ValueError):
                    pass

    raise HTTPException(
        status_code=401,
        detail="Not authenticated"
    )


def get_current_user(
    request: Request,
    conn=Depends(get_db)
):
    user_id = _extract_session_user_id(request)

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
