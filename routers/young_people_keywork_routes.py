from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Keywork"])


class KeyworkCreate(BaseModel):
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
    status: str | None = "active"
    archived: bool | None = False


class KeyworkUpdate(BaseModel):
    session_date: str | None = None
    worker_id: int | None = None
    topic: str | None = None
    purpose: str | None = None
    summary: str | None = None
    child_voice: str | None = None
    reflective_analysis: str | None = None
    actions_agreed: str | None = None
    next_session_date: str | None = None
    status: str | None = None
    archived: bool | None = None


@router.get("/{young_person_id}/keywork")
def get_young_person_keywork(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Young person not found")

            cur.execute(
                """
                SELECT
                    ks.*,
                    u.first_name AS worker_first_name,
                    u.last_name AS worker_last_name
                FROM keywork_sessions ks
                LEFT JOIN users u ON ks.worker_id = u.id
                WHERE ks.young_person_id = %s
                  AND COALESCE(ks.archived, FALSE) = FALSE
                ORDER BY ks.session_date DESC, ks.id DESC
                """,
                (young_person_id,),
            )
            return cur.fetchall()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load keywork sessions: {str(e)}")


@router.get("/{young_person_id}/keywork/archive")
def get_young_person_keywork_archive(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Young person not found")

            cur.execute(
                """
                SELECT
                    ks.*,
                    u.first_name AS worker_first_name,
                    u.last_name AS worker_last_name
                FROM keywork_sessions ks
                LEFT JOIN users u ON ks.worker_id = u.id
                WHERE ks.young_person_id = %s
                  AND COALESCE(ks.archived, FALSE) = TRUE
                ORDER BY ks.session_date DESC, ks.id DESC
                """,
                (young_person_id,),
            )
            return cur.fetchall()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load archived keywork sessions: {str(e)}")


@router.get("/keywork/{session_id}")
def get_keywork_session(session_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    ks.*,
                    u.first_name AS worker_first_name,
                    u.last_name AS worker_last_name
                FROM keywork_sessions ks
                LEFT JOIN users u ON ks.worker_id = u.id
                WHERE ks.id = %s
                LIMIT 1
                """,
                (session_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Keywork session not found")
        return row

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load keywork session: {str(e)}")


@router.post("/keywork")
def create_keywork_session(payload: KeyworkCreate, conn=Depends(get_db)):
    now = datetime.utcnow()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
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
                    status,
                    archived,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
                """,
                (
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
                    payload.status,
                    payload.archived,
                    now,
                    now,
                ),
            )
            row = cur.fetchone()
        conn.commit()
        return {"message": "Keywork session created successfully", "id": row["id"]}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create keywork session: {str(e)}")


@router.put("/keywork/{session_id}")
def update_keywork_session(session_id: int, payload: KeyworkUpdate, conn=Depends(get_db)):
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_data["updated_at"] = datetime.utcnow()

    set_parts = []
    values = []
    for field, value in update_data.items():
        set_parts.append(f"{field} = %s")
        values.append(value)
    values.append(session_id)

    try:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE keywork_sessions
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )
            row = cur.fetchone()
        conn.commit()

        if not row:
            raise HTTPException(status_code=404, detail="Keywork session not found")

        return {"message": "Keywork session updated successfully", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update keywork session: {str(e)}")
