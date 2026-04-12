from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from auth.current_user import get_current_user
from db.connection import get_db
from services.ai_service import generate_ai_stream
from services.assistant_orchestrator import build_assistant_prompt
from services.young_person_service import YoungPersonService

router = APIRouter(prefix="/young-people", tags=["Young People Assistant"])


class YoungPersonAssistantContext(BaseModel):
    scope: str | None = "young_person"
    young_person_id: int
    current_view: str | None = None
    current_section: str | None = None
    young_person_name: str | None = None
    placement_status: str | None = None
    summary_risk_level: str | None = None
    composer_record_type: str | None = None
    home_name: str | None = None
    shift_context: str | None = None
    record_type: str | None = None
    record_id: int | None = None


class YoungPersonAssistantPayload(BaseModel):
    message: str = Field(..., min_length=1, max_length=20000)
    context: YoungPersonAssistantContext
    response_mode: str | None = "balanced"


def _safe_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(value)
    except Exception:
        return None


def _user_home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id"))


def _user_role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower()


def _user_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("user_id") or current_user.get("id"))


def _assert_home_access(current_user: dict[str, Any], record_home_id: int | None) -> None:
    role = _user_role(current_user)
    user_home_id = _user_home_id(current_user)

    if role in {"admin", "provider_admin"}:
        return

    if record_home_id is None:
        raise HTTPException(status_code=403, detail="Home access could not be verified")

    if user_home_id != record_home_id:
        raise HTTPException(status_code=403, detail="You do not have access to this young person")


