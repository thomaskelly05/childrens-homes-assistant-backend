from fastapi import APIRouter, Depends
from pydantic import BaseModel
from db.connection import get_db
from auth.dependencies import get_current_user

router = APIRouter(prefix="/staff/journal", tags=["Staff Journal"])

class JournalEntry(BaseModel):
    holding_today: str | None = None
    practice_today: str | None = None
    reflection_today: str | None = None

@router.get("", response_model=JournalEntry)
def get_journal(conn = Depends(get_db), current_user = Depends(get_current_user)):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                holding_today,
                practice_today,
                reflection_today
            FROM staff_journal
            WHERE staff_id = %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (current_user["id"],),
        )
        row = cur.fetchone()

    if not row:
        return JournalEntry()

    return JournalEntry(
        holding_today=row["holding_today"],
        practice_today=row["practice_today"],
        reflection_today=row["reflection_today"],
    )

@router.post("", response_model=JournalEntry)
def save_journal(
    payload: JournalEntry,
    conn = Depends(get_db),
    current_user = Depends(get_current_user),
):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO staff_journal (
                staff_id,
                holding_today,
                practice_today,
                reflection_today
            )
            VALUES (%s, %s, %s, %s)
            """,
            (
                current_user["id"],
                payload.holding_today,
                payload.practice_today,
                payload.reflection_today,
            ),
        )
        conn.commit()

    return payload
