from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from auth.current_user import get_current_user
from db.connection import get_db
from routers.assistant_routes import (
    HomeAssistantPayload,
    QualityAssistantPayload,
    ReportSendPayload,
    YoungPersonAssistantPayload,
    ask_home_assistant as _legacy_ask_home_assistant,
    ask_quality_assistant as _legacy_ask_quality_assistant,
    preview_report as _legacy_preview_report,
    send_report_now as _legacy_send_report_now,
)
from services.ai_service import generate_ai_stream
from services.assistant_security import (
    contains_prompt_injection_attempt,
    role_can_access_scope,
    safe_string,
)
from services.young_people_assistant_context_service import (
    build_young_person_assistant_context,
)

router = APIRouter(prefix="/assistant/os", tags=["OS Assistant"])

MAX_ASSISTANT_MESSAGE_CHARS = 6000


def _normalise_role(current_user: dict[str, Any]) -> str:
    return safe_string(current_user.get("role")).lower()


def _safe_user_id(current_user: dict[str, Any]) -> int | None:
    raw_user_id = (
        current_user.get("id")
        or current_user.get("user_id")
        or current_user.get("sub")
    )

    try:
        return int(raw_user_id)
    except (TypeError, ValueError):
        return None


def _safe_home_id(current_user: dict[str, Any]) -> int | None:
    raw_home_id = (
        current_user.get("home_id")
        or current_user.get("selected_home_id")
        or current_user.get("default_home_id")
    )

    try:
        return int(raw_home_id)
    except (TypeError, ValueError):
        return None


def _assert_scope_access(current_user: dict[str, Any], scope: str) -> None:
    role = _normalise_role(current_user)

    if not role_can_access_scope(role, scope):
        raise HTTPException(
            status_code=403,
            detail="Role does not have access to requested scope.",
        )


def _assert_authenticated_user(current_user: dict[str, Any]) -> None:
    if not isinstance(current_user, dict) or not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    if _safe_user_id(current_user) is None:
        raise HTTPException(status_code=401, detail="Valid authenticated user required.")


def _assert_safe_message(message: str) -> None:
    clean_message = safe_string(message)

    if not clean_message:
        raise HTTPException(status_code=400, detail="Message is required.")

    if len(clean_message) > MAX_ASSISTANT_MESSAGE_CHARS:
        raise HTTPException(
            status_code=413,
            detail=f"Message is too long. Maximum length is {MAX_ASSISTANT_MESSAGE_CHARS} characters.",
        )

    if contains_prompt_injection_attempt(clean_message):
        raise HTTPException(
            status_code=400,
            detail="Prompt injection attempt detected.",
        )


def _assert_home_context_for_scope(
    current_user: dict[str, Any],
    scope: str,
) -> None:
    role = _normalise_role(current_user)

    if role in {"super_admin", "superadmin", "admin", "administrator", "provider_admin"}:
        return

    if scope in {"child", "home"} and _safe_home_id(current_user) is None:
        raise HTTPException(
            status_code=403,
            detail="No home context is available for this assistant scope.",
        )


def _preflight_assistant_request(
    *,
    current_user: dict[str, Any],
    scope: str,
    message: str,
) -> None:
    _assert_authenticated_user(current_user)
    _assert_scope_access(current_user, scope)
    _assert_home_context_for_scope(current_user, scope)
    _assert_safe_message(message)


def _sse_message(data: str) -> str:
    safe = (data or "").replace("\r\n", "\n").replace("\r", "\n")
    return "".join(f"data: {line}\n" for line in safe.split("\n")) + "\n"


def _sse_event(event: str, payload: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _sse_done() -> str:
    return "event: done\ndata: [DONE]\n\n"


def _stream_headers() -> dict[str, str]:
    return {
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }


def _compact_context_for_prompt(context: dict[str, Any]) -> dict[str, Any]:
    return {
        "assistant_context": context.get("assistant_context") or {},
        "patterns": context.get("patterns") or [],
        "risk_flags": context.get("risk_flags") or [],
        "recent_events": context.get("recent_events") or [],
        "counts_by_category": (context.get("scope_bundle") or {}).get("counts_by_category") or {},
        "sources": context.get("sources") or [],
    }


def _build_unified_child_prompt(message: str, context: dict[str, Any]) -> str:
    compact_context = _compact_context_for_prompt(context)
    context_json = json.dumps(compact_context, ensure_ascii=False, default=str)

    return f"""
You are IndiCare Assistant for a residential children's home.

Use the child context below as your evidence base. Answer in clear British English for adults working in a children's home. Be practical, safeguarding-aware and trauma-informed.

Rules:
- Use only the provided context for child-specific claims.
- If the evidence is limited, say what is missing.
- Include brief source references using citation_ref values where relevant, for example [incidents:123].
- Do not invent records, diagnoses, events, dates, or professional decisions.
- Suggest proportionate next steps for staff and managers.
- Do not replace safeguarding procedures, manager oversight, medical advice, legal advice or local authority decision-making.

User question:
{message}

Unified child context:
{context_json}
""".strip()


async def _stream_unified_young_person_response(
    *,
    message: str,
    context: dict[str, Any],
    response_mode: str,
    user_id: int,
    young_person_id: int,
):
    prompt = _build_unified_child_prompt(message, context)
    sources = context.get("sources") or []
    runtime = context.get("runtime") or {}

    try:
        generator = generate_ai_stream(
            message=prompt,
            session_id=f"young-person-{young_person_id}",
            history=[],
            document_text=None,
            document_name=None,
            response_mode=response_mode or "balanced",
            user_context=context,
            user_id=user_id,
            conversation_id=f"young-person-{young_person_id}",
        )

        async for item in generator:
            if isinstance(item, str):
                yield _sse_message(item)
                continue

            if not isinstance(item, dict):
                continue

            item_type = item.get("type")
            if item_type == "token":
                token = str(item.get("content") or "")
                if token:
                    yield _sse_message(token)
                continue

            if item_type == "progress":
                content = safe_string(item.get("content"))
                if content:
                    yield _sse_event("progress", {"content": content})
                continue

            if item_type == "sources" and isinstance(item.get("sources"), list):
                sources = item.get("sources") or sources
                continue

            if item_type == "runtime" and isinstance(item.get("runtime"), dict):
                runtime = {**runtime, **(item.get("runtime") or {})}
                continue

            if item_type == "meta":
                if isinstance(item.get("sources"), list):
                    sources = item.get("sources") or sources
                if isinstance(item.get("runtime"), dict):
                    runtime = {**runtime, **(item.get("runtime") or {})}
                continue

    except Exception:
        yield _sse_message(
            "Sorry, I could not generate that response from the child context just now. "
            "Please try again, or ask a shorter, more specific question."
        )

    finally:
        yield _sse_event(
            "meta",
            {
                "sources": sources,
                "runtime": {
                    **runtime,
                    "assistant_type": "young_people_os",
                    "retrieval_mode": "unified_timeline",
                    "young_person_id": young_person_id,
                },
                "assistant_context": context.get("assistant_context") or {},
                "risk_flags": context.get("risk_flags") or [],
                "patterns": context.get("patterns") or [],
                "evidence_count": len(sources),
                "timeline_count": runtime.get("timeline_count"),
            },
        )
        yield _sse_done()


@router.post("/young-people/stream")
async def ask_young_person_assistant(
    payload: YoungPersonAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _preflight_assistant_request(
        current_user=current_user,
        scope="child",
        message=payload.message,
    )

    user_id = _safe_user_id(current_user)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Valid authenticated user required.")

    home_id = payload.context.home_id or _safe_home_id(current_user)

    context = build_young_person_assistant_context(
        young_person_id=payload.context.young_person_id,
        home_id=home_id,
        provider_id=payload.context.provider_id if hasattr(payload.context, "provider_id") else None,
        limit=120,
    )

    return StreamingResponse(
        _stream_unified_young_person_response(
            message=payload.message,
            context=context,
            response_mode=payload.response_mode or "balanced",
            user_id=user_id,
            young_person_id=payload.context.young_person_id,
        ),
        media_type="text/event-stream",
        headers=_stream_headers(),
    )


@router.post("/home/stream")
async def ask_home_assistant(
    payload: HomeAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _preflight_assistant_request(
        current_user=current_user,
        scope="home",
        message=payload.message,
    )

    return await _legacy_ask_home_assistant(
        payload=payload,
        conn=conn,
        current_user=current_user,
    )


@router.post("/quality/stream")
async def ask_quality_assistant(
    payload: QualityAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _preflight_assistant_request(
        current_user=current_user,
        scope="quality",
        message=payload.message,
    )

    return await _legacy_ask_quality_assistant(
        payload=payload,
        conn=conn,
        current_user=current_user,
    )


@router.post("/reports/preview")
async def preview_report(
    payload: HomeAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _preflight_assistant_request(
        current_user=current_user,
        scope="home",
        message=payload.message,
    )

    return await _legacy_preview_report(
        payload=payload,
        conn=conn,
        current_user=current_user,
    )


@router.post("/reports/send-now")
async def send_report_now(
    payload: ReportSendPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_authenticated_user(current_user)
    _assert_scope_access(current_user, "home")
    _assert_home_context_for_scope(current_user, "home")

    return await _legacy_send_report_now(
        payload=payload,
        conn=conn,
        current_user=current_user,
    )
