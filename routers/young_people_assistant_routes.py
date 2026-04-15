from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from auth.current_user import get_current_user
from db.connection import get_db
from services.ai_service import generate_ai_stream
from services.assistant_orchestrator import build_assistant_prompt
from services.young_person_service import YoungPersonService

router = APIRouter(tags=["Operational Assistant"])


class BaseAssistantContext(BaseModel):
    assistant_type: str | None = None
    scope: str | None = None
    scope_type: str | None = None
    access_level: str | None = None
    provider_id: int | None = None
    allowed_home_ids: list[int] | None = None

    current_view: str | None = None
    current_section: str | None = None
    shift_context: str | None = None

    user_role: str | None = None
    assistant_intent: str | None = None
    retrieval_mode: str | None = None
    output_mode: str | None = None

    whole_os_default: bool | None = None
    section_only_requested: bool | None = None
    use_whole_scope_records: bool | None = None

    ask_for_dates: bool | None = None
    ask_for_chronology: bool | None = None
    ask_for_summary: bool | None = None
    ask_for_review_pack: bool | None = None
    ask_for_compliance_view: bool | None = None

    suggested_prompts_ui_only: list[str] | None = None

    reporting_period_start: str | None = None
    reporting_period_end: str | None = None
    reporting_period_inferred: bool | None = None
    reg45_requested: bool | None = None

    composer_record_type: str | None = None
    record_type: str | None = None
    record_id: int | None = None


class YoungPersonAssistantContext(BaseAssistantContext):
    scope: str | None = "child"
    scope_type: str | None = "young_person"
    young_person_id: int
    young_person_name: str | None = None
    placement_status: str | None = None
    summary_risk_level: str | None = None
    home_id: int | None = None
    home_name: str | None = None


class YoungPersonAssistantPayload(BaseModel):
    message: str = Field(..., min_length=1, max_length=20000)
    context: YoungPersonAssistantContext
    response_mode: str | None = "balanced"


class HomeAssistantContext(BaseAssistantContext):
    scope: str | None = "home"
    scope_type: str | None = "home"
    home_id: int | None = None
    home_name: str | None = None


class HomeAssistantPayload(BaseModel):
    message: str = Field(..., min_length=1, max_length=20000)
    context: HomeAssistantContext
    response_mode: str | None = "balanced"


class QualityAssistantContext(BaseAssistantContext):
    scope: str | None = "quality"
    scope_type: str | None = "quality"
    home_id: int | None = None
    home_name: str | None = None


class QualityAssistantPayload(BaseModel):
    message: str = Field(..., min_length=1, max_length=20000)
    context: QualityAssistantContext
    response_mode: str | None = "balanced"


def _safe_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(value)
    except Exception:
        return None


def _safe_bool(value: Any) -> bool | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes"}:
            return True
        if lowered in {"false", "0", "no"}:
            return False
    return bool(value)


def _safe_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _safe_int_list(values: Any) -> list[int]:
    if not isinstance(values, list):
        return []

    result: list[int] = []
    for value in values:
        parsed = _safe_int(value)
        if parsed is not None:
            result.append(parsed)
    return result


def _safe_str_list(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []

    result: list[str] = []
    for value in values:
        parsed = _safe_str(value)
        if parsed:
            result.append(parsed)
    return result


def _user_home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id"))


def _user_provider_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("provider_id"))


def _user_role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower()


def _user_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("user_id") or current_user.get("id"))


def _is_provider_level_role(role: str) -> bool:
    return role in {"admin", "provider_admin", "ri", "responsible_individual"}


def _assert_home_access(
    current_user: dict[str, Any],
    record_home_id: int | None,
) -> None:
    role = _user_role(current_user)
    user_home_id = _user_home_id(current_user)

    if _is_provider_level_role(role):
        return

    if record_home_id is None:
        raise HTTPException(status_code=403, detail="Home access could not be verified")

    if user_home_id != record_home_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this young person",
        )


