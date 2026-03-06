from fastapi import APIRouter, Depends
from psycopg2.extras import RealDictCursor
from db.connection import get_db

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

@router.get("/")
def manager_dashboard(conn=Depends(get_db)):

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT COUNT(*) as reflections
            FROM staff_journal
            WHERE created_at > NOW() - INTERVAL '7 days'
            """
        )

        reflections = cur.fetchone()["reflections"]

        cur.execute(
            """
            SELECT COUNT(*) as safeguarding
            FROM staff_journal
            WHERE reflection ILIKE '%safeguard%'
            """
        )

        safeguarding = cur.fetchone()["safeguarding"]

    return {
        "reflections": reflections,
        "safeguarding": safeguarding,
        "themes": "Behaviour regulation, transitions, school refusal"
    }
