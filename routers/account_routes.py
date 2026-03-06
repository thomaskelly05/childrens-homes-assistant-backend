from fastapi import APIRouter, Depends
from psycopg2.extras import RealDictCursor
from db.connection import get_db

router = APIRouter(
    prefix="/account",
    tags=["Account"]
)

@router.get("/me")
def get_account(conn=Depends(get_db)):

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT id, email, role
            FROM users
            LIMIT 1
            """
        )

        user = cur.fetchone()

    return user
