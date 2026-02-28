from fastapi import APIRouter, Depends
from pydantic import BaseModel
from db.connection import get_db
from auth.dependencies import get_current_user

router = APIRouter(prefix="/handover", tags=["Handover"])

class HandoverEntry(BaseModel):
    environment: str | None = None
    incidents: str | None = None
    staff_wellbling: str | None = None
    operational_notes: str | None = None

@router.get("/incoming")
def get_incoming(conn = Depends(get_db), user = Depends(get_current_user)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT environment, incidents, staff_wellbeing, operational_notes, created_at
            FROM handover
            WHERE home_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (user["home_id"],))
        return cur.fetchone()

@router.post("/outgoing")
def save_outgoing(payload: HandoverEntry, conn = Depends(get_db), user = Depends(get_current_user)):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO handover (home_id, staff_id, environment, incidents, staff_wellbeing, operational_notes)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            user["home_id"],
            user["id"],
            payload.environment,
            payload.incidents,
            payload.staff_wellbeing,
            payload.operational_notes
        ))
        conn.commit()
    return {"status": "saved"}

@router.get("/history")
def get_history(conn = Depends(get_db), user = Depends(get_current_user)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT environment, incidents, staff_wellbeing, operational_notes, created_at
            FROM handover
            WHERE home_id = %s
            ORDER BY created_at DESC
            LIMIT 20
        """, (user["home_id"],))
        return cur.fetchall()
