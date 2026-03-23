import asyncio
import io
import json
import logging
import time
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

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
MAX_MESSAGE_CHARS = 20000
MAX_TITLE_CHARS = 120
MAX_DOCUMENT_TEXT_CHARS = 120000
MAX_HISTORY_MESSAGES = 16
HEARTBEAT_INTERVAL_SECONDS = 15


class RenameConversation(BaseModel):
    title: str = Field(min_length=1, max_length=MAX_TITLE_CHARS)


class EditMessagePayload(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    document_text: str | None = None
    document_name: str | None = Field(default=None, max_length=255)
    response_mode: Literal["quick", "balanced", "deep"] = "balanced"


class ChatRequestPayload(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    conversation_id: int | None = None
    document_text: str | None = None
    document_name: str | None = Field(default=None, max_length=255)
    response_mode: Literal["quick", "balanced", "deep"] = "balanced"


def ensure_conversation_owner(conn, conversation_id: int, user_id: int) -> None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id
            FROM conversations
            WHERE id = %s AND user_id = %s
            LIMIT 1
            """,
            (conversation_id, user_id),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Conversation not found")


def get_conversation_history(conn, conversation_id: int):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, role, message, created_at
            FROM messages
            WHERE conversation_id = %s
            ORDER BY created_at ASC, id ASC
            """,
            (conversation_id,),
        )
        return cur.fetchall()


def get_trimmed_conversation_history(conn, conversation_id: int):
    """
    Faster chat responses usually come from smaller prompts.
    Keep only the most recent message window, then re-sort oldest->newest.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, role, message, created_at
            FROM (
                SELECT id, role, message, created_at
                FROM messages
                WHERE conversation_id = %s
                ORDER BY created_at DESC, id DESC
                LIMIT %s
            ) recent_messages
            ORDER BY created_at ASC, id ASC
            """,
            (conversation_id, MAX_HISTORY_MESSAGES),
        )
        return cur.fetchall()


def get_conversation_document(conn, conversation_id: int):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, filename, document_text, created_at
            FROM conversation_documents
            WHERE conversation_id = %s
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """,
            (conversation_id,),
        )
        return cur.fetchone()


def normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def clip_text(value: str | None, max_chars: int) -> str | None:
    if value is None:
        return None
    if len(value) <= max_chars:
        return value
    return value[:max_chars]


def upsert_conversation_document(conn, conversation_id: int, filename: str, document_text: str):
    filename = normalise_optional_text(filename) or "document"
    document_text = clip_text(document_text, MAX_DOCUMENT_TEXT_CHARS) or ""

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id
            FROM conversation_documents
            WHERE conversation_id = %s
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """,
            (conversation_id,),
        )
        existing = cur.fetchone()

        if existing:
            cur.execute(
                """
                UPDATE conversation_documents
                SET filename = %s, document_text = %s, created_at = NOW()
                WHERE id = %s
                RETURNING id, filename, document_text, created_at
                """,
                (filename, document_text, existing["id"]),
            )
            return cur.fetchone()

        cur.execute(
            """
            INSERT INTO conversation_documents (conversation_id, filename, document_text)
            VALUES (%s, %s, %s)
            RETURNING id, filename, document_text, created_at
            """,
            (conversation_id, filename, document_text),
        )
        return cur.fetchone()


def delete_conversation_document(conn, conversation_id: int):
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM conversation_documents WHERE conversation_id = %s",
            (conversation_id,),
        )


def generate_title(message: str) -> str:
    cleaned = " ".join((message or "").strip().split())
    if len(cleaned) > MAX_TITLE_CHARS:
        cleaned = cleaned[:MAX_TITLE_CHARS].rstrip()
    return cleaned or "New chat"


def prep_chat_db_sync(conn, user_id, message, conversation_id, document_text, document_name):
    if conversation_id is None:
        title = generate_title(message)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO conversations (user_id, title)
                VALUES (%s, %s)
                RETURNING id
                """,
                (user_id, title),
            )
            conversation_id = cur.fetchone()["id"]
    else:
        ensure_conversation_owner(conn, conversation_id, user_id)

    if document_text and document_name:
        upsert_conversation_document(conn, conversation_id, document_name, document_text)

    stored_document = get_conversation_document(conn, conversation_id)
    doc_text = stored_document["document_text"] if stored_document else None
    doc_name = stored_document["filename"] if stored_document else None

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO messages (conversation_id, role, message)
            VALUES (%s, 'user', %s)
            """,
            (conversation_id, message),
        )

    # Use trimmed history for faster model calls.
    history = get_trimmed_conversation_history(conn, conversation_id)
    doc_text = clip_text(doc_text, MAX_DOCUMENT_TEXT_CHARS)

    return conversation_id, history, doc_text, doc_name


