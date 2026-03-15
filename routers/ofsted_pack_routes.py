from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/inspection-pack", tags=["Inspection Pack"])


class InspectionPackCreate(BaseModel):
    scope_type: str
    scope_id: int
    pack_type: str = "ofsted"
    requested_by: int | None = None


@router.post("")
def create_inspection_pack_job(
    payload: InspectionPackCreate,
    conn=Depends(get_db),
):
    query = """
        INSERT INTO inspection_pack_jobs (
            scope_type,
            scope_id,
            pack_type,
            status,
            requested_by,
            created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.scope_type,
        payload.scope_id,
        payload.pack_type,
        "queued",
        payload.requested_by,
        datetime.utcnow(),
    )

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create inspection pack job: {str(e)}")

    return {"message": "Inspection pack job created", "id": row["id"]}
