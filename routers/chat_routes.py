from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel
import logging
import io

from db.connection import get_db
from auth.dependencies import get_current_user
from services.ai_service import generate_ai_stream

try:
    from docx import Document
except Exception:
    Document = None

try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None


router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)

logger = logging.getLogger(__name__)


class RenameConversation(BaseModel):
    title: str


class EditMessagePayload(BaseModel):
    message: str
    document_text: str | None = None
    document_name: str | None = None


def ensure_conversation_owner(conn, conversation_id: int, user_id: int) -> None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id
            FROM conversations
            WHERE id = %s
              AND user_id = %s
            LIMIT 1
            """,
            (conversation_id, user_id)
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Conversation not found")


def get_conversation_history(conn, conversation_id: int):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, role, message
            FROM messages
            WHERE conversation_id = %s
            ORDER BY created_at ASC, id ASC
            """,
            (conversation_id,)
        )
        rows = cur.fetchall()

    return rows


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
            (conversation_id,)
        )
        row = cur.fetchone()

    return row


def upsert_conversation_document(conn, conversation_id: int, filename: str, document_text: str):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id
            FROM conversation_documents
            WHERE conversation_id = %s
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """,
            (conversation_id,)
        )
        existing = cur.fetchone()

        if existing:
            cur.execute(
                """
                UPDATE conversation_documents
                SET filename = %s,
                    document_text = %s,
                    created_at = NOW()
                WHERE id = %s
                RETURNING id, filename, document_text, created_at
                """,
                (filename, document_text, existing["id"])
            )
            row = cur.fetchone()
        else:
            cur.execute(
                """
                INSERT INTO conversation_documents (conversation_id, filename, document_text)
                VALUES (%s, %s, %s)
                RETURNING id, filename, document_text, created_at
                """,
                (conversation_id, filename, document_text)
            )
            row = cur.fetchone()

    conn.commit()
    return row


def delete_conversation_document(conn, conversation_id: int):
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM conversation_documents
            WHERE conversation_id = %s
            """,
            (conversation_id,)
        )
    conn.commit()


def generate_title(message: str) -> str:
    cleaned = (message or "").strip()
    if len(cleaned) > 60:
        cleaned = cleaned[:60]
    return cleaned or "New chat"


def extract_text_from_txt(file_bytes: bytes) -> str:
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return file_bytes.decode("latin-1", errors="ignore")


def extract_text_from_docx(file_bytes: bytes) -> str:
    if Document is None:
        raise HTTPException(
            status_code=500,
            detail="DOCX support is not installed on the server"
        )

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
        raise HTTPException(
            status_code=500,
            detail="PDF support is not installed on the server"
        )

    reader = PdfReader(io.BytesIO(file_bytes))
    parts = []

    for page in reader.pages:
        text = page.extract_text() or ""
        text = text.strip()
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
        return extract_text_from_pdf(file_bytes)

    raise HTTPException(
        status_code=400,
        detail="Unsupported file type. Please upload a .txt, .docx, or .pdf file."
    )


@router.post("/upload")
async def upload_chat_document(
    file: UploadFile = File(...),
    conversation_id: int | None = Form(default=None),
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    filename = file.filename or "document"
    contents = await file.read()

    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        extracted_text = extract_document_text(filename, contents)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Document extraction failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Could not read the uploaded document"
        )

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No readable text was found in the uploaded document"
        )

    if conversation_id is not None:
        ensure_conversation_owner(conn, conversation_id, current_user["user_id"])
        upsert_conversation_document(conn, conversation_id, filename, extracted_text)

    return {
        "ok": True,
        "filename": filename,
        "text": extracted_text,
        "preview": extracted_text[:1200]
    }


