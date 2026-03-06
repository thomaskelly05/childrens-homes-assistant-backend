from fastapi import APIRouter, Depends
from psycopg2.extras import RealDictCursor
from db.connection import get_db
from assistant.streaming import run_chat_stream

router = APIRouter()

@router.post("/chat")
def chat(payload: dict, conn=Depends(get_db)):

    user_message = payload["message"]
    user_id = payload.get("user_id", 1)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        # load conversation memory

        cur.execute(
            """
            SELECT role, message
            FROM conversations
            WHERE user_id=%s
            ORDER BY created_at ASC
            LIMIT 20
            """,
            (user_id,)
        )

        history = cur.fetchall()

    messages = []

    for h in history:
        messages.append({
            "role": h["role"],
            "content": h["message"]
        })

    messages.append({
        "role": "user",
        "content": user_message
    })


    # run AI

    def stream_and_save():

        full_response = ""

        for chunk in run_chat_stream(messages):

            full_response += chunk
            yield chunk

        with conn.cursor() as cur:

            # save user message
            cur.execute(
                """
                INSERT INTO conversations (user_id, role, message)
                VALUES (%s,'user',%s)
                """,
                (user_id, user_message)
            )

            # save assistant message
            cur.execute(
                """
                INSERT INTO conversations (user_id, role, message)
                VALUES (%s,'assistant',%s)
                """,
                (user_id, full_response)
            )

            conn.commit()

    return stream_and_save()
