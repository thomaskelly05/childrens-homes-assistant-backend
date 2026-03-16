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


def ensure_young_person_exists(cur, young_person_id: int):
    cur.execute("SELECT id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Young person not found")


def fetch_keywork_select_sql(where_sql: str):
    return f"""
        SELECT
            k.id,
            k.young_person_id,
            k.session_date,
            k.worker_id,
            k.topic,
            k.purpose,
            k.summary,
            k.child_voice,
            k.reflective_analysis,
            k.actions_agreed,
            k.next_session_date,
            k.status,
            k.archived,
            k.created_at,
            k.updated_at,
            u.first_name AS worker_first_name,
            u.last_name AS worker_last_name
        FROM keywork_sessions k
        LEFT JOIN users u ON k.worker_id = u.id
        {where_sql}
    """


@router.get("/{young_person_id}/keywork")
def get_young_person_keywork(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)
            cur.execute(
                fetch_keywork_select_sql(
                    """
                    WHERE k.young_person_id = %s
                      AND COALESCE(k.archived, FALSE) = FALSE
                      AND LOWER(COALESCE(k.status, 'active')) NOT IN ('archived', 'completed')
                    ORDER BY k.session_date DESC, k.created_at DESC, k.id DESC
                    """
                ),
                (young_person_id,),
            )
            return cur.fetchall()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load keywork: {str(e)}")


@router.get("/{young_person_id}/keywork/archive")
def get_young_person_archived_keywork(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)
            cur.execute(
                fetch_keywork_select_sql(
                    """
                    WHERE k.young_person_id = %s
                      AND (
                        COALESCE(k.archived, FALSE) = TRUE
                        OR LOWER(COALESCE(k.status, '')) IN ('archived', 'completed')
                      )
                    ORDER BY k.session_date DESC, k.created_at DESC, k.id DESC
                    """
                ),
                (young_person_id,),
            )
            return cur.fetchall()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load archived keywork: {str(e)}")


@router.get("/keywork/{keywork_id}")
def get_keywork_session(keywork_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                fetch_keywork_select_sql("WHERE k.id = %s LIMIT 1"),
                (keywork_id,),
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
            status,
            archived,
            created_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
        payload.status,
        payload.archived,
        now,
        now,
    )

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            row = cur.fetchone()
        conn.commit()
        return {"message": "Keywork session created successfully", "id": row["id"]}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create keywork session: {str(e)}")


@router.put("/keywork/{keywork_id}")
def update_keywork_session(keywork_id: int, payload: KeyworkUpdate, conn=Depends(get_db)):
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_data["updated_at"] = datetime.utcnow()

    set_parts = []
    values = []
    for field, value in update_data.items():
        set_parts.append(f"{field} = %s")
        values.append(value)
    values.append(keywork_id)

    query = f"""
        UPDATE keywork_sessions
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
            raise HTTPException(status_code=404, detail="Keywork session not found")

        return {"message": "Keywork session updated successfully", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update keywork session: {str(e)}")
