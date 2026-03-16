from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Daily Notes"])


class DailyNoteCreate(BaseModel):
    young_person_id: int
    home_id: int | None = None
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
    significance: str | None = None
    workflow_status: str | None = "draft"
    manager_review_comment: str | None = None
    approved_by: int | None = None
    approved_at: str | None = None
    returned_at: str | None = None
    submitted_at: str | None = None
    last_edited_at: str | None = None
    author_id: int | None = None


class DailyNoteUpdate(BaseModel):
    home_id: int | None = None
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
    workflow_status: str | None = None
    manager_review_comment: str | None = None
    approved_by: int | None = None
    approved_at: str | None = None
    returned_at: str | None = None
    submitted_at: str | None = None
    last_edited_at: str | None = None
    author_id: int | None = None


def ensure_young_person_exists(cur, young_person_id: int):
    cur.execute("SELECT id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Young person not found")


def fetch_daily_note_select_sql(where_sql: str):
    return f"""
        SELECT
            dn.id,
            dn.young_person_id,
            dn.home_id,
            dn.note_date,
            dn.shift_type,
            dn.mood,
            dn.presentation,
            dn.activities,
            dn.education_update,
            dn.health_update,
            dn.family_update,
            dn.behaviour_update,
            dn.young_person_voice,
            dn.positives,
            dn.actions_required,
            dn.significance,
            dn.workflow_status,
            dn.manager_review_comment,
            dn.approved_by,
            dn.approved_at,
            dn.returned_at,
            dn.submitted_at,
            dn.last_edited_at,
            dn.author_id,
            dn.created_at,
            dn.updated_at,
            u.first_name AS author_first_name,
            u.last_name AS author_last_name,
            a.first_name AS approved_by_first_name,
            a.last_name AS approved_by_last_name
        FROM daily_notes dn
        LEFT JOIN users u ON dn.author_id = u.id
        LEFT JOIN users a ON dn.approved_by = a.id
        {where_sql}
    """


@router.get("/{young_person_id}/daily-notes")
def get_young_person_daily_notes(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)
            cur.execute(
                fetch_daily_note_select_sql(
                    """
                    WHERE dn.young_person_id = %s
                      AND LOWER(COALESCE(dn.workflow_status, 'draft')) NOT IN ('completed', 'reviewed', 'archived')
                    ORDER BY dn.note_date DESC, dn.created_at DESC, dn.id DESC
                    """
                ),
                (young_person_id,),
            )
            return cur.fetchall()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load daily notes: {str(e)}")


@router.get("/{young_person_id}/daily-notes/archive")
def get_young_person_archived_daily_notes(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)
            cur.execute(
                fetch_daily_note_select_sql(
                    """
                    WHERE dn.young_person_id = %s
                      AND LOWER(COALESCE(dn.workflow_status, '')) IN ('completed', 'reviewed', 'archived')
                    ORDER BY dn.note_date DESC, dn.created_at DESC, dn.id DESC
                    """
                ),
                (young_person_id,),
            )
            return cur.fetchall()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load archived daily notes: {str(e)}")


@router.get("/daily-notes/{daily_note_id}")
def get_daily_note(daily_note_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                fetch_daily_note_select_sql("WHERE dn.id = %s LIMIT 1"),
                (daily_note_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Daily note not found")

        return row
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load daily note: {str(e)}")


@router.post("/daily-notes")
def create_daily_note(payload: DailyNoteCreate, conn=Depends(get_db)):
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
            workflow_status,
            manager_review_comment,
            approved_by,
            approved_at,
            returned_at,
            submitted_at,
            last_edited_at,
            author_id,
            created_at,
            updated_at
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s
        )
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
        payload.workflow_status,
        payload.manager_review_comment,
        payload.approved_by,
        payload.approved_at,
        payload.returned_at,
        payload.submitted_at,
        payload.last_edited_at or now,
        payload.author_id,
        now,
        now,
    )

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            row = cur.fetchone()
        conn.commit()
        return {"message": "Daily note created successfully", "id": row["id"]}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create daily note: {str(e)}")


@router.put("/daily-notes/{daily_note_id}")
def update_daily_note(daily_note_id: int, payload: DailyNoteUpdate, conn=Depends(get_db)):
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_data["updated_at"] = datetime.utcnow()
    update_data["last_edited_at"] = datetime.utcnow()

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
            row = cur.fetchone()
        conn.commit()

        if not row:
            raise HTTPException(status_code=404, detail="Daily note not found")

        return {"message": "Daily note updated successfully", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update daily note: {str(e)}")
