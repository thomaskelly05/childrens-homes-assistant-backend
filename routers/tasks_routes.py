from fastapi import APIRouter, Depends
from psycopg2.extras import RealDictCursor

from db.connection import get_db
from auth.dependencies import get_current_user  # align with your shared auth dependency

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/")
def get_tasks(
    conn=Depends(get_db),
):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, title, completed, created_at
            FROM tasks
            ORDER BY created_at DESC
            """
        )
        tasks = cur.fetchall()

    return tasks
