from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from auth.permissions import require_assistant_access
from services.assistant_general_service import generate_general_assistant_stream
from services.assistant_security import normalise_history, safe_int, safe_string

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/assistant/general-safe", tags=["General Assistant Safe Mode"])


class SafeAssistantRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=80000)
    response_mode: str | None = "balanced"
    history: list[dict[str, Any]] | None = None
    conversation_id: str | None = None
    project_id: str | None = None
    document_text: str | None = None
    document_name: str | None = None


def _user_id(current_user: dict[str, Any]) -> int | None:
    return safe_int(current_user.get("user_id") or current_user.get("id"))


@router.post("")
async def safe_assistant_response(
    payload: SafeAssistantRequest,
    current_user: dict[str, Any] = Depends(require_assistant_access),
):
    """Fallback JSON route used when SSE streaming is unavailable.

    This keeps the assistant usable even if the richer streaming/orchestrator path fails.
    It intentionally avoids extra orchestration so one broken advanced layer cannot stop
    core conversation.
    """
    user_id = _user_id(current_user)
    history = normalise_history(payload.history, max_items=10, max_chars=1800)
    message = safe_string(payload.message)
    if payload.document_text:
        message = f"{message}\n\nUser supplied document context ({safe_string(payload.document_name) or 'document'}):\n{safe_string(payload.document_text)[:30000]}"

    answer_parts: list[str] = []
    try:
        async for item in generate_general_assistant_stream(
            message=message,
            history=history,
            response_mode=payload.response_mode or "balanced",
            user_id=user_id,
            conversation_id=payload.conversation_id or "safe-mode",
        ):
            if isinstance(item, dict) and item.get("type") == "token":
                content = item.get("content")
                if isinstance(content, str):
                    answer_parts.append(content)
    except Exception as exc:
        logger.exception("Safe assistant fallback generation failed: %s", exc)

    answer = "".join(answer_parts).strip()
    if not answer:
        answer = (
            "I’m here and the assistant is running in safe mode. "
            "The advanced streaming layer had a problem, but we can still work through this. "
            "Send the question again in a shorter form and I’ll help you structure it clearly."
        )

    return {
        "ok": True,
        "safe_mode": True,
        "answer": answer,
        "assistant_scope": {
            "assistant_mode": "general",
            "assistant_surface": "standalone",
            "scope": "safe_mode_core_assistant",
            "internal_data_access": False,
        },
        "assistant_context": {
            "safe_mode": True,
            "reason": "streaming fallback",
            "history_items_loaded": len(history),
        },
    }
