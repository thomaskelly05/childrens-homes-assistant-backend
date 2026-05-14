from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from auth.errors import unauthorised
from auth.permissions import require_assistant_access
from db.connection import get_db
from services.assistant_security import safe_int, safe_string

router = APIRouter(prefix="/assistant/conversations", tags=["Assistant Conversations"])


class AssistantConversationPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(..., min_length=1, max_length=120)
    title: str = Field(default="New conversation", max_length=240)
    messages: list[dict[str, Any]] = Field(default_factory=list)
    createdAt: str | None = None
    updatedAt: str | None = None


def _safe_user_id(current_user: dict[str, Any]) -> int:
    user_id = safe_int(current_user.get("user_id") or current_user.get("id"))
    if user_id is None:
        raise unauthorised("not_authenticated", "Authentication required.")
    return user_id


def _ensure_table(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS assistant_conversations (
                id TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL DEFAULT 'New conversation',
                messages JSONB NOT NULL DEFAULT '[]'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (id, user_id)
            )
            """
        )
        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS assistant_conversations_user_updated_idx
            ON assistant_conversations (user_id, updated_at DESC)
            """
        )


def _normalise_message(message: dict[str, Any]) -> dict[str, Any]:
    role = safe_string(message.get("role")) or "assistant"
    if role not in {"user", "assistant", "system"}:
        role = "assistant"

    return {
        "id": safe_string(message.get("id"))[:120] or None,
        "role": role,
        "content": safe_string(message.get("content"))[:80000],
        "createdAt": safe_string(message.get("createdAt")) or None,
        "streaming": False,
    }


def _row_to_payload(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "messages": row.get("messages") or [],
        "createdAt": row["created_at"].isoformat() if row.get("created_at") else None,
        "updatedAt": row["updated_at"].isoformat() if row.get("updated_at") else None,
    }


@router.get("")
def list_assistant_conversations(current_user=Depends(require_assistant_access), conn=Depends(get_db)):
    user_id = _safe_user_id(current_user)
    _ensure_table(conn)

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, title, messages, created_at, updated_at
            FROM assistant_conversations
            WHERE user_id = %s
            ORDER BY updated_at DESC
            LIMIT 80
            """,
            (user_id,),
        )
        rows = cur.fetchall()

    return [_row_to_payload(row) for row in rows]


@router.put("/{conversation_id}")
def save_assistant_conversation(
    conversation_id: str,
    payload: AssistantConversationPayload,
    current_user=Depends(require_assistant_access),
    conn=Depends(get_db),
):
    user_id = _safe_user_id(current_user)
    conversation_id = safe_string(conversation_id)[:120]
    if not conversation_id:
        raise HTTPException(status_code=400, detail="Conversation id is required.")

    _ensure_table(conn)

    title = safe_string(payload.title)[:240] or "New conversation"
    messages = [_normalise_message(item) for item in payload.messages[:200] if isinstance(item, dict)]

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO assistant_conversations (id, user_id, title, messages, created_at, updated_at)
            VALUES (%s, %s, %s, %s::jsonb, NOW(), NOW())
            ON CONFLICT (id, user_id) DO UPDATE SET
                title = EXCLUDED.title,
                messages = EXCLUDED.messages,
                updated_at = NOW()
            RETURNING id, title, messages, created_at, updated_at
            """,
            (conversation_id, user_id, title, json.dumps(messages)),
        )
        row = cur.fetchone()

    return _row_to_payload(row)


@router.delete("/{conversation_id}")
def delete_assistant_conversation(
    conversation_id: str,
    current_user=Depends(require_assistant_access),
    conn=Depends(get_db),
):
    user_id = _safe_user_id(current_user)
    _ensure_table(conn)

    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM assistant_conversations WHERE id = %s AND user_id = %s",
            (safe_string(conversation_id)[:120], user_id),
        )

    return {"ok": True}
