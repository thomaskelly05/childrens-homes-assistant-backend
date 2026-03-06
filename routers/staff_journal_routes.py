from fastapi import APIRouter, Depends
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor
from db.connection import get_db

router = APIRouter(
    prefix="/staff-journal",
    tags=["Staff Journal"]
)


class Reflection(BaseModel):
    reflection: str


@router.get("/")
def get_reflections(conn=Depends(get_db)):

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT id, reflection, created_at
            FROM staff_journal
            ORDER BY created_at DESC
            LIMIT 50
            """
        )

        reflections = cur.fetchall()

    return reflections


@router.post("/save")
def save_reflection(payload: Reflection, conn=Depends(get_db)):

    with conn.cursor() as cur:

        cur.execute(
            """
            INSERT INTO staff_journal (reflection)
            VALUES (%s)
            """,
            (payload.reflection,)
        )

        conn.commit()

    return {"status": "saved"}
