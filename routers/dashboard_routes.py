from fastapi import APIRouter, Depends
from psycopg2.extras import RealDictCursor

from db.connection import get_db

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


KEYWORDS = {
    "aggression": ["hit", "kick", "punch", "aggressive"],
    "absconding": ["abscond", "ran away", "missing"],
    "self_harm": ["self harm", "cut", "hurt themselves"],
    "sleep": ["awake all night", "no sleep", "sleep issue"],
    "burnout": ["exhausted", "burnout", "overwhelmed"]
}


@router.get("/")
def manager_dashboard(conn=Depends(get_db)):

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        # reflections last 7 days
        cur.execute(
            """
            SELECT COUNT(*) as reflections
            FROM staff_journal
            WHERE created_at > NOW() - INTERVAL '7 days'
            """
        )

        reflections = cur.fetchone()["reflections"]

        # get reflection text
        cur.execute(
            """
            SELECT reflection
            FROM staff_journal
            WHERE reflection IS NOT NULL
            """
        )

        rows = cur.fetchall()

    reflections_text = [r["reflection"].lower() for r in rows]

    # detect themes
    themes = []

    for theme, words in KEYWORDS.items():

        count = 0

        for text in reflections_text:
            for word in words:
                if word in text:
                    count += 1

        if count > 0:
            themes.append({
                "theme": theme,
                "count": count
            })

    safeguarding = sum(t["count"] for t in themes)

    return {
        "reflections": reflections,
        "safeguarding": safeguarding,
        "themes": themes
    }