def _assert_requested_home_access(
    current_user: dict[str, Any],
    requested_home_id: int | None,
) -> int:
    role = _user_role(current_user)
    user_home_id = _user_home_id(current_user)

    if requested_home_id is None:
        if user_home_id is None:
            raise HTTPException(status_code=403, detail="Home access could not be verified")
        return user_home_id

    if _is_provider_level_role(role):
        return requested_home_id

    if user_home_id is None:
        raise HTTPException(status_code=403, detail="Home access could not be verified")

    if requested_home_id != user_home_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this home",
        )

    return requested_home_id


def _resolve_quality_home_ids(
    current_user: dict[str, Any],
    payload_allowed_home_ids: list[int] | None,
    payload_home_id: int | None,
) -> list[int]:
    role = _user_role(current_user)
    user_home_id = _user_home_id(current_user)

    if _is_provider_level_role(role):
        allowed = _safe_int_list(payload_allowed_home_ids or [])
        if allowed:
            return allowed

        if payload_home_id is not None:
            return [payload_home_id]

        if user_home_id is not None:
            return [user_home_id]

        return []

    if user_home_id is None:
        raise HTTPException(status_code=403, detail="Home access could not be verified")

    if payload_home_id is not None and payload_home_id != user_home_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this quality scope",
        )

    return [user_home_id]


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


def _normalise_scope_value(value: str | None, fallback: str) -> str:
    normalised = str(value or fallback).strip().lower()
    if normalised in {"child", "young_person", "young person"}:
        return "child"
    if normalised == "home":
        return "home"
    if normalised == "quality":
        return "quality"
    return fallback


def _normalise_assistant_type(value: str | None, fallback: str) -> str:
    normalised = str(value or fallback).strip().lower()
    if normalised in {"young_people_os", "young_person_os", "child_os"}:
        return "young_people_os"
    if normalised in {"home_os", "home"}:
        return "home_os"
    if normalised in {"quality_os", "quality"}:
        return "quality_os"
    return fallback


def _extract_common_context(payload_context: BaseAssistantContext, current_user: dict[str, Any]) -> dict[str, Any]:
    current_view = payload_context.current_view or payload_context.current_section
    current_section = payload_context.current_section or current_view
    shift_context = payload_context.shift_context or current_view

    return {
        "assistant_type": _normalise_assistant_type(payload_context.assistant_type, "young_people_os"),
        "current_view": current_view,
        "current_section": current_section,
        "shift_context": shift_context,
        "user_role": payload_context.user_role or _user_role(current_user) or "staff",
        "assistant_intent": payload_context.assistant_intent or "unknown",
        "retrieval_mode": payload_context.retrieval_mode or "whole_scope",
        "output_mode": payload_context.output_mode or "answer",
        "whole_os_default": _safe_bool(payload_context.whole_os_default),
        "section_only_requested": _safe_bool(payload_context.section_only_requested),
        "use_whole_scope_records": _safe_bool(payload_context.use_whole_scope_records),
        "ask_for_dates": _safe_bool(payload_context.ask_for_dates),
        "ask_for_chronology": _safe_bool(payload_context.ask_for_chronology),
        "ask_for_summary": _safe_bool(payload_context.ask_for_summary),
        "ask_for_review_pack": _safe_bool(payload_context.ask_for_review_pack),
        "ask_for_compliance_view": _safe_bool(payload_context.ask_for_compliance_view),
        "suggested_prompts_ui_only": _safe_str_list(payload_context.suggested_prompts_ui_only),
        "reporting_period_start": _safe_str(payload_context.reporting_period_start),
        "reporting_period_end": _safe_str(payload_context.reporting_period_end),
        "reporting_period_inferred": _safe_bool(payload_context.reporting_period_inferred),
        "reg45_requested": _safe_bool(payload_context.reg45_requested),
        "composer_record_type": payload_context.composer_record_type,
        "record_type": payload_context.record_type,
        "record_id": payload_context.record_id,
    }


