from fastapi import Depends, HTTPException, Request
from db.connection import get_db
from psycopg2.extras import RealDictCursor


def get_current_user(request: Request, conn=Depends(get_db)):

    session = request.cookies.get("session")

    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT user_id
            FROM sessions
            WHERE token=%s
            """,
            (session,)
        )

        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="Invalid session")

        return row["user_id"]
