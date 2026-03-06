from fastapi import APIRouter, Depends
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel
from db.connection import get_db

router = APIRouter(
    prefix="/conversation",
    tags=["Conversation"]
)

class Message(BaseModel):
    user_id: int
    role: str
    message: str


@router.get("/{user_id}")
def get_history(user_id: int, conn=Depends(get_db)):

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT role, message
            FROM conversations
            WHERE user_id = %s
            ORDER BY created_at ASC
            LIMIT 50
            """,
            (user_id,)
        )

        history = cur.fetchall()

    return history


@router.post("/save")
def save_message(payload: Message, conn=Depends(get_db)):

    with conn.cursor() as cur:

        cur.execute(
            """
            INSERT INTO conversations (user_id, role, message)
            VALUES (%s,%s,%s)
            """,
            (
                payload.user_id,
                payload.role,
                payload.message
            )
        )

        conn.commit()

    return {"status":"saved"}
