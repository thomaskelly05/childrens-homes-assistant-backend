from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Daily Notes"])


class DailyNoteCreate(BaseModel):
    young_person_id: int
    home_id: int
    note_date: str
    shift_type: str
    mood: str | None = None
    presentation: str | None = None
    activities: str | None = None
    education_update: str | None = None
    health_update: str | None = None
    family_update: str | None = None
    behaviour_update: str | None = None
    young_person_voice: str | None = None
    positives: str | None = None
    actions_required: str | None = None
    significance: str = "standard"
    author_id: int | None = None


class DailyNoteUpdate(BaseModel):
    note_date: str | None = None
    shift_type: str | None = None
    mood: str | None = None
    presentation: str | None = None
    activities: str | None = None
    education_update: str | None = None
    health_update: str | None = None
    family_update: str | None = None
    behaviour_update: str | None = None
    young_person_voice: str | None = None
    positives: str | None = None
    actions_required: str | None = None
    significance: str | None = None
    author_id: int | None = None


@router.get("/{young_person_id}/daily-notes")
def list_daily_notes(
    young_person_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            dn.*,
            u.first_name AS author_first_name,
            u.last_name AS author_last_name
        FROM daily_notes dn
        LEFT JOIN users u ON dn.author_id = u.id
        WHERE dn.young_person_id = %s
        ORDER BY dn.note_date DESC, dn.id DESC
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        rows = cur.fetchall()

    return rows


@router.get("/daily-notes/{daily_note_id}")
def get_daily_note(
    daily_note_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            dn.*,
            u.first_name AS author_first_name,
            u.last_name AS author_last_name
        FROM daily_notes dn
        LEFT JOIN users u ON dn.author_id = u.id
        WHERE dn.id = %s
        LIMIT 1
    """

    with conn.cursor() as cur:
        cur.execute(query, (daily_note_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Daily note not found")

    return row


@router.post("/daily-notes")
def create_daily_note(
    payload: DailyNoteCreate,
    conn=Depends(get_db),
):
    now = datetime.utcnow()

    query = """
        INSERT INTO daily_notes (
            young_person_id,
            home_id,
            note_date,
            shift_type,
            mood,
            presentation,
            activities,
            education_update,
            health_update,
            family_update,
            behaviour_update,
            young_person_voice,
            positives,
            actions_required,
            significance,
            author_id,
            created_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.young_person_id,
        payload.home_id,
        payload.note_date,
        payload.shift_type,
        payload.mood,
        payload.presentation,
        payload.activities,
        payload.education_update,
        payload.health_update,
        payload.family_update,
        payload.behaviour_update,
        payload.young_person_voice,
        payload.positives,
        payload.actions_required,
        payload.significance,
        payload.author_id,
        now,
        now,
    )

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            new_row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create daily note: {str(e)}")

    return {"message": "Daily note created successfully", "id": new_row["id"]}


@router.put("/daily-notes/{daily_note_id}")
def update_daily_note(
    daily_note_id: int,
    payload: DailyNoteUpdate,
    conn=Depends(get_db),
):
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_data["updated_at"] = datetime.utcnow()

    set_parts = []
    values = []

    for field, value in update_data.items():
        set_parts.append(f"{field} = %s")
        values.append(value)

    values.append(daily_note_id)

    query = f"""
        UPDATE daily_notes
        SET {", ".join(set_parts)}
        WHERE id = %s
        RETURNING id
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            updated_row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update daily note: {str(e)}")

    if not updated_row:
        raise HTTPException(status_code=404, detail="Daily note not found")

    return {"message": "Daily note updated successfully", "id": updated_row["id"]}