def prep_edit_db_sync(conn, user_id, message_id, new_message, document_text, document_name):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT m.id, m.conversation_id, m.role
            FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            WHERE m.id = %s AND c.user_id = %s
            LIMIT 1
            """,
            (message_id, user_id),
        )
        row = cur.fetchone()

    if not row:
        raise ValueError("Message not found")
    if row["role"] != "user":
        raise ValueError("Only user messages can be edited")

    conversation_id = row["conversation_id"]
    ensure_conversation_owner(conn, conversation_id, user_id)

    if document_text and document_name:
        upsert_conversation_document(conn, conversation_id, document_name, document_text)

    stored_document = get_conversation_document(conn, conversation_id)
    doc_text = stored_document["document_text"] if stored_document else None
    doc_name = stored_document["filename"] if stored_document else None

    with conn.cursor() as cur:
        cur.execute(
            "UPDATE messages SET message = %s WHERE id = %s",
            (new_message, message_id),
        )
        cur.execute(
            "DELETE FROM messages WHERE conversation_id = %s AND id > %s",
            (conversation_id, message_id),
        )

    history = get_trimmed_conversation_history(conn, conversation_id)
    doc_text = clip_text(doc_text, MAX_DOCUMENT_TEXT_CHARS)

    return conversation_id, history, doc_text, doc_name


def save_ai_message_sync(conversation_id: int, ai_text: str):
    ai_text = clip_text(ai_text, 200000) or ""

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO messages (conversation_id, role, message)
                VALUES (%s, 'assistant', %s)
                """,
                (conversation_id, ai_text),
            )
        conn.commit()
    except Exception:
        if conn is not None and not conn.closed:
            conn.rollback()
        logger.exception("Failed to save assistant message for conversation_id=%s", conversation_id)
    finally:
        release_db_connection(conn)


def extract_text_from_txt(file_bytes: bytes) -> str:
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return file_bytes.decode("latin-1", errors="ignore")


def extract_text_from_docx(file_bytes: bytes) -> str:
    if Document is None:
        raise HTTPException(status_code=500, detail="DOCX support is not installed on the server")

    document = Document(io.BytesIO(file_bytes))
    parts: list[str] = []

    for paragraph in document.paragraphs:
        text = (paragraph.text or "").strip()
        if text:
            parts.append(text)

    for table in document.tables:
        for row in table.rows:
            cells = []
            for cell in row.cells:
                value = (cell.text or "").strip()
                if value:
                    cells.append(value)
            if cells:
                parts.append(" | ".join(cells))

    return "\n".join(parts).strip()


def extract_text_from_pdf(file_bytes: bytes) -> str:
    if PdfReader is None:
        raise HTTPException(status_code=500, detail="PDF support is not installed on the server")

    reader = PdfReader(io.BytesIO(file_bytes))
    parts: list[str] = []

    for page in reader.pages:
        text = (page.extract_text() or "").strip()
        if text:
            parts.append(text)

    return "\n\n".join(parts).strip()


def extract_document_text(filename: str, file_bytes: bytes) -> str:
    lower = (filename or "").lower()

    if lower.endswith(".txt"):
        return extract_text_from_txt(file_bytes)
    if lower.endswith(".docx"):
        return extract_text_from_docx(file_bytes)
    if lower.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="No readable text found in PDF. The file may be scanned or image-based.",
            )
        return text

    raise HTTPException(
        status_code=400,
        detail="Unsupported file type. Please upload a .txt, .docx, or .pdf file.",
    )


def sse_data(payload: str) -> str:
    safe_payload = (payload or "").replace("\r\n", "\n").replace("\r", "\n")
    return "".join(f"data: {line}\n" for line in safe_payload.split("\n")) + "\n"


def sse_event(event_name: str, payload: str) -> str:
    safe_payload = (payload or "").replace("\r\n", "\n").replace("\r", "\n")
    lines = [f"event: {event_name}\n"]
    lines.extend(f"data: {line}\n" for line in safe_payload.split("\n"))
    lines.append("\n")
    return "".join(lines)


def sse_done() -> str:
    return "event: done\ndata: [DONE]\n\n"


async def stream_with_heartbeat(token_stream, *, heartbeat_interval: int = HEARTBEAT_INTERVAL_SECONDS):
    pending_task = asyncio.create_task(token_stream.__anext__())

    try:
        while True:
            done, _pending = await asyncio.wait(
                {pending_task},
                timeout=heartbeat_interval,
                return_when=asyncio.FIRST_COMPLETED,
            )

            if pending_task in done:
                try:
                    token = pending_task.result()
                except StopAsyncIteration:
                    break

                if token:
                    yield token

                pending_task = asyncio.create_task(token_stream.__anext__())
            else:
                yield ": ping\n\n"
    finally:
        if not pending_task.done():
            pending_task.cancel()
            with contextlib.suppress(Exception):
                await pending_task


def build_streaming_response(streamer):
    return StreamingResponse(
        streamer,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
