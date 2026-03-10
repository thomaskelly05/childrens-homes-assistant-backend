from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import StreamingResponse
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel

from db.connection import get_db
from auth.tokens import decode_session_token

from services.ai_service import generate_ai_stream

router = APIRouter(prefix="/chat", tags=["Chat"])


# --------------------------------------------------
# AUTH HELPER
# --------------------------------------------------

def get_user_id(request: Request):

    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_session_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid session")

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user")

    return user_id


# --------------------------------------------------
# AUTO CONVERSATION TITLE
# --------------------------------------------------

def generate_title(message: str):

    message = message.strip()

    if len(message) > 60:
        message = message[:60]

    return message


# --------------------------------------------------
# GET CONVERSATIONS
# --------------------------------------------------

@router.get("/conversations")
def conversations(request: Request, conn=Depends(get_db)):

    user_id = get_user_id(request)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT id,title
            FROM conversations
            WHERE user_id=%s
            ORDER BY created_at DESC
            """,
            (user_id,)
        )

        rows = cur.fetchall()

    return rows


# --------------------------------------------------
# LOAD CONVERSATION
# --------------------------------------------------

@router.get("/conversations/{cid}")
def load(cid: int, request: Request, conn=Depends(get_db)):

    get_user_id(request)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT role,message
            FROM messages
            WHERE conversation_id=%s
            ORDER BY created_at
            """,
            (cid,)
        )

        rows = cur.fetchall()

    return rows


# --------------------------------------------------
# CHAT STREAM
# --------------------------------------------------

@router.post("/")
async def chat(request: Request, conn=Depends(get_db)):

    user_id = get_user_id(request)

    body = await request.json()

    message = body["message"]
    cid = body.get("conversation_id")


    # --------------------------------------------------
    # CREATE CONVERSATION
    # --------------------------------------------------

    if not cid:

        title = generate_title(message)

        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute(
                """
                INSERT INTO conversations(user_id,title)
                VALUES(%s,%s)
                RETURNING id
                """,
                (user_id, title)
            )

            cid = cur.fetchone()["id"]

        conn.commit()


    # --------------------------------------------------
    # SAVE USER MESSAGE
    # --------------------------------------------------

    with conn.cursor() as cur:

        cur.execute(
            """
            INSERT INTO messages(conversation_id,role,message)
            VALUES(%s,'user',%s)
            """,
            (cid, message)
        )

    conn.commit()


    # --------------------------------------------------
    # LOAD CONVERSATION HISTORY
    # --------------------------------------------------

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT role,message
            FROM messages
            WHERE conversation_id=%s
            ORDER BY created_at
            """,
            (cid,)
        )

        history = cur.fetchall()


    # --------------------------------------------------
    # STREAM AI RESPONSE
    # --------------------------------------------------

    async def stream():

        ai = ""

        async for token in generate_ai_stream(
            message=message,
            history=history
        ):

            ai += token
            yield token


        # SAVE AI MESSAGE

        with conn.cursor() as cur:

            cur.execute(
                """
                INSERT INTO messages(conversation_id,role,message)
                VALUES(%s,'assistant',%s)
                """,
                (cid, ai)
            )

        conn.commit()


    return StreamingResponse(stream(), media_type="text/plain")


# --------------------------------------------------
# RENAME CONVERSATION
# --------------------------------------------------

class RenameConversation(BaseModel):
    title: str


@router.post("/conversations/{conversation_id}/rename")
def rename_conversation(conversation_id: int, payload: RenameConversation, conn=Depends(get_db)):

    with conn.cursor() as cur:

        cur.execute(
            """
            UPDATE conversations
            SET title=%s
            WHERE id=%s
            """,
            (payload.title, conversation_id)
        )

        conn.commit()

    return {"status": "ok"}


# --------------------------------------------------
# DELETE CONVERSATION
# --------------------------------------------------

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, conn=Depends(get_db)):

    with conn.cursor() as cur:

        cur.execute(
            """
            DELETE FROM conversations
            WHERE id=%s
            """,
            (conversation_id,)
        )

        conn.commit()

    return {"status": "deleted"}
