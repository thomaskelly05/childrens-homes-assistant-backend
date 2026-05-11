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
router = APIRouter(prefix="/indicare-ai", tags=["IndiCare.ai"])

MAX_MESSAGE_CHARS = 80000
MAX_DOCUMENT_CHARS = 60000
VALID_EXPERIENCES = {"assistant", "connect", "notes", "docs", "intelligence"}


class IndiCareAIRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_CHARS)
    response_mode: str | None = "balanced"
    history: list[dict[str, Any]] | None = None
    conversation_id: str | None = None
    experience: str | None = "assistant"
    document_text: str | None = None
    document_name: str | None = None


def _safe_user_id(current_user: dict[str, Any]) -> int:
    user_id = safe_int(current_user.get("user_id") or current_user.get("id"))
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user_id


def _clip(value: str | None, limit: int) -> str | None:
    clean = safe_string(value)
    return clean[:limit] if clean else None


def _normalise_experience(value: str | None) -> str:
    clean = safe_string(value).lower().replace("i-notes", "notes")
    return clean if clean in VALID_EXPERIENCES else "assistant"


def _presence(experience: str) -> str:
    labels = {
        "assistant": "Assistant: ChatGPT-style professional thinking, writing, guidance and reflection for adults working in children's homes.",
        "connect": "Connect: Microsoft Teams-style adult collaboration support, meeting summaries, communication drafting and action clarity.",
        "notes": "I-Notes: Beam/Magic Notes-style adult note capture, reflection, supervision preparation, meeting notes and professional writing transformation.",
        "docs": "Docs: Pages/Docs-style adult professional writing, policy drafting, supervision records, Ofsted preparation and communication support.",
        "intelligence": "Intelligence: Grok/Tesla-style immersive conversational reasoning for adults who want to think aloud, challenge assumptions, prepare, reflect and decide clearly.",
    }
    active = labels.get(experience, labels["assistant"])
    return f"""
INDICARE.AI PROFESSIONAL PRESENCE:
You are operating inside IndiCare.ai, a standalone AI-native professional workspace for adults working in residential children's homes.
Current experience: {active}

BOUNDARY:
IndiCare.ai is not the IndiCare OS assistant.
Do not behave like an operational monitoring system, child-record analytics engine, chronology intelligence engine, safeguarding pattern detector, risk surveillance tool or child behaviour analysis system.
Do not claim to access, monitor or analyse children's records unless the user explicitly supplies content in this conversation.
If the user needs record-specific OS intelligence, explain that this belongs in IndiCare OS.

ROLE:
Support adults: residential support workers, seniors, deputy managers, registered managers, responsible individuals, providers and leaders.
Help with professional thinking, writing, reflection, preparation, communication, supervision, leadership, Ofsted readiness, policy understanding, emotional decompression and decision support.
Sound like a calm, intelligent British professional colleague: warm, grounded, practical, reflective and clear.

STYLE:
Conversational first. Do not sound like a form, dashboard, compliance engine or generic chatbot.
For Intelligence, respond like a thoughtful spoken reasoning partner. It should feel natural for an adult to talk rather than type.
Use British English.
Be supportive without pretending to be human, conscious or emotionally self-aware.
Do not make final safeguarding, legal, clinical, employment or regulatory decisions. Help the adult think and prepare for the right professional review.
Never abruptly end. Keep the conversation open with one useful next step or gentle question where appropriate.
""".strip()


def _build_message(payload: IndiCareAIRequest) -> tuple[str, str]:
    experience = _normalise_experience(payload.experience)
    message = safe_string(payload.message)
    document_text = _clip(payload.document_text, MAX_DOCUMENT_CHARS)
    document_name = safe_string(payload.document_name) or "uploaded document"
    parts = [_presence(experience), "", "USER MESSAGE:", message]
    if document_text:
        parts.extend([
            "",
            "USER-SUPPLIED CONTEXT:",
            f"Document name: {document_name}",
            "Use this only as content the adult has supplied for support with writing, thinking or preparation inside IndiCare.ai.",
            "",
            document_text,
        ])
    return "\n".join(parts), experience


def _sse_message(data: str) -> str:
    safe = (data or "").replace("\r\n", "\n").replace("\r", "\n")
    return "".join(f"data: {line}\n" for line in safe.split("\n")) + "\n"


def _sse_event(event: str, payload: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n"


def _sse_done() -> str:
    return "event: done\ndata: [DONE]\n\n"


@router.post("/stream")
async def stream_indicare_ai(
    payload: IndiCareAIRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _safe_user_id(current_user)
    history = normalise_history(payload.history, max_items=14, max_chars=2400)
    message, experience = _build_message(payload)
    conversation_id = safe_string(payload.conversation_id) or f"indicare-ai-{experience}-{user_id}"

    async def _stream():
        try:
            async for item in generate_general_assistant_stream(
                message=message,
                history=history,
                response_mode=payload.response_mode or ("deep" if experience == "intelligence" else "balanced"),
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
                elif item_type == "token":
                    content = item.get("content")
                    if isinstance(content, str) and content:
                        yield _sse_message(content)
        except Exception:
            logger.exception("IndiCare.ai stream failed")
            yield _sse_message("I could not complete that just now. We can try again more simply.")
        finally:
            yield _sse_event("meta", {
                "surface": "indicare_ai",
                "experience": experience,
                "scope": "adult_professional_support",
                "os_assistant": False,
                "child_record_intelligence": False,
            })
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


@router.post("/safe")
async def safe_indicare_ai(
    payload: IndiCareAIRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _safe_user_id(current_user)
    history = normalise_history(payload.history, max_items=12, max_chars=2200)
    message, experience = _build_message(payload)
    answer_parts: list[str] = []
    try:
        async for item in generate_general_assistant_stream(
            message=message,
            history=history,
            response_mode=payload.response_mode or ("deep" if experience == "intelligence" else "balanced"),
            user_id=user_id,
            conversation_id=safe_string(payload.conversation_id) or f"indicare-ai-safe-{experience}-{user_id}",
        ):
            if isinstance(item, dict) and item.get("type") == "token" and isinstance(item.get("content"), str):
                answer_parts.append(item["content"])
    except Exception:
        logger.exception("IndiCare.ai safe response failed")

    answer = "".join(answer_parts).strip() or "I am here. Tell me what you want help thinking through, writing or preparing."
    return {
        "ok": True,
        "surface": "indicare_ai",
        "experience": experience,
        "scope": "adult_professional_support",
        "os_assistant": False,
        "child_record_intelligence": False,
        "answer": answer,
    }