def _normalise_young_person_scope(
    payload: YoungPersonAssistantPayload,
    current_user: dict[str, Any],
    record: dict[str, Any],
) -> dict[str, Any]:
    resolved_home_id = _safe_int(record.get("home_id")) or _user_home_id(current_user)

    return {
        "scope_type": "young_person",
        "scope": "child",
        "access_level": "child",
        "home_id": resolved_home_id,
        "allowed_home_ids": [resolved_home_id] if resolved_home_id is not None else [],
        "provider_id": _user_provider_id(current_user),
        "young_person_id": int(payload.context.young_person_id),
    }


def _normalise_home_scope(
    payload: HomeAssistantPayload,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    resolved_home_id = _assert_requested_home_access(
        current_user,
        _safe_int(payload.context.home_id),
    )

    return {
        "scope_type": "home",
        "scope": "home",
        "access_level": "home",
        "home_id": resolved_home_id,
        "allowed_home_ids": [resolved_home_id],
        "provider_id": _user_provider_id(current_user),
    }


def _normalise_quality_scope(
    payload: QualityAssistantPayload,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    role = _user_role(current_user)
    payload_home_id = _safe_int(payload.context.home_id)
    allowed_home_ids = _resolve_quality_home_ids(
        current_user=current_user,
        payload_allowed_home_ids=payload.context.allowed_home_ids,
        payload_home_id=payload_home_id,
    )

    access_level = "provider" if _is_provider_level_role(role) else "home"

    selected_home_id = payload_home_id
    if selected_home_id is None and len(allowed_home_ids) == 1:
        selected_home_id = allowed_home_ids[0]

    return {
        "scope_type": "quality",
        "scope": "quality",
        "access_level": access_level,
        "home_id": selected_home_id,
        "allowed_home_ids": allowed_home_ids,
        "provider_id": payload.context.provider_id or _user_provider_id(current_user),
    }


def _normalise_young_person_context(
    payload: YoungPersonAssistantPayload,
    record: dict[str, Any],
    current_user: dict[str, Any],
    scope: dict[str, Any],
) -> dict[str, Any]:
    full_name = (
        " ".join([x for x in [record.get("first_name"), record.get("last_name")] if x]).strip()
        or record.get("preferred_name")
        or "Young person"
    )

    common = _extract_common_context(payload.context, current_user)

    return {
        **common,
        "scope": "child",
        "scope_type": "young_person",
        "access_level": scope.get("access_level"),
        "provider_id": scope.get("provider_id"),
        "allowed_home_ids": scope.get("allowed_home_ids", []),
        "home_id": scope.get("home_id"),
        "young_person_id": int(payload.context.young_person_id),
        "young_person_name": payload.context.young_person_name or full_name,
        "placement_status": payload.context.placement_status or record.get("placement_status"),
        "summary_risk_level": payload.context.summary_risk_level or record.get("summary_risk_level"),
        "home_name": payload.context.home_name or record.get("home_name"),
    }


def _normalise_home_context(
    payload: HomeAssistantPayload,
    scope: dict[str, Any],
    current_user: dict[str, Any],
) -> dict[str, Any]:
    home_name = (
        payload.context.home_name
        or current_user.get("home_name")
        or current_user.get("homeName")
        or f"Home {scope.get('home_id')}"
    )

    common = _extract_common_context(payload.context, current_user)

    return {
        **common,
        "scope": "home",
        "scope_type": "home",
        "access_level": scope.get("access_level"),
        "provider_id": scope.get("provider_id"),
        "allowed_home_ids": scope.get("allowed_home_ids", []),
        "home_id": scope.get("home_id"),
        "home_name": home_name,
    }


def _normalise_quality_context(
    payload: QualityAssistantPayload,
    scope: dict[str, Any],
    current_user: dict[str, Any],
) -> dict[str, Any]:
    home_name = (
        payload.context.home_name
        or current_user.get("home_name")
        or current_user.get("homeName")
        or (f"Home {scope.get('home_id')}" if scope.get("home_id") is not None else "Quality oversight")
    )

    common = _extract_common_context(payload.context, current_user)

    return {
        **common,
        "scope": "quality",
        "scope_type": "quality",
        "access_level": scope.get("access_level"),
        "provider_id": scope.get("provider_id"),
        "allowed_home_ids": scope.get("allowed_home_ids", []),
        "home_id": scope.get("home_id"),
        "home_name": home_name,
    }


def _sse_message(data: str) -> str:
    safe = (data or "").replace("\r\n", "\n").replace("\r", "\n")
    return "".join(f"data: {line}\n" for line in safe.split("\n")) + "\n"


def _sse_event(event: str, payload: Any) -> str:
    body = json.dumps(payload, ensure_ascii=False)
    return f"event: {event}\ndata: {body}\n\n"


def _sse_done() -> str:
    return "event: done\ndata: [DONE]\n\n"


async def _stream_assistant_response(
    *,
    assistant_prompt_bundle: dict[str, Any],
    response_mode: str,
    session_id: str,
    conversation_id: str,
    user_id: int,
    meta_payload: dict[str, Any],
):
    ai_text = ""
    sources: list[dict[str, Any]] = []
    runtime: dict[str, Any] = {}
    explainability: dict[str, Any] = {}
    assistant_scope_meta: dict[str, Any] = dict(meta_payload.get("assistant_scope") or {})
    assistant_context_meta: dict[str, Any] = (
        assistant_prompt_bundle.get("context") or meta_payload.get("assistant_context") or {}
    )
    suggested_actions: list[str] = []

    try:
        generator = generate_ai_stream(
            message=assistant_prompt_bundle["prompt"],
            session_id=session_id,
            history=[],
            document_text=None,
            document_name=None,
            response_mode=response_mode,
            user_context=assistant_prompt_bundle.get("context") or {},
            user_id=user_id,
            conversation_id=conversation_id,
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
            "Please try again, or ask a shorter question."
        )
        ai_text += fallback
        yield _sse_message(fallback)

    finally:
        final_runtime = dict(runtime)
        prompt_runtime = assistant_prompt_bundle.get("runtime") or {}
        assistant_context = meta_payload.get("assistant_context") or {}

        for key, value in prompt_runtime.items():
            if value not in (None, "", []):
                final_runtime.setdefault(key, value)

        for key, value in assistant_context.items():
            if value not in (None, "", []):
                final_runtime.setdefault(key, value)

        final_runtime.setdefault(
            "assistant_type",
            meta_payload.get("assistant_type", "young_people_os"),
        )

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
                **meta_payload.get("top_level_meta", {}),
                "sources": sources,
                "runtime": final_runtime,
                "explainability": explainability,
                "assistant_scope": assistant_scope_meta,
                "assistant_context": assistant_context_meta,
                "suggested_actions": suggested_actions,
            },
        )
        yield _sse_done()


