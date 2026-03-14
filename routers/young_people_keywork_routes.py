from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Key Work"])


class KeyworkSessionCreate(BaseModel):
    young_person_id: int
    session_date: str
    worker_id: int | None = None
    topic: str
    purpose: str | None = None
    summary: str | None = None
    child_voice: str | None = None
    reflective_analysis: str | None = None
    actions_agreed: str | None = None
    next_session_date: str | None = None


class KeyworkSessionUpdate(BaseModel):
    session_date: str | None = None
    worker_id: int | None = None
    topic: str | None = None
    purpose: str | None = None
    summary: str | None = None
    child_voice: str | None = None
    reflective_analysis: str | None = None
    actions_agreed: str | None = None
    next_session_date: str | None = None


@router.get("/{young_person_id}/keywork")
def list_keywork_sessions(
    young_person_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            ks.*,
            u.first_name AS worker_first_name,
            u.last_name AS worker_last_name
        FROM keywork_sessions ks
        LEFT JOIN users u ON ks.worker_id = u.id
        WHERE ks.young_person_id = %s
        ORDER BY ks.session_date DESC, ks.id DESC
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        rows = cur.fetchall()

    return rows


@router.get("/keywork/{keywork_session_id}")
def get_keywork_session(
    keywork_session_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            ks.*,
            u.first_name AS worker_first_name,
            u.last_name AS worker_last_name
        FROM keywork_sessions ks
        LEFT JOIN users u ON ks.worker_id = u.id
        WHERE ks.id = %s
        LIMIT 1
    """

    with conn.cursor() as cur:
        cur.execute(query, (keywork_session_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Keywork session not found")

    return row


@router.post("/keywork")
def create_keywork_session(
    payload: KeyworkSessionCreate,
    conn=Depends(get_db),
):
    now = datetime.utcnow()

    query = """
        INSERT INTO keywork_sessions (
            young_person_id,
            session_date,
            worker_id,
            topic,
            purpose,
            summary,
            child_voice,
            reflective_analysis,
            actions_agreed,
            next_session_date,
            created_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.young_person_id,
        payload.session_date,
        payload.worker_id,
        payload.topic,
        payload.purpose,
        payload.summary,
        payload.child_voice,
        payload.reflective_analysis,
        payload.actions_agreed,
        payload.next_session_date,
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
        raise HTTPException(status_code=500, detail=f"Failed to create keywork session: {str(e)}")

    return {"message": "Keywork session created successfully", "id": new_row["id"]}


@router.put("/keywork/{keywork_session_id}")
def update_keywork_session(
    keywork_session_id: int,
    payload: KeyworkSessionUpdate,
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

    values.append(keywork_session_id)

    query = f"""
        UPDATE keywork_sessions
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
        raise HTTPException(status_code=500, detail=f"Failed to update keywork session: {str(e)}")

    if not updated_row:
        raise HTTPException(status_code=404, detail="Keywork session not found")

    return {"message": "Keywork session updated successfully", "id": updated_row["id"]}
