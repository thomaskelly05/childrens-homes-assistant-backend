from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from psycopg2.extras import RealDictCursor
from db.connection import get_db
from assistant.streaming import run_chat_stream

router = APIRouter()


@router.post("/chat")
def chat(payload: dict, conn=Depends(get_db)):

    user_message = payload["message"]
    user_id = payload.get("user_id", 1)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        # Load previous messages for conversation memory
        cur.execute(
            """
            SELECT role, message
            FROM conversations
            WHERE user_id = %s
            ORDER BY created_at ASC
            LIMIT 20
            """,
            (user_id,)
        )

        history = cur.fetchall()

    # System prompt for safeguarding-aware responses
    messages = [
        {
            "role": "system",
            "content": (
                "You are an assistant helping staff working in UK children's homes. "
                "Provide trauma-informed, safeguarding-aware guidance. "
                "Support behaviour management, safeguarding practice, and reflective care."
            )
        }
    ]

    # Add conversation history
    for h in history:
        messages.append({
            "role": h["role"],
            "content": h["message"]
        })

    # Add current user message
    messages.append({
        "role": "user",
        "content": user_message
    })

    def stream_and_save():

        full_response = ""

        # Run AI streaming response
        for chunk in run_chat_stream(messages, user_message):
            full_response += chunk
            yield chunk

        # Save conversation to database
        with conn.cursor() as cur:

            # Save user message
            cur.execute(
                """
                INSERT INTO conversations (user_id, role, message)
                VALUES (%s, 'user', %s)
                """,
                (user_id, user_message)
            )

            # Save assistant response
            cur.execute(
                """
                INSERT INTO conversations (user_id, role, message)
                VALUES (%s, 'assistant', %s)
                """,
                (user_id, full_response)
            )

            conn.commit()

    return StreamingResponse(stream_and_save(), media_type="text/plain")
