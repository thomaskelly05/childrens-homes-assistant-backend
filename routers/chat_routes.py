import asyncio
import contextlib
import io
import logging
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor
from slowapi import Limiter
from slowapi.util import get_remote_address

from auth.current_user import get_current_user
from db.connection import get_db, get_db_connection, release_db_connection
from services.ai_service import generate_ai_stream

try:
    from docx import Document
except Exception:
    Document = None

try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None

router = APIRouter(prefix="/chat", tags=["Chat"])

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

# =========================
# LIMITS (speed improvement)
# =========================
MAX_MESSAGE_CHARS = 20000
MAX_DOCUMENT_CHARS = 120000
MAX_HISTORY_MESSAGES = 12
HEARTBEAT_SECONDS = 15


# =========================
# MODELS
# =========================
class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    conversation_id: int | None = None
    document_text: str | None = None
    document_name: str | None = None
    response_mode: Literal["quick", "balanced", "deep"] = "balanced"


class RenameConversation(BaseModel):
    title: str = Field(min_length=1, max_length=120)


# =========================
# HELPERS
# =========================
def clip(text: str | None, max_len: int):
    if not text:
        return None
    return text[:max_len]


def ensure_owner(conn, conversation_id, user_id):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM conversations WHERE id=%s AND user_id=%s LIMIT 1",
            (conversation_id, user_id),
        )
        if not cur.fetchone():
            raise HTTPException(404, "Conversation not found")


def get_history(conn, conversation_id):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT role, message
            FROM (
                SELECT role, message
                FROM messages
                WHERE conversation_id=%s
                ORDER BY created_at DESC
                LIMIT %s
            ) t
            ORDER BY created_at ASC
            """,
            (conversation_id, MAX_HISTORY_MESSAGES),
        )
        return cur.fetchall()


def get_doc(conn, conversation_id):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT filename, document_text
            FROM conversation_documents
            WHERE conversation_id=%s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (conversation_id,),
        )
        return cur.fetchone()


def save_ai_message(conversation_id, text):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO messages (conversation_id, role, message) VALUES (%s,'assistant',%s)",
                (conversation_id, clip(text, 200000)),
            )
        conn.commit()
    except Exception:
        logger.exception("Save AI message failed")
        if conn:
            conn.rollback()
    finally:
        release_db_connection(conn)


def sse(data: str):
    return f"data: {data}\n\n"


def sse_done():
    return "event: done\ndata: [DONE]\n\n"


async def stream_with_heartbeat(generator):
    task = asyncio.create_task(generator.__anext__())

    try:
        while True:
            done, _ = await asyncio.wait(
                {task},
                timeout=HEARTBEAT_SECONDS,
                return_when=asyncio.FIRST_COMPLETED,
            )

            if task in done:
                try:
                    token = task.result()
                except StopAsyncIteration:
                    break

                yield token
                task = asyncio.create_task(generator.__anext__())
            else:
                yield ": ping\n\n"

    finally:
        if not task.done():
            task.cancel()
            with contextlib.suppress(Exception):
                await task


# =========================
# CHAT ROUTE (FAST + STABLE)
# =========================
@router.post("/")
@limiter.limit("20/minute")
async def chat(
    request: Request,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = current_user["user_id"]

    try:
        body = ChatRequest(**(await request.json()))
    except Exception:
        raise HTTPException(400, "Invalid request")

    message = body.message.strip()

    conversation_id = body.conversation_id
    document_text = clip(body.document_text, MAX_DOCUMENT_CHARS)
    document_name = body.document_name

    if not message:
        raise HTTPException(400, "Message required")

    # =========================
    # DB PREP (FAST)
    # =========================
    if not conversation_id:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO conversations (user_id, title) VALUES (%s,%s) RETURNING id",
                (user_id, message[:60]),
            )
            conversation_id = cur.fetchone()["id"]
    else:
        ensure_owner(conn, conversation_id, user_id)

    if document_text and document_name:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO conversation_documents (conversation_id, filename, document_text)
                VALUES (%s,%s,%s)
                ON CONFLICT DO NOTHING
                """,
                (conversation_id, document_name, document_text),
            )

    # save user message
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO messages (conversation_id, role, message) VALUES (%s,'user',%s)",
            (conversation_id, message),
        )

    history = get_history(conn, conversation_id)
    doc = get_doc(conn, conversation_id)

    # =========================
    # STREAM RESPONSE (FAST)
    # =========================
    async def stream():
        ai_text = ""

        try:
            generator = generate_ai_stream(
                message=message,
                session_id=str(conversation_id),
                history=history,
                document_text=doc["document_text"] if doc else None,
                document_name=doc["filename"] if doc else None,
                response_mode=body.response_mode,
            )

            async for token in stream_with_heartbeat(generator):
                ai_text += token
                yield sse(token)

        except Exception:
            logger.exception("AI failed")
            fallback = "Sorry, something went wrong."
            ai_text += fallback
            yield sse(fallback)

        finally:
            if ai_text.strip():
                save_ai_message(conversation_id, ai_text)

            yield sse_done()

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
