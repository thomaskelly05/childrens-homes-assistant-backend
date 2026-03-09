from fastapi import APIRouter, Depends, HTTPException, Request
from psycopg2.extras import RealDictCursor
from db.connection import get_db
from auth.tokens import decode_session_token

router = APIRouter(
    prefix="/account",
    tags=["Account"]
)


@router.get("/me")
def get_account(request: Request, conn=Depends(get_db)):

    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401)

    payload = decode_session_token(token)

    if not payload:
        raise HTTPException(status_code=401)

    user_id = payload["user_id"]

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT id, email, role
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401)

    return user