@router.get("/conversations")
def list_conversations(
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = current_user["user_id"]

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
        rows = cur.fetchall()

    return rows


@router.get("/conversations/{conversation_id}")
def load_conversation(
    conversation_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = current_user["user_id"]
    ensure_conversation_owner(conn, conversation_id, user_id)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, role, message
            FROM messages
            WHERE conversation_id = %s
            ORDER BY created_at ASC, id ASC
            """,
            (conversation_id,)
        )
        rows = cur.fetchall()

    document = get_conversation_document(conn, conversation_id)

    return {
        "messages": rows,
        "document": {
            "filename": document["filename"],
            "text": document["document_text"],
            "created_at": document["created_at"]
        } if document else None
    }


@router.delete("/conversations/{conversation_id}/document")
def remove_conversation_document(
    conversation_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    ensure_conversation_owner(conn, conversation_id, current_user["user_id"])
    delete_conversation_document(conn, conversation_id)

    return {
        "ok": True,
        "message": "Document removed"
    }


@router.post("/")
async def chat(
    request: Request,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = current_user["user_id"]

    body = await request.json()
    message = (body.get("message") or "").strip()
    conversation_id = body.get("conversation_id")
    document_text = (body.get("document_text") or "").strip() or None
    document_name = (body.get("document_name") or "").strip() or None

    if not message:
        raise HTTPException(status_code=400, detail="Message required")

    if conversation_id in ("", None):
        conversation_id = None

    if conversation_id is None:
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
            conversation_id = cur.fetchone()["id"]

        conn.commit()
    else:
        try:
            conversation_id = int(conversation_id)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Invalid conversation ID")

        ensure_conversation_owner(conn, conversation_id, user_id)

    if document_text and document_name:
        upsert_conversation_document(conn, conversation_id, document_name, document_text)

    stored_document = get_conversation_document(conn, conversation_id)
    if stored_document:
        document_text = stored_document["document_text"]
        document_name = stored_document["filename"]

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO messages (conversation_id, role, message)
            VALUES (%s, 'user', %s)
            """,
            (conversation_id, message)
        )
    conn.commit()

    history = get_conversation_history(conn, conversation_id)

    async def stream():
        ai_text = ""

        try:
            yield ""

            async for token in generate_ai_stream(
                message=message,
                session_id=str(conversation_id),
                history=history,
                document_text=document_text,
                document_name=document_name,
            ):
                if token:
                    ai_text += token
                    yield token

        except Exception as e:
            logger.exception(
                "AI stream failed for conversation %s: %s",
                conversation_id,
                e
            )

            fallback = (
                "\n\nSorry, something went wrong while generating the response. "
                "Please try again."
            )

            ai_text += fallback
            yield fallback

        finally:
            if ai_text.strip():
                try:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            INSERT INTO messages (conversation_id, role, message)
                            VALUES (%s, 'assistant', %s)
                            """,
                            (conversation_id, ai_text)
                        )
                    conn.commit()
                except Exception:
                    conn.rollback()
                    logger.exception(
                        "Failed to save assistant message for conversation %s",
                        conversation_id
                    )

    return StreamingResponse(
        stream(),
        media_type="text/plain; charset=utf-8"
    )


@router.post("/conversations/{conversation_id}/rename")
def rename_conversation(
    conversation_id: int,
    payload: RenameConversation,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    ensure_conversation_owner(conn, conversation_id, current_user["user_id"])

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

    return {"ok": True, "message": "Conversation renamed"}


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    ensure_conversation_owner(conn, conversation_id, current_user["user_id"])

    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM conversations
            WHERE id = %s
            """,
            (conversation_id,)
        )
        conn.commit()

    return {"ok": True, "message": "Conversation deleted"}


@router.post("/messages/{message_id}/edit")
async def edit_message_and_regenerate(
    message_id: int,
    payload: EditMessagePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = current_user["user_id"]
    new_message = payload.message.strip()

    if not new_message:
        raise HTTPException(status_code=400, detail="Message is required")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT m.id, m.conversation_id, m.role
            FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            WHERE m.id = %s
              AND c.user_id = %s
            LIMIT 1
            """,
            (message_id, user_id)
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Message not found")

    if row["role"] != "user":
        raise HTTPException(status_code=400, detail="Only user messages can be edited")

    conversation_id = row["conversation_id"]
    ensure_conversation_owner(conn, conversation_id, user_id)

    if payload.document_text and payload.document_name:
        upsert_conversation_document(
            conn,
            conversation_id,
            payload.document_name,
            payload.document_text
        )

    stored_document = get_conversation_document(conn, conversation_id)
    document_text = stored_document["document_text"] if stored_document else None
    document_name = stored_document["filename"] if stored_document else None

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE messages
            SET message = %s
            WHERE id = %s
            """,
            (new_message, message_id)
        )

        cur.execute(
            """
            DELETE FROM messages
            WHERE conversation_id = %s
              AND id > %s
            """,
            (conversation_id, message_id)
        )

    conn.commit()

    history = get_conversation_history(conn, conversation_id)

    async def stream():
        ai_text = ""

        try:
            yield ""

            async for token in generate_ai_stream(
                message=new_message,
                session_id=str(conversation_id),
                history=history,
                document_text=document_text,
                document_name=document_name,
            ):
                if token:
                    ai_text += token
                    yield token

        except Exception as e:
            logger.exception(
                "AI regenerate failed for conversation %s after editing message %s: %s",
                conversation_id,
                message_id,
                e
            )

            fallback = (
                "\n\nSorry, something went wrong while regenerating the response. "
                "Please try again."
            )

            ai_text += fallback
            yield fallback

        finally:
            if ai_text.strip():
                try:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            INSERT INTO messages (conversation_id, role, message)
                            VALUES (%s, 'assistant', %s)
                            """,
                            (conversation_id, ai_text)
                        )
                    conn.commit()
                except Exception:
                    conn.rollback()
                    logger.exception(
                        "Failed to save regenerated assistant message for conversation %s",
                        conversation_id
                    )

    return StreamingResponse(
        stream(),
        media_type="text/plain; charset=utf-8"
    )
