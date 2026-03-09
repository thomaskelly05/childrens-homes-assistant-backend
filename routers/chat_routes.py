from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import StreamingResponse
from psycopg2.extras import RealDictCursor

from db.connection import get_db
from auth.tokens import decode_session_token

import asyncio

router = APIRouter(prefix="/chat", tags=["Chat"])


# ---------------------------------------------------------
# GET CONVERSATIONS
# ---------------------------------------------------------

@router.get("/conversations")
def get_conversations(request: Request, conn=Depends(get_db)):

    token = request.cookies.get("access_token")

    payload = decode_session_token(token)

    user_id = payload["sub"]

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT id, title
            FROM conversations
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,)
        )

        conversations = cur.fetchall()

    return conversations


# ---------------------------------------------------------
# LOAD MESSAGES
# ---------------------------------------------------------

@router.get("/conversations/{conversation_id}")
def get_messages(conversation_id: int, conn=Depends(get_db)):

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT role, message
            FROM messages
            WHERE conversation_id = %s
            ORDER BY created_at
            """,
            (conversation_id,)
        )

        messages = cur.fetchall()

    return messages


# ---------------------------------------------------------
# STREAM CHAT RESPONSE
# ---------------------------------------------------------

async def fake_ai_stream(message):

    response = f"Thanks for your message: {message}. IndiCare AI response placeholder."

    for word in response.split(" "):
        yield word + " "
        await asyncio.sleep(0.03)


@router.post("/")
async def chat(request: Request, conn=Depends(get_db)):

    body = await request.json()

    message = body.get("message")
    conversation_id = body.get("conversation_id")

    token = request.cookies.get("access_token")

    payload = decode_session_token(token)

    user_id = payload["sub"]

    # Create conversation if new
    if not conversation_id:

        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute(
                """
                INSERT INTO conversations (user_id, title)
                VALUES (%s, %s)
                RETURNING id
                """,
                (user_id, message[:40])
            )

            conversation_id = cur.fetchone()["id"]

        conn.commit()

    # Save user message
    with conn.cursor() as cur:

        cur.execute(
            """
            INSERT INTO messages (conversation_id, role, message)
            VALUES (%s, 'user', %s)
            """,
            (conversation_id, message)
        )

    conn.commit()

    async def stream():

        ai_response = ""

        async for token in fake_ai_stream(message):

            ai_response += token

            yield token

        # Save AI message
        with conn.cursor() as cur:

            cur.execute(
                """
                INSERT INTO messages (conversation_id, role, message)
                VALUES (%s, 'assistant', %s)
                """,
                (conversation_id, ai_response)
            )

        conn.commit()

    return StreamingResponse(stream(), media_type="text/plain")