@router.post("/young-people/assistant")
async def ask_young_person_assistant(
    payload: YoungPersonAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    record = _load_and_check_young_person(payload.context.young_person_id, current_user)

    try:
        scope = _normalise_young_person_scope(payload, current_user, record)
        context = _normalise_young_person_context(payload, record, current_user, scope)
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
            assistant_type="young_people_os",
        )

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to prepare young person assistant: {str(exc)}",
        )

    return StreamingResponse(
        _stream_assistant_response(
            assistant_prompt_bundle=assistant_prompt_bundle,
            response_mode=response_mode,
            session_id=f"young-person-{payload.context.young_person_id}",
            conversation_id=f"young-person-{payload.context.young_person_id}",
            user_id=user_id,
            meta_payload={
                "assistant_type": "young_people_os",
                "assistant_scope": dict(scope),
                "assistant_context": assistant_prompt_bundle.get("context") or context,
                "top_level_meta": {
                    "young_person_id": payload.context.young_person_id,
                    "young_person_name": context.get("young_person_name"),
                    "home_id": context.get("home_id"),
                    "home_name": context.get("home_name"),
                    "assistant_intent": context.get("assistant_intent"),
                    "retrieval_mode": context.get("retrieval_mode"),
                    "output_mode": context.get("output_mode"),
                    "reporting_period_start": context.get("reporting_period_start"),
                    "reporting_period_end": context.get("reporting_period_end"),
                    "reporting_period_inferred": context.get("reporting_period_inferred"),
                    "reg45_requested": context.get("reg45_requested"),
                },
            },
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/home/assistant")
async def ask_home_assistant(
    payload: HomeAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        scope = _normalise_home_scope(payload, current_user)
        context = _normalise_home_context(payload, scope, current_user)
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
            assistant_type="home_os",
        )

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to prepare home assistant: {str(exc)}",
        )

    return StreamingResponse(
        _stream_assistant_response(
            assistant_prompt_bundle=assistant_prompt_bundle,
            response_mode=response_mode,
            session_id=f"home-{scope['home_id']}",
            conversation_id=f"home-{scope['home_id']}",
            user_id=user_id,
            meta_payload={
                "assistant_type": "home_os",
                "assistant_scope": dict(scope),
                "assistant_context": assistant_prompt_bundle.get("context") or context,
                "top_level_meta": {
                    "home_id": scope.get("home_id"),
                    "home_name": context.get("home_name"),
                    "assistant_intent": context.get("assistant_intent"),
                    "retrieval_mode": context.get("retrieval_mode"),
                    "output_mode": context.get("output_mode"),
                    "reporting_period_start": context.get("reporting_period_start"),
                    "reporting_period_end": context.get("reporting_period_end"),
                    "reporting_period_inferred": context.get("reporting_period_inferred"),
                    "reg45_requested": context.get("reg45_requested"),
                },
            },
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/quality/assistant")
async def ask_quality_assistant(
    payload: QualityAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        scope = _normalise_quality_scope(payload, current_user)
        context = _normalise_quality_context(payload, scope, current_user)
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
            assistant_type="quality_os",
        )

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to prepare quality assistant: {str(exc)}",
        )

    selected_home_id = scope.get("home_id")
    allowed_home_ids = scope.get("allowed_home_ids", [])

    return StreamingResponse(
        _stream_assistant_response(
            assistant_prompt_bundle=assistant_prompt_bundle,
            response_mode=response_mode,
            session_id=(
                f"quality-provider-{scope.get('provider_id')}"
                if scope.get("access_level") == "provider"
                else f"quality-home-{selected_home_id}"
            ),
            conversation_id=(
                f"quality-provider-{scope.get('provider_id')}"
                if scope.get("access_level") == "provider"
                else f"quality-home-{selected_home_id}"
            ),
            user_id=user_id,
            meta_payload={
                "assistant_type": "quality_os",
                "assistant_scope": dict(scope),
                "assistant_context": assistant_prompt_bundle.get("context") or context,
                "top_level_meta": {
                    "home_id": selected_home_id,
                    "home_name": context.get("home_name"),
                    "allowed_home_ids": allowed_home_ids,
                    "access_level": scope.get("access_level"),
                    "provider_id": scope.get("provider_id"),
                    "assistant_intent": context.get("assistant_intent"),
                    "retrieval_mode": context.get("retrieval_mode"),
                    "output_mode": context.get("output_mode"),
                    "reporting_period_start": context.get("reporting_period_start"),
                    "reporting_period_end": context.get("reporting_period_end"),
                    "reporting_period_inferred": context.get("reporting_period_inferred"),
                    "reg45_requested": context.get("reg45_requested"),
                },
            },
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )