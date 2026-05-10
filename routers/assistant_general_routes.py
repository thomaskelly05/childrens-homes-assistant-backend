from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

from auth.current_user import get_current_user
from services.assistant_general_service import generate_general_assistant_stream
from services.assistant_security import normalise_history, safe_int, safe_string
from services.indicare_ai_orchestrator_service import IndiCareAIOrchestratorService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assistant/general", tags=["General Assistant"])
ui_router = APIRouter(tags=["Assistant UI"])
orchestrator_service = IndiCareAIOrchestratorService()

MAX_GENERAL_MESSAGE_CHARS = 80000
MAX_GENERAL_DOCUMENT_CHARS = 60000


class GeneralAssistantRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=MAX_GENERAL_MESSAGE_CHARS)
    response_mode: str | None = "balanced"
    history: list[dict[str, Any]] | None = None
    conversation_id: str | None = None
    assistant_surface: str | None = "standalone"
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


def _conversation_presence_prefix() -> str:
    return """
INDICARE AI CONVERSATIONAL PRESENCE:
You are IndiCare AI, a standalone AI tools platform for adults working in residential children's homes.
Sound like the best calm British colleague or experienced manager: warm, steady, practical, reflective and professionally grounded.
Do not be blunt, cold or transactional. Avoid sounding like a form, policy bot or generic chatbot.
Begin with a natural acknowledgement where appropriate, then help the user think clearly.
Keep answers conversational while still being useful and structured.
When the user sounds stressed, describes an incident, safeguarding concern, difficult shift, allegation, restraint, missing episode or conflict, slow the pace emotionally and guide them carefully.
Do not pretend to be human, conscious or emotionally self-aware. You can say you are here to help them think it through, but do not claim feelings or lived experience.
For residential childcare topics, use British English and child-centred, factual, non-judgemental language.
Do not make final safeguarding, legal, clinical, employment or regulatory decisions. Support manager/DSL/professional review.
When useful, separate facts, interpretation, missing information and next steps.
Never abruptly end. Close with one natural continuation, such as a helpful next step, a gentle question, or an offer to structure the next part together.
If live web context is supplied, use it naturally. Do not sound like a search results page; explain what you found and keep the conversation going.
If orchestrated IndiCare context is supplied, use it as the assistant's brain. Do not expose raw JSON. Be clear if context is limited or unavailable.
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
            project_id=safe_string(payload.project_id) or safe_string(payload.conversation_id) or "standalone",
            young_person_id=payload.young_person_id,
            home_id=payload.home_id,
            limit=8,
        )
    except Exception:
        logger.exception("IndiCare AI orchestrator context failed")
        return None


def _message_with_document(payload: GeneralAssistantRequest, current_user: dict[str, Any]) -> tuple[str, dict[str, Any] | None]:
    message = safe_string(payload.message)
    document_text = _clip(payload.document_text, MAX_GENERAL_DOCUMENT_CHARS)
    document_name = safe_string(payload.document_name) or "uploaded document"
    orchestrated = _orchestrator_context(payload, current_user)
    parts = [_conversation_presence_prefix()]

    if orchestrated and orchestrated.get("prompt_context"):
        parts.extend([
            "",
            str(orchestrated.get("prompt_context"))[:45000],
            "",
            "USER'S CURRENT MESSAGE:",
            message,
        ])
    else:
        parts.extend(["", message])

    if document_text:
        parts.extend([
            "",
            "USER-SUPPLIED DOCUMENT CONTEXT:",
            f"Document name: {document_name}",
            "Use this document only as user-provided context for this standalone assistant chat.",
            "",
            document_text,
        ])

    return "\n".join(parts), orchestrated


def _sse_message(data: str) -> str:
    safe = (data or "").replace("\r\n", "\n").replace("\r", "\n")
    return "".join(f"data: {line}\n" for line in safe.split("\n")) + "\n"


def _sse_event(event: str, payload: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n"


def _sse_done() -> str:
    return "event: done\ndata: [DONE]\n\n"


def _assistant_component_path() -> Path:
    return Path(__file__).resolve().parents[1] / "frontend" / "components" / "assistant.html"


def _inject_ofsted_ui_patch(html: str) -> str:
    scripts = [
        '<script src="/js/assistant-copilot-controller.js"></script>',
        '<script src="/js/assistant-action-bridge.js"></script>',
    ]

    for script in scripts:
        if script in html:
            continue
        if "</body>" in html:
            html = html.replace("</body>", f"  {script}\n</body>")
        else:
            html = f"{html}\n{script}\n"

    return html


@ui_router.get("/assistant", response_class=HTMLResponse)
@ui_router.get("/assistant.html", response_class=HTMLResponse)
def serve_standalone_assistant_with_ofsted_ui():
    path = _assistant_component_path()
    if not path.exists():
        raise HTTPException(status_code=404, detail="Assistant page not found.")
    html = path.read_text(encoding="utf-8")
    return HTMLResponse(_inject_ofsted_ui_patch(html))


@router.post("/stream")
async def stream_general_assistant(
    payload: GeneralAssistantRequest,
    current_user=Depends(get_current_user),
):
    user_id = _safe_user_id(current_user)
    history = normalise_history(payload.history, max_items=12, max_chars=2200)
    conversation_id = safe_string(payload.conversation_id) or f"general-{user_id}"
    message, orchestrated_context = _message_with_document(payload, current_user)

    async def _stream():
        sources: list[dict[str, Any]] = []
        runtime: dict[str, Any] = {}
        explainability: dict[str, Any] = {}
        assistant_scope: dict[str, Any] = {
            "assistant_mode": "general",
            "assistant_surface": "standalone",
            "scope": "indicare_ai_standalone_tools",
            "scope_type": "indicare_ai_standalone_tools",
            "internal_data_access": bool(orchestrated_context),
        }
        assistant_context: dict[str, Any] = {
            "guidance_only": True,
            "history_items_loaded": len(history),
            "document_attached": bool(payload.document_text),
            "document_name": safe_string(payload.document_name) or None,
            "conversation_presence": True,
            "orchestrator_enabled": bool(orchestrated_context),
            "orchestrator_project_id": (orchestrated_context or {}).get("project_id"),
            "orchestrator_surface": (orchestrated_context or {}).get("surface"),
            "orchestrator_sources": (orchestrated_context or {}).get("sources", []),
        }
        suggested_actions: list[dict[str, Any]] = []
        safeguarding: dict[str, Any] = {}
        boundary: dict[str, Any] = {}

        try:
            async for item in generate_general_assistant_stream(
                message=message,
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
                    content = item.get("content")
                    if isinstance(content, str) and content:
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
                        assistant_scope = {**assistant_scope, **(item.get("assistant_scope") or {})}
                    if isinstance(item.get("assistant_context"), dict):
                        assistant_context = {
                            **assistant_context,
                            **(item.get("assistant_context") or {}),
                            "document_attached": bool(payload.document_text),
                            "document_name": safe_string(payload.document_name) or None,
                            "conversation_presence": True,
                            "orchestrator_enabled": bool(orchestrated_context),
                            "orchestrator_project_id": (orchestrated_context or {}).get("project_id"),
                            "orchestrator_surface": (orchestrated_context or {}).get("surface"),
                            "orchestrator_sources": (orchestrated_context or {}).get("sources", []),
                        }
                    if isinstance(item.get("suggested_actions"), list):
                        suggested_actions = [
                            action
                            for action in item.get("suggested_actions")
                            if isinstance(action, dict) and safe_string(action.get("label"))
                        ]
                    if isinstance(item.get("safeguarding"), dict):
                        safeguarding = item.get("safeguarding") or {}
                    if isinstance(item.get("boundary"), dict):
                        boundary = item.get("boundary") or {}
                    continue

        except Exception:
            logger.exception("General assistant stream failed")
            yield _sse_message(
                "I’m sorry, I couldn’t complete that just now. Try again and we’ll work through it together."
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
                    "safeguarding": safeguarding,
                    "boundary": boundary,
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
