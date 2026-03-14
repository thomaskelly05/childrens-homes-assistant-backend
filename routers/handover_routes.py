from fastapi import APIRouter, Depends
from psycopg2.extras import RealDictCursor

from auth.session_user import get_current_user
from db.connection import get_db

router = APIRouter(
    prefix="/handover",
    tags=["Handover"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/")
def get_handover(conn=Depends(get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, note, created_at
            FROM handover
            ORDER BY created_at DESC
            LIMIT 50
            """
        )
        notes = cur.fetchall()

    return notes
