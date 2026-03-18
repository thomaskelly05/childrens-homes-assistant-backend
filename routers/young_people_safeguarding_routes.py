from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Safeguarding"])


class SafeguardingFlagCreate(BaseModel):
    young_person_id: int
    source_table: str
    source_id: int
    title: str
    summary: str | None = None
    created_by: int | None = None


@router.post("/safeguarding/flag")
def create_safeguarding_flag(payload: SafeguardingFlagCreate, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO chronology_events (
                    young_person_id,
                    event_datetime,
                    category,
                    subcategory,
                    title,
                    summary,
                    significance,
                    source_table,
                    source_id,
                    created_by,
                    auto_generated,
                    is_visible,
                    event_status,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, 'safeguarding', 'manager_flag', %s, %s, 'high',
                    %s, %s, %s, FALSE, TRUE, 'recorded', %s, %s
                )
                RETURNING id
                """,
                (
                    payload.young_person_id,
                    datetime.utcnow(),
                    payload.title,
                    payload.summary,
                    payload.source_table,
                    payload.source_id,
                    payload.created_by,
                    datetime.utcnow(),
                    datetime.utcnow(),
                ),
            )
            row = cur.fetchone()

        conn.commit()
        return {"ok": True, "id": row["id"]}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create safeguarding flag: {str(e)}")
