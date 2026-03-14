from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel
import logging

from db.connection import get_db
from auth.dependencies import get_current_user
from services.ai_service import generate_ai_stream


router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)

logger = logging.getLogger(__name__)


class RenameConversation(BaseModel):
    title: str


class EditMessagePayload(BaseModel):
    message: str


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


def generate_title(message: str) -> str:
    cleaned = (message or "").strip()
    if len(cleaned) > 60:
        cleaned = cleaned[:60]
    return cleaned or "New chat"


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

    return rows


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

    return {
        "ok": True,
        "message": "Conversation renamed"
    }


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

    return {
        "ok": True,
        "message": "Conversation deleted"
    }


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
