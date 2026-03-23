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
compat_router = APIRouter(tags=["Chat Compatibility"])

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

MAX_MESSAGE_CHARS = 20000
MAX_DOCUMENT_CHARS = 120000
MAX_HISTORY_MESSAGES = 12
HEARTBEAT_SECONDS = 15
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    conversation_id: int | None = None
    document_text: str | None = None
    document_name: str | None = None
    response_mode: Literal["quick", "balanced", "deep"] = "balanced"


class RenameConversation(BaseModel):
    title: str = Field(min_length=1, max_length=120)


class EditMessagePayload(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    document_text: str | None = None
    document_name: str | None = None
    response_mode: Literal["quick", "balanced", "deep"] = "balanced"


def clip(text: str | None, max_len: int):
    if not text:
        return None
    return text[:max_len]


def ensure_owner(conn, conversation_id: int, user_id: int):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM conversations WHERE id = %s AND user_id = %s LIMIT 1",
            (conversation_id, user_id),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Conversation not found")


def get_history(conn, conversation_id: int):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT role, message
            FROM (
                SELECT role, message, created_at, id
                FROM messages
                WHERE conversation_id = %s
                ORDER BY created_at DESC, id DESC
                LIMIT %s
            ) t
            ORDER BY created_at ASC, id ASC
            """,
            (conversation_id, MAX_HISTORY_MESSAGES),
        )
        return cur.fetchall()


def get_conversation_messages(conn, conversation_id: int):
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


def get_doc(conn, conversation_id: int):
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


def upsert_document(conn, conversation_id: int, filename: str, document_text: str):
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


def delete_document(conn, conversation_id: int):
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM conversation_documents WHERE conversation_id = %s",
            (conversation_id,),
        )


def generate_title(message: str) -> str:
    cleaned = " ".join((message or "").strip().split())
    return cleaned[:60] or "New chat"


def save_ai_message(conversation_id: int, text: str):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO messages (conversation_id, role, message) VALUES (%s, 'assistant', %s)",
                (conversation_id, clip(text, 200000)),
            )
        conn.commit()
    except Exception:
        logger.exception("Save AI message failed for conversation_id=%s", conversation_id)
        if conn and not conn.closed:
            conn.rollback()
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
    parts = []

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
    parts = []

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


def sse(data: str):
    safe = (data or "").replace("\r\n", "\n").replace("\r", "\n")
    return "".join(f"data: {line}\n" for line in safe.split("\n")) + "\n"


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

                if token:
                    yield token

                task = asyncio.create_task(generator.__anext__())
            else:
                yield ": ping\n\n"

    finally:
        if not task.done():
            task.cancel()
            with contextlib.suppress(Exception):
                await task


@router.post("/upload")
@limiter.limit("10/minute")
async def upload_chat_document(
    request: Request,
    file: UploadFile = File(...),
    conversation_id: int | None = Form(default=None),
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 5MB.")

    filename = file.filename or "document"
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        extracted_text = extract_document_text(filename, contents)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Document extraction failed")
        raise HTTPException(status_code=500, detail="Could not read the uploaded document")

    extracted_text = clip(extracted_text, MAX_DOCUMENT_CHARS)

    if not extracted_text or not extracted_text.strip():
        raise HTTPException(status_code=400, detail="No readable text was found in the uploaded document")

    if conversation_id is not None:
        ensure_owner(conn, conversation_id, current_user["user_id"])
        upsert_document(conn, conversation_id, filename, extracted_text)

    return {
        "ok": True,
        "filename": filename,
        "text": extracted_text,
        "preview": extracted_text[:1200],
    }


@router.get("/conversations")
def list_conversations(conn=Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["user_id"]

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, title, created_at
            FROM conversations
            WHERE user_id = %s
            ORDER BY created_at DESC, id DESC
            """,
            (user_id,),
        )
        rows = cur.fetchall()

    return rows