def _load_and_check_young_person(
    young_person_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    record = YoungPersonService.get_young_person_by_id(young_person_id)
    if not record:
        raise HTTPException(status_code=404, detail="Young person not found")

    _assert_home_access(current_user, _safe_int(record.get("home_id")))
    return record


def _normalise_response_mode(value: str | None) -> str:
    mode = str(value or "balanced").strip().lower()
    if mode in {"quick", "balanced", "deep"}:
        return mode
    return "balanced"


def _normalise_scope(payload: YoungPersonAssistantPayload, current_user: dict[str, Any]) -> dict[str, Any]:
    return {
        "scope_type": "young_person",
        "home_id": _user_home_id(current_user),
        "young_person_id": int(payload.context.young_person_id),
        "record_type": (payload.context.record_type or "").strip() or None,
        "record_id": payload.context.record_id,
    }


def _normalise_context(payload: YoungPersonAssistantPayload, record: dict[str, Any]) -> dict[str, Any]:
    full_name = (
        " ".join([x for x in [record.get("first_name"), record.get("last_name")] if x]).strip()
        or record.get("preferred_name")
        or "Young person"
    )

    current_view = payload.context.current_view or payload.context.current_section

    return {
        "current_view": current_view,
        "current_section": payload.context.current_section or current_view,
        "young_person_name": payload.context.young_person_name or full_name,
        "placement_status": payload.context.placement_status or record.get("placement_status"),
        "summary_risk_level": payload.context.summary_risk_level or record.get("summary_risk_level"),
        "composer_record_type": payload.context.composer_record_type,
        "home_name": payload.context.home_name or record.get("home_name"),
        "shift_context": payload.context.shift_context or current_view,
        "record_type": payload.context.record_type,
        "record_id": payload.context.record_id,
    }


def _sse_message(data: str) -> str:
    safe = (data or "").replace("\r\n", "\n").replace("\r", "\n")
    return "".join(f"data: {line}\n" for line in safe.split("\n")) + "\n"


def _sse_event(event: str, payload: Any) -> str:
    import json

    body = json.dumps(payload, ensure_ascii=False)
    return f"event: {event}\ndata: {body}\n\n"


def _sse_done() -> str:
    return "event: done\ndata: [DONE]\n\n"


@router.post("/assistant")
async def ask_young_person_assistant(
    payload: YoungPersonAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    record = _load_and_check_young_person(payload.context.young_person_id, current_user)

    try:
        scope = _normalise_scope(payload, current_user)
        context = _normalise_context(payload, record)
        response_mode = _normalise_response_mode(payload.response_mode)
        user_id = _user_id(current_user)

        if user_id is None:
            raise HTTPException(status_code=401, detail="User could not be identified")

        assistant_prompt_bundle = build_assistant_prompt(
            conn,
            user_id=user_id,
            message=payload.message,
            scope=scope,
            history=[],
            context=context,
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to prepare young person assistant: {str(exc)}",
        )

    async def stream():
        ai_text = ""
        sources: list[dict[str, Any]] = []
        runtime: dict[str, Any] = {}
        explainability: dict[str, Any] = {}
        assistant_scope_meta: dict[str, Any] = dict(scope)
        assistant_context_meta: dict[str, Any] = assistant_prompt_bundle.get("context") or {}
        suggested_actions: list[str] = []

        try:
            generator = generate_ai_stream(
                message=assistant_prompt_bundle["prompt"],
                session_id=f"young-person-{payload.context.young_person_id}",
                history=[],
                document_text=None,
                document_name=None,
                response_mode=response_mode,
                user_context=assistant_prompt_bundle.get("context") or {},
                user_id=user_id,
                conversation_id=f"young-person-{payload.context.young_person_id}",
            )

            async for item in generator:
                if isinstance(item, str):
                    ai_text += item
                    yield _sse_message(item)
                    continue

                if not isinstance(item, dict):
                    continue

                item_type = item.get("type")

                if item_type == "progress":
                    content = str(item.get("content") or "").strip()
                    if content:
                        yield _sse_event("progress", {"content": content})
                    continue

                if item_type == "token":
                    token = str(item.get("content") or "")
                    if token:
                        ai_text += token
                        yield _sse_message(token)
                    continue

                if item_type == "sources" and isinstance(item.get("sources"), list):
                    sources = item.get("sources") or []
                    continue

                if item_type == "runtime" and isinstance(item.get("runtime"), dict):
                    runtime = item.get("runtime") or {}
                    continue

                if item_type == "explainability" and isinstance(item.get("explainability"), dict):
                    explainability = item.get("explainability") or {}
                    continue

                if item_type == "meta":
                    if isinstance(item.get("sources"), list):
                        sources = item.get("sources") or sources

                    if isinstance(item.get("runtime"), dict):
                        runtime = item.get("runtime") or runtime

                    if isinstance(item.get("explainability"), dict):
                        explainability = item.get("explainability") or explainability

                    if isinstance(item.get("assistant_scope"), dict):
                        assistant_scope_meta = item.get("assistant_scope") or assistant_scope_meta

                    if isinstance(item.get("assistant_context"), dict):
                        assistant_context_meta = item.get("assistant_context") or assistant_context_meta

                    if isinstance(item.get("suggested_actions"), list):
                        suggested_actions = [
                            str(x).strip()
                            for x in item.get("suggested_actions")
                            if str(x).strip()
                        ]
                    continue

        except Exception:
            fallback = (
                "Sorry, the assistant could not generate that response just now. "
                "Please try again, or ask a shorter question such as "
                "'summarise recent incidents' or 'draft a short handover'."
            )
            ai_text += fallback
            yield _sse_message(fallback)

        finally:
            final_runtime = dict(runtime)
            prompt_runtime = assistant_prompt_bundle.get("runtime") or {}

            for key, value in prompt_runtime.items():
                if value not in (None, "", []):
                    final_runtime.setdefault(key, value)

            if context:
                final_runtime.setdefault("current_view", context.get("current_view"))
                final_runtime.setdefault("current_section", context.get("current_section"))
                final_runtime.setdefault("young_person_name", context.get("young_person_name"))
                final_runtime.setdefault("placement_status", context.get("placement_status"))
                final_runtime.setdefault("summary_risk_level", context.get("summary_risk_level"))
                final_runtime.setdefault("composer_record_type", context.get("composer_record_type"))
                final_runtime.setdefault("home_name", context.get("home_name"))
                final_runtime.setdefault("shift_context", context.get("shift_context"))
                final_runtime.setdefault("record_type", context.get("record_type"))
                final_runtime.setdefault("record_id", context.get("record_id"))

            if suggested_actions:
                existing_actions = final_runtime.get("suggested_actions") or []
                if isinstance(existing_actions, list):
                    merged: list[str] = []
                    seen: set[str] = set()

                    for action in [*existing_actions, *suggested_actions]:
                        normalised = str(action).strip()
                        if not normalised:
                            continue
                        lowered = normalised.lower()
                        if lowered in seen:
                            continue
                        seen.add(lowered)
                        merged.append(normalised)

                    final_runtime["suggested_actions"] = merged

            yield _sse_event(
                "meta",
                {
                    "young_person_id": payload.context.young_person_id,
                    "young_person_name": context.get("young_person_name"),
                    "sources": sources,
                    "runtime": final_runtime,
                    "explainability": explainability,
                    "assistant_scope": assistant_scope_meta,
                    "assistant_context": assistant_context_meta,
                    "suggested_actions": suggested_actions,
                },
            )
            yield _sse_done()

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
