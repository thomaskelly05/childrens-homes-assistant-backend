from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

from auth.permissions import require_assistant_access
from services.assistant_general_service import generate_general_assistant_stream
from services.assistant_security import normalise_history, safe_int, safe_string
from services.indicare_ai_orchestrator_service import IndiCareAIOrchestratorService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assistant/general", tags=["General Assistant"])
compat_router = APIRouter(tags=["Assistant Compatibility"])
ui_router = APIRouter(tags=["Assistant UI"])
orchestrator_service = IndiCareAIOrchestratorService()

MAX_GENERAL_MESSAGE_CHARS = 80000
MAX_GENERAL_DOCUMENT_CHARS = 60000
VALID_AI_SUITE_MODES = {"assistant", "connect", "docs", "notes", "intelligence"}


class GeneralAssistantRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=MAX_GENERAL_MESSAGE_CHARS)
    response_mode: str | None = "balanced"
    history: list[dict[str, Any]] | None = None
    conversation_id: str | None = None
    assistant_surface: str | None = "ai-suite"
    assistant_mode: str | None = "assistant"
    document_text: str | None = None
    document_name: str | None = None
    project_id: str | None = None
    young_person_id: int | None = None
    home_id: int | None = None
    use_orchestrator: bool | None = True


def _safe_user_id(current_user: dict[str, Any]) -> int:
    user_id = safe_int(current_user.get("user_id") or current_user.get("id"))
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user_id


def _clip(value: str | None, limit: int) -> str | None:
    clean = safe_string(value)
    if not clean:
        return None
    return clean[:limit]


def _normalise_ai_surface(value: str | None) -> str:
    clean = safe_string(value).lower()
    if clean in {"ai-suite", "assistant", "standalone", "indicare-ai"}:
        return "indicare-ai"
    return "indicare-ai"


def _normalise_ai_mode(value: str | None) -> str:
    clean = safe_string(value).lower().replace("i-notes", "notes")
    return clean if clean in VALID_AI_SUITE_MODES else "assistant"


def _conversation_presence_prefix(surface: str, mode: str) -> str:
    mode_labels = {
        "assistant": "Assistant: everyday AI support for residential children's home staff.",
        "connect": "Connect: Teams-style collaboration, meeting summaries, actions and follow-up communication.",
        "docs": "Docs: AI-native document drafting, rewriting, quality assurance and professional records.",
        "notes": "I-Notes: typed or voice note capture, transcript clean-up, handovers, chronologies and action extraction.",
        "intelligence": "Intelligence AI: deeper reasoning, analysis, comparison, chronology, evidence gaps, risk and leadership oversight.",
    }
    active_mode = mode_labels.get(mode, mode_labels["assistant"])
    return f"""
INDICARE AI SUITE CONVERSATIONAL PRESENCE:
You are operating inside the IndiCare AI Suite.
Current product surface: {surface}.
Current app mode: {active_mode}
""".strip()


def _orchestrator_context(payload: GeneralAssistantRequest, current_user: dict[str, Any]) -> dict[str, Any] | None:
    if payload.use_orchestrator is False:
        return None
    message = safe_string(payload.message)
    if not message or "INDICARE AI ORCHESTRATED BRAIN CONTEXT" in message:
        return None
    try:
        return orchestrator_service.build_context(
            question=message[:12000],
            current_user=current_user,
            project_id=safe_string(payload.project_id) or safe_string(payload.conversation_id) or "ai-suite",
            young_person_id=payload.young_person_id,
            home_id=payload.home_id,
            limit=8,
        )
    except Exception:
        logger.exception("IndiCare AI orchestrator context failed")
        return None


def _message_with_document(payload: GeneralAssistantRequest, current_user: dict[str, Any]) -> tuple[str, dict[str, Any] | None, str, str]:
    message = safe_string(payload.message)
    surface = _normalise_ai_surface(payload.assistant_surface)
    mode = _normalise_ai_mode(payload.assistant_mode)
    document_text = _clip(payload.document_text, MAX_GENERAL_DOCUMENT_CHARS)
    document_name = safe_string(payload.document_name) or "uploaded document"
    orchestrated = _orchestrator_context(payload, current_user)
    parts = [_conversation_presence_prefix(surface, mode)]

    if orchestrated and orchestrated.get("prompt_context"):
        parts.extend(["", str(orchestrated.get("prompt_context"))[:45000], "", "USER'S CURRENT MESSAGE:", message])
    else:
        parts.extend(["", message])

    if document_text:
        parts.extend(["", "USER-SUPPLIED DOCUMENT CONTEXT:", f"Document name: {document_name}", "", document_text])

    return "\n".join(parts), orchestrated, surface, mode


def _sse_message(data: str) -> str:
    safe = (data or "").replace("\r\n", "\n").replace("\r", "\n")
    return "".join(f"data: {line}\n" for line in safe.split("\n")) + "\n"


def _sse_event(event: str, payload: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n"


def _sse_done() -> str:
    return "event: done\ndata: [DONE]\n\n"


def _assistant_component_path() -> Path:
    return Path(__file__).resolve().parents[1] / "indicare-ai" / "assistant.html"


@ui_router.get("/assistant", response_class=HTMLResponse)
@ui_router.get("/assistant.html", response_class=HTMLResponse)
def serve_ai_suite_assistant():
    path = _assistant_component_path()
    if not path.exists():
        raise HTTPException(status_code=404, detail="Assistant page not found.")
    return HTMLResponse(path.read_text(encoding="utf-8"))


@router.post("/stream")
async def stream_general_assistant(
    payload: GeneralAssistantRequest,
    current_user=Depends(require_assistant_access),
):
    user_id = _safe_user_id(current_user)
    history = normalise_history(payload.history, max_items=12, max_chars=2200)
    conversation_id = safe_string(payload.conversation_id) or f"ai-suite-{user_id}"
    message, orchestrated_context, surface, mode = _message_with_document(payload, current_user)

    async def _stream():
        try:
            async for item in generate_general_assistant_stream(
                message=message,
                history=history,
                response_mode=payload.response_mode or "balanced",
                user_id=user_id,
                conversation_id=conversation_id,
            ):
                if isinstance(item, dict) and item.get("type") == "token":
                    content = item.get("content")
                    if isinstance(content, str) and content:
                        yield _sse_message(content)
        except Exception:
            logger.exception("General assistant stream failed")
            yield _sse_message("I’m sorry, I couldn’t complete that just now.")
        finally:
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


@compat_router.post("/assistant")
async def stream_assistant(
    payload: GeneralAssistantRequest,
    current_user=Depends(require_assistant_access),
):
    return await stream_general_assistant(payload, current_user)
