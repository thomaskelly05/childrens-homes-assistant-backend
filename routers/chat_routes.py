from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import StreamingResponse
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel
import logging

from db.connection import get_db
from auth.dependencies import get_current_user
from services.ai_service import generate_ai_stream


router = APIRouter(prefix="/chat", tags=["Chat"])
logger = logging.getLogger(__name__)


# --------------------------------------------------
# CONVERSATION ACCESS CHECK
# --------------------------------------------------

def ensure_conversation_owner(conn, conversation_id: int, user_id: int):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id
            FROM conversations
            WHERE id = %s AND user_id = %s
            """,
            (conversation_id, user_id)
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Conversation not found")


# --------------------------------------------------
# LOAD CONVERSATION HISTORY
# --------------------------------------------------

def get_conversation_history(conn, conversation_id: int):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT role, message
            FROM messages
            WHERE conversation_id = %s
            ORDER BY created_at ASC, id ASC
            """,
            (conversation_id,)
        )
        rows = cur.fetchall()

    return rows


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
def conversations(
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = current_user["user_id"]

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
        rows = cur.fetchall()

    return rows


# --------------------------------------------------
# LOAD CONVERSATION
# --------------------------------------------------

@router.get("/conversations/{cid}")
def load(
    cid: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = current_user["user_id"]
    ensure_conversation_owner(conn, cid, user_id)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT role, message
            FROM messages
            WHERE conversation_id = %s
            ORDER BY created_at ASC, id ASC
            """,
            (cid,)
        )
        rows = cur.fetchall()

    return rows


# --------------------------------------------------
# CHAT STREAM
# --------------------------------------------------

@router.post("/")
async def chat(
    request: Request,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = current_user["user_id"]
    body = await request.json()

    message = (body.get("message") or "").strip()
    cid = body.get("conversation_id")

    if not message:
        raise HTTPException(status_code=400, detail="Message required")

    # --------------------------------------------------
    # CREATE OR VERIFY CONVERSATION
    # --------------------------------------------------

    if not cid:
        title = generate_title(message)

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO conversations (user_id, title)
                VALUES (%s, %s)
                RETURNING id
                """,
                (user_id, title)
            )
            cid = cur.fetchone()["id"]

        conn.commit()
    else:
        cid = int(cid)
        ensure_conversation_owner(conn, cid, user_id)

    # --------------------------------------------------
    # SAVE USER MESSAGE
    # --------------------------------------------------

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO messages (conversation_id, role, message)
            VALUES (%s, 'user', %s)
            """,
            (cid, message)
        )
    conn.commit()

    history = get_conversation_history(conn, cid)

    # --------------------------------------------------
    # STREAM AI RESPONSE
    # --------------------------------------------------

    async def stream():
        ai = ""

        try:
            yield ""

            async for token in generate_ai_stream(
                message=message,
                session_id=str(cid),
                history=history,
            ):
                if token:
                    ai += token
                    yield token

        except Exception as e:
            logger.exception("AI stream failed for conversation %s: %s", cid, e)

            error_text = (
                "\n\nSorry, something went wrong while generating the response. "
                "Please try again."
            )

            ai += error_text
            yield error_text

        finally:
            if ai.strip():
                try:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            INSERT INTO messages (conversation_id, role, message)
                            VALUES (%s, 'assistant', %s)
                            """,
                            (cid, ai)
                        )
                    conn.commit()
                except Exception:
                    logger.exception("Failed to save assistant message for conversation %s", cid)
                    conn.rollback()

    return StreamingResponse(stream(), media_type="text/plain; charset=utf-8")


# --------------------------------------------------
# RENAME CONVERSATION
# --------------------------------------------------

class RenameConversation(BaseModel):
    title: str


@router.post("/conversations/{conversation_id}/rename")
def rename_conversation(
    conversation_id: int,
    payload: RenameConversation,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = current_user["user_id"]
    ensure_conversation_owner(conn, conversation_id, user_id)

    title = payload.title.strip()

    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE conversations
            SET title = %s
            WHERE id = %s
            """,
            (title, conversation_id)
        )
        conn.commit()

    return {"status": "ok"}


# --------------------------------------------------
# DELETE CONVERSATION
# --------------------------------------------------

@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = current_user["user_id"]
    ensure_conversation_owner(conn, conversation_id, user_id)

    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM conversations
            WHERE id = %s
            """,
            (conversation_id,)
        )
        conn.commit()

    return {"status": "deleted"}
