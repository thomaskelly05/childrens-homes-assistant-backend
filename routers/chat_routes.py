from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel
from openai import OpenAI

from db.connection import get_db
from assistant.prompts import build_chat_prompt
from auth.dependencies import get_current_user

router = APIRouter(prefix="/chat", tags=["Chat"])

client = OpenAI()


# ----------------------------------------------------
# REQUEST MODEL
# ----------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    conversation_id: int | None = None
    role: str | None = "residential staff"
    ld_lens: bool = False
    training_mode: bool = False
    speed: str = "normal"


# ----------------------------------------------------
# AI TITLE GENERATOR
# ----------------------------------------------------

def generate_title(message: str):

    try:

        prompt = f"""
Create a short conversation title (max 6 words)
for a residential children's home staff discussion.

Message:
{message}

Title:
"""

        res = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=20
        )

        title = res.choices[0].message.content.strip()

        return " ".join(title.split()[:6])

    except Exception:
        return message[:40]


# ----------------------------------------------------
# MAIN CHAT
# ----------------------------------------------------

@router.post("/")
def chat(
    payload: ChatRequest,
    user_id: int = Depends(get_current_user),
    conn=Depends(get_db)
):

    message = payload.message
    conversation_id = payload.conversation_id

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        # --------------------------------
        # CREATE CONVERSATION
        # --------------------------------

        if conversation_id is None:

            title = generate_title(message)

            cur.execute(
                """
                INSERT INTO conversations (user_id,title)
                VALUES (%s,%s)
                RETURNING id
                """,
                (user_id, title)
            )

            conversation_id = cur.fetchone()["id"]

            conn.commit()

        # --------------------------------
        # VERIFY OWNERSHIP
        # --------------------------------

        cur.execute(
            """
            SELECT id
            FROM conversations
            WHERE id=%s AND user_id=%s
            """,
            (conversation_id, user_id)
        )

        if not cur.fetchone():
            raise Exception("Conversation not found")

        # --------------------------------
        # LOAD HISTORY
        # --------------------------------

        cur.execute(
            """
            SELECT role,message
            FROM messages
            WHERE conversation_id=%s
            ORDER BY created_at ASC
            LIMIT 40
            """,
            (conversation_id,)
        )

        history = cur.fetchall()

    # --------------------------------
    # BUILD PROMPT
    # --------------------------------

    system_prompt, user_message = build_chat_prompt(
        message=message,
        role=payload.role,
        ld_lens=payload.ld_lens,
        training_mode=payload.training_mode,
        speed=payload.speed
    )

    messages = [{"role": "system", "content": system_prompt}]

    for h in history:

        messages.append({
            "role": h["role"],
            "content": h["message"]
        })

    messages.append({
        "role": "user",
        "content": user_message
    })


    # --------------------------------
    # STREAM RESPONSE
    # --------------------------------

    def stream_and_save():

        full_response = ""

        stream = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            stream=True
        )

        for chunk in stream:

            if (
                chunk.choices
                and chunk.choices[0].delta
                and chunk.choices[0].delta.content
            ):

                text = chunk.choices[0].delta.content

                full_response += text

                yield text

        with conn.cursor() as cur:

            cur.execute(
                """
                INSERT INTO messages (conversation_id,role,message)
                VALUES (%s,'user',%s)
                """,
                (conversation_id, message)
            )

            cur.execute(
                """
                INSERT INTO messages (conversation_id,role,message)
                VALUES (%s,'assistant',%s)
                """,
                (conversation_id, full_response)
            )

            conn.commit()

    response = StreamingResponse(
        stream_and_save(),
        media_type="text/plain"
    )

    response.headers["conversation-id"] = str(conversation_id)

    return response


# ----------------------------------------------------
# GET CONVERSATIONS
# ----------------------------------------------------

@router.get("/conversations")
def get_conversations(
    user_id: int = Depends(get_current_user),
    conn=Depends(get_db)
):

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT id,title,created_at
            FROM conversations
            WHERE user_id=%s
            ORDER BY created_at DESC
            LIMIT 100
            """,
            (user_id,)
        )

        rows = cur.fetchall()

    return rows


# ----------------------------------------------------
# GET MESSAGES
# ----------------------------------------------------

@router.get("/conversations/{conversation_id}")
def get_messages(
    conversation_id: int,
    user_id: int = Depends(get_current_user),
    conn=Depends(get_db)
):

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT m.role,m.message
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE m.conversation_id=%s
            AND c.user_id=%s
            ORDER BY m.created_at ASC
            """,
            (conversation_id, user_id)
        )

        rows = cur.fetchall()

    return rows


# ----------------------------------------------------
# SEARCH CONVERSATIONS
# ----------------------------------------------------

@router.get("/search")
def search_conversations(
    q: str = Query(...),
    user_id: int = Depends(get_current_user),
    conn=Depends(get_db)
):

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT id,title
            FROM conversations
            WHERE user_id=%s
            AND title ILIKE %s
            ORDER BY created_at DESC
            LIMIT 20
            """,
            (user_id, f"%{q}%")
        )

        rows = cur.fetchall()

    return rows