@router.get("/conversations/{conversation_id}")
def load_conversation(conversation_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["user_id"]
    ensure_owner(conn, conversation_id, user_id)

    rows = get_conversation_messages(conn, conversation_id)
    document = get_doc(conn, conversation_id)

    return {
        "messages": rows,
        "document": {
            "filename": document["filename"],
            "text": document["document_text"],
            "created_at": document["created_at"],
        } if document else None,
    }


@router.delete("/conversations/{conversation_id}/document")
def remove_conversation_document(conversation_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    ensure_owner(conn, conversation_id, current_user["user_id"])
    delete_document(conn, conversation_id)
    return {"ok": True, "message": "Document removed"}


@router.post("")
@router.post("/")
@limiter.limit("20/minute")
async def chat(
    request: Request,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = current_user["user_id"]

    try:
        raw = await request.json()
        body = ChatRequest(**raw)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request")

    message = body.message.strip()
    conversation_id = body.conversation_id
    document_text = clip(body.document_text, MAX_DOCUMENT_CHARS)
    document_name = body.document_name

    if not message:
        raise HTTPException(status_code=400, detail="Message required")

    try:
        if not conversation_id:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO conversations (user_id, title)
                    VALUES (%s, %s)
                    RETURNING id
                    """,
                    (user_id, generate_title(message)),
                )
                conversation_id = cur.fetchone()["id"]
        else:
            ensure_owner(conn, conversation_id, user_id)

        if document_text and document_name:
            upsert_document(conn, conversation_id, document_name, document_text)

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO messages (conversation_id, role, message)
                VALUES (%s, 'user', %s)
                """,
                (conversation_id, message),
            )

        history = get_history(conn, conversation_id)
        doc = get_doc(conn, conversation_id)

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed preparing chat request")
        raise HTTPException(status_code=500, detail="Could not prepare chat request")

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
            logger.exception("AI stream failed for conversation_id=%s", conversation_id)
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
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/conversations/{conversation_id}/rename")
def rename_conversation(
    conversation_id: int,
    payload: RenameConversation,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_owner(conn, conversation_id, current_user["user_id"])

    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    with conn.cursor() as cur:
        cur.execute(
            "UPDATE conversations SET title = %s WHERE id = %s",
            (title, conversation_id),
        )

    return {"ok": True, "message": "Conversation renamed"}


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    ensure_owner(conn, conversation_id, current_user["user_id"])

    with conn.cursor() as cur:
        cur.execute("DELETE FROM conversations WHERE id = %s", (conversation_id,))

    return {"ok": True, "message": "Conversation deleted"}


@router.post("/messages/{message_id}/edit")
@limiter.limit("20/minute")
async def edit_message_and_regenerate(
    request: Request,
    message_id: int,
    payload: EditMessagePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = current_user["user_id"]
    new_message = payload.message.strip()

    if not new_message:
        raise HTTPException(status_code=400, detail="Message is required")

    try:
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
            raise HTTPException(status_code=404, detail="Message not found")
        if row["role"] != "user":
            raise HTTPException(status_code=400, detail="Only user messages can be edited")

        conversation_id = row["conversation_id"]
        ensure_owner(conn, conversation_id, user_id)

        if payload.document_text and payload.document_name:
            upsert_document(
                conn,
                conversation_id,
                payload.document_name,
                clip(payload.document_text, MAX_DOCUMENT_CHARS),
            )

        with conn.cursor() as cur:
            cur.execute(
                "UPDATE messages SET message = %s WHERE id = %s",
                (new_message, message_id),
            )
            cur.execute(
                "DELETE FROM messages WHERE conversation_id = %s AND id > %s",
                (conversation_id, message_id),
            )

        history = get_history(conn, conversation_id)
        doc = get_doc(conn, conversation_id)

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed preparing regenerate request")
        raise HTTPException(status_code=500, detail="Could not prepare message regeneration")

    async def stream():
        ai_text = ""

        try:
            generator = generate_ai_stream(
                message=new_message,
                session_id=str(conversation_id),
                history=history,
                document_text=doc["document_text"] if doc else None,
                document_name=doc["filename"] if doc else None,
                response_mode=payload.response_mode,
            )

            async for token in stream_with_heartbeat(generator):
                ai_text += token
                yield sse(token)

        except Exception:
            logger.exception("AI regenerate failed for conversation_id=%s", conversation_id)
            fallback = "Sorry, something went wrong while regenerating."
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
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@compat_router.get("/conversations")
def compat_list_conversations(conn=Depends(get_db), current_user=Depends(get_current_user)):
    return list_conversations(conn=conn, current_user=current_user)


@compat_router.get("/conversations/{conversation_id}")
def compat_load_conversation(conversation_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    return load_conversation(conversation_id=conversation_id, conn=conn, current_user=current_user)


@compat_router.delete("/conversations/{conversation_id}")
def compat_delete_conversation(conversation_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    return delete_conversation(conversation_id=conversation_id, conn=conn, current_user=current_user)


@compat_router.post("/conversations/{conversation_id}/rename")
def compat_rename_conversation(
    conversation_id: int,
    payload: RenameConversation,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return rename_conversation(
        conversation_id=conversation_id,
        payload=payload,
        conn=conn,
        current_user=current_user,
    )


@compat_router.delete("/conversations/{conversation_id}/document")
def compat_remove_document(conversation_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    return remove_conversation_document(
        conversation_id=conversation_id,
        conn=conn,
        current_user=current_user,
    )
