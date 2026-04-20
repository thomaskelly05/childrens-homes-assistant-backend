from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

from auth.current_user import get_current_user
from services.assistant_general_service import generate_general_assistant_stream
from services.assistant_security import normalise_history, safe_int, safe_string

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assistant/general", tags=["General Assistant"])


class GeneralAssistantRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(..., min_length=1, max_length=3000)
    response_mode: str | None = "balanced"
    history: list[dict[str, Any]] | None = None
    conversation_id: str | None = None


def _safe_user_id(current_user: dict[str, Any]) -> int:
    user_id = safe_int(current_user.get("user_id") or current_user.get("id"))
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user_id


def _sse_message(data: str) -> str:
    safe = (data or "").replace("\r\n", "\n").replace("\r", "\n")
    return "".join(f"data: {line}\n" for line in safe.split("\n")) + "\n"


def _sse_event(event: str, payload: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _sse_done() -> str:
    return "event: done\ndata: [DONE]\n\n"


@router.post("/stream")
async def stream_general_assistant(
    payload: GeneralAssistantRequest,
    current_user=Depends(get_current_user),
):
    user_id = _safe_user_id(current_user)
    history = normalise_history(payload.history, max_items=12, max_chars=1600)
    conversation_id = safe_string(payload.conversation_id) or f"general-{user_id}"

    async def _stream():
        sources: list[dict[str, Any]] = []
        runtime: dict[str, Any] = {}
        explainability: dict[str, Any] = {}
        assistant_scope: dict[str, Any] = {
            "assistant_mode": "general",
            "scope": "global",
            "scope_type": "global",
            "internal_data_access": False,
        }
        assistant_context: dict[str, Any] = {
            "guidance_only": True,
            "history_items_loaded": len(history),
        }
        suggested_actions: list[str] = []

        try:
            async for item in generate_general_assistant_stream(
                message=payload.message,
                history=history,
                response_mode=payload.response_mode or "balanced",
                user_id=user_id,
                conversation_id=conversation_id,
            ):
                if not isinstance(item, dict):
                    continue

                item_type = item.get("type")

                if item_type == "progress":
                    content = safe_string(item.get("content"))
                    if content:
                        yield _sse_event("progress", {"content": content})
                    continue

                if item_type == "token":
                    content = safe_string(item.get("content"))
                    if content:
                        yield _sse_message(content)
                    continue

                if item_type == "meta":
                    if isinstance(item.get("sources"), list):
                        sources = item.get("sources") or []
                    if isinstance(item.get("runtime"), dict):
                        runtime = item.get("runtime") or {}
                    if isinstance(item.get("explainability"), dict):
                        explainability = item.get("explainability") or {}
                    if isinstance(item.get("assistant_scope"), dict):
                        assistant_scope = item.get("assistant_scope") or assistant_scope
                    if isinstance(item.get("assistant_context"), dict):
                        assistant_context = item.get("assistant_context") or assistant_context
                    if isinstance(item.get("suggested_actions"), list):
                        suggested_actions = [
                            safe_string(action)
                            for action in item.get("suggested_actions")
                            if safe_string(action)
                        ]
                    continue

        except Exception:
            logger.exception("General assistant stream failed")
            yield _sse_message(
                "I could not complete that guidance response just now. Please try again."
            )
        finally:
            yield _sse_event(
                "meta",
                {
                    "sources": sources,
                    "runtime": runtime,
                    "explainability": explainability,
                    "assistant_scope": assistant_scope,
                    "assistant_context": assistant_context,
                    "suggested_actions": suggested_actions,
                },
            )
            yield _sse_done()

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
