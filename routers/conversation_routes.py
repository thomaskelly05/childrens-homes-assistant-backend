from fastapi import APIRouter, Depends
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel
from db.connection import get_db

router = APIRouter(
    prefix="/conversations",
    tags=["Conversations"]
)


class Message(BaseModel):
    conversation_id: int
    role: str
    message: str


class NewConversation(BaseModel):
    user_id: int
    title: str


# LIST USER CONVERSATIONS

@router.get("/{user_id}")
def list_conversations(user_id: int, conn=Depends(get_db)):

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT id, title, created_at
            FROM conversations
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,)
        )

        conversations = cur.fetchall()

    return conversations


# GET MESSAGES IN CONVERSATION

@router.get("/chat/{conversation_id}")
def get_messages(conversation_id: int, conn=Depends(get_db)):

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT role, message
            FROM messages
            WHERE conversation_id = %s
            ORDER BY created_at ASC
            """,
            (conversation_id,)
        )

        messages = cur.fetchall()

    return messages


# CREATE NEW CONVERSATION

@router.post("/create")
def create_conversation(payload: NewConversation, conn=Depends(get_db)):

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            INSERT INTO conversations (user_id, title)
            VALUES (%s,%s)
            RETURNING id
            """,
            (
                payload.user_id,
                payload.title
            )
        )

        convo = cur.fetchone()

        conn.commit()

    return convo


# SAVE MESSAGE

@router.post("/message")
def save_message(payload: Message, conn=Depends(get_db)):

    with conn.cursor() as cur:

        cur.execute(
            """
            INSERT INTO messages (conversation_id, role, message)
            VALUES (%s,%s,%s)
            """,
            (
                payload.conversation_id,
                payload.role,
                payload.message
            )
        )

        conn.commit()

    return {"status": "saved"}
