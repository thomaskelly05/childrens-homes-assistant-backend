from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from assistant.audit_logger import (
    AssistantAuditTimer,
    log_assistant_request_finished,
    log_assistant_request_started,
)
from assistant.explainability import (
    build_explainability_payload,
    build_loading_updates,
)
from assistant.llm_provider import ChatStreamRequest, get_llm_provider
from assistant.orchestrator import OrchestratorRequest, build_orchestrator_result
from assistant.web_search import web_search

logger = logging.getLogger("indicare.ai_service")

SEARCH_TIMEOUT_SECONDS = float(os.getenv("GUIDANCE_SEARCH_TIMEOUT_SECONDS", "3.0"))


def _safe_string(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_response_mode(response_mode: str | None, speed: str | None) -> str:
    value = _safe_string(response_mode or speed or "balanced").lower()
    if value in {"quick", "balanced", "deep"}:
        return value
    return "balanced"


def _trim_document_text(document_text: str | None, selected_mode: str) -> str | None:
    if not document_text:
        return None

    text = _safe_string(document_text)
    if not text:
        return None

    if selected_mode == "quick":
        limit = 6000
    elif selected_mode == "deep":
        limit = 24000
    else:
        limit = 12000

    return text[:limit]


async def _maybe_run_guidance_search(
    *,
    enabled: bool,
    search_query: str,
) -> str:
    if not enabled:
        return ""

    query = _safe_string(search_query)
    if not query:
        return ""

    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(web_search, query),
            timeout=SEARCH_TIMEOUT_SECONDS,
        )
        return _safe_string(result)
    except TimeoutError:
        logger.warning("Guidance search timed out")
        return ""
    except Exception:
        logger.exception("Guidance search failed")
        return ""


def _append_live_guidance_context(system_prompt: str, search_results: str) -> str:
    if not _safe_string(search_results):
        return system_prompt

    return (
        f"{system_prompt}\n\n"
        "============================================================\n"
        "LIVE GUIDANCE CONTEXT\n\n"
        "The following trusted guidance excerpts were retrieved for this request:\n\n"
        f"{search_results}\n\n"
        "Use this only where it genuinely improves accuracy.\n"
        "Prefer statutory guidance, legislation, Ofsted, and official frameworks where relevant.\n"
        "Do not let this stop you completing practical drafting tasks directly."
    ).strip()


def _normalise_sources(value) -> list[dict]:
    if not isinstance(value, list):
        return []

    cleaned: list[dict] = []
    seen: set[str] = set()

    for item in value:
        if not isinstance(item, dict):
            continue

        source = {
            "type": item.get("type"),
            "label": item.get("label"),
            "document_title": item.get("document_title"),
            "section": item.get("section"),
            "page_number": item.get("page_number"),
            "excerpt": item.get("excerpt"),
            "url": item.get("url"),
        }

        key = "|".join(
            str(source.get(k) or "")
            for k in ["type", "label", "document_title", "section", "page_number", "url"]
        )

        if key in seen:
            continue

        seen.add(key)
        cleaned.append(source)

    return cleaned


def _normalise_scope(scope: dict | None) -> dict[str, Any]:
    scope = scope or {}

    return {
        "scope_type": _safe_string(scope.get("scope_type") or scope.get("scope") or "global").lower() or "global",
        "young_person_id": scope.get("young_person_id"),
        "home_id": scope.get("home_id"),
        "record_type": _safe_string(scope.get("record_type")),
        "record_id": scope.get("record_id"),
    }


def _normalise_context(user_context: dict | None) -> dict[str, Any]:
    user_context = user_context or {}

    return {
        "current_view": _safe_string(user_context.get("current_view")),
        "young_person_name": _safe_string(user_context.get("young_person_name")),
        "placement_status": _safe_string(user_context.get("placement_status")),
        "summary_risk_level": _safe_string(user_context.get("summary_risk_level")),
        "composer_record_type": _safe_string(user_context.get("composer_record_type")),
        "home_name": _safe_string(user_context.get("home_name")),
        "shift_context": _safe_string(user_context.get("shift_context")),
    }


def _build_scope_prefix(scope: dict[str, Any], context: dict[str, Any]) -> str:
    scope_type = scope.get("scope_type") or "global"

    if scope_type != "young_person":
        return ""

    lines: list[str] = [
        "============================================================",
        "ASSISTANT SCOPE",
        "",
        "This request is scoped to a single young person workspace.",
        "Answer in a way that is directly useful for that young person's current record, handover, review, planning, or oversight context.",
    ]

    if context.get("young_person_name"):
        lines.append(f"Young person name: {context['young_person_name']}")
    if scope.get("young_person_id") is not None:
        lines.append(f"Young person id: {scope['young_person_id']}")
    if scope.get("home_id") is not None:
        lines.append(f"Home id: {scope['home_id']}")
    if context.get("placement_status"):
        lines.append(f"Placement status: {context['placement_status']}")
    if context.get("summary_risk_level"):
        lines.append(f"Summary risk level: {context['summary_risk_level']}")
    if context.get("current_view"):
        lines.append(f"Current workspace view: {context['current_view']}")
    if context.get("composer_record_type"):
        lines.append(f"Open composer record type: {context['composer_record_type']}")

    lines.extend(
        [
            "",
            "Prioritise:",
            "- concise, practice-ready wording",
            "- child-centred, safeguarding-aware reasoning",
            "- direct usefulness for staff handover, records, manager review, or planning",
        ]
    )

    return "\n".join(lines).strip()


def _append_scope_context(
    system_prompt: str,
    *,
    scope: dict[str, Any],
    context: dict[str, Any],
) -> str:
    scope_prefix = _build_scope_prefix(scope, context)
    if not scope_prefix:
        return system_prompt

    return f"{system_prompt}\n\n{scope_prefix}".strip()


def _build_assistant_context_payload(
    *,
    scope: dict[str, Any],
    context: dict[str, Any],
    orchestration,
) -> dict[str, Any]:
    return {
        "scope_type": scope.get("scope_type") or "global",
        "young_person": {
            "id": scope.get("young_person_id"),
            "name": context.get("young_person_name"),
            "placement_status": context.get("placement_status"),
            "summary_risk_level": context.get("summary_risk_level"),
        }
        if scope.get("scope_type") == "young_person"
        else {},
        "workspace": {
            "current_view": context.get("current_view"),
            "composer_record_type": context.get("composer_record_type"),
            "home_name": context.get("home_name"),
            "shift_context": context.get("shift_context"),
        },
        "orchestration": {
            "mode": getattr(orchestration.runtime, "mode", None),
            "task_type": getattr(orchestration.runtime, "task_type", None),
            "output_type": getattr(orchestration.runtime, "output_type", None),
            "safeguarding_level": getattr(orchestration.runtime, "safeguarding_level", None),
        },
    }


def _build_suggested_actions(
    *,
    scope: dict[str, Any],
    context: dict[str, Any],
    runtime_payload: dict[str, Any],
) -> list[str]:
    actions: list[str] = []

    if scope.get("scope_type") == "young_person":
        actions.extend(
            [
                "Summarise current risks",
                "Draft handover",
                "Pull child voice themes",
                "Summarise recent incidents",
            ]
        )

        current_view = _safe_string(context.get("current_view")).lower()

        if current_view == "handover":
            actions.append("Write next shift handover")
        elif current_view == "risk":
            actions.append("Review risk wording")
        elif current_view == "incidents":
            actions.append("Summarise incident patterns")
        elif current_view == "manager":
            actions.append("Highlight manager priorities")
        elif current_view == "evidence":
            actions.append("Pull Ofsted-ready evidence points")

    suggested_runtime_actions = runtime_payload.get("suggested_actions") or []
    if isinstance(suggested_runtime_actions, list):
        for item in suggested_runtime_actions:
            text = _safe_string(item)
            if text:
                actions.append(text)

    deduped: list[str] = []
    seen: set[str] = set()

    for action in actions:
        normalised = action.strip().lower()
        if not normalised or normalised in seen:
            continue
        seen.add(normalised)
        deduped.append(action.strip())

    return deduped[:8]


async def generate_ai_stream(
    message: str,
    session_id: str,
    history=None,
    document_text: str | None = None,
    document_name: str | None = None,
    role: str = "residential care staff",
    ld_lens: bool = False,
    training_mode: bool = False,
    speed: str = "balanced",
    user_context: dict | None = None,
    response_mode: str = "balanced",
    user_id: str | int | None = None,
    conversation_id: str | int | None = None,
    scope: dict | None = None,
):
    history = history or []
    user_context = user_context or {}
    timer = AssistantAuditTimer.start()
    request_audit_event = None

    selected_mode = _normalise_response_mode(response_mode, speed)
    trimmed_document_text = _trim_document_text(document_text, selected_mode)
    normalised_scope = _normalise_scope(scope)
    normalised_context = _normalise_context(user_context)

    orchestration = build_orchestrator_result(
        OrchestratorRequest(
            message=message,
            session_id=session_id,
            history=history,
            role=role,
            document_text=trimmed_document_text,
            document_name=document_name,
            ld_lens=ld_lens,
            training_mode=training_mode,
            speed=selected_mode,
            user_context={
                **user_context,
                "scope": normalised_scope,
                "normalised_context": normalised_context,
            },
        )
    )

    runtime = orchestration.runtime
    model_plan = orchestration.model_plan
    guidance_plan = orchestration.guidance_plan

    system_prompt = orchestration.system_prompt
    user_message = orchestration.user_message
    trimmed_history = orchestration.trimmed_history

    mode = getattr(runtime, "mode", "general_practice")
    safeguarding_level = getattr(runtime, "safeguarding_level", "normal")
    task_type = getattr(runtime, "task_type", "guidance")
    output_type = getattr(runtime, "output_type", "plain_response")

    sources_used = _normalise_sources(orchestration.sources)
    runtime_payload = orchestration.runtime_payload
    explainability_payload = build_explainability_payload(
        user_message=message,
        orchestration=orchestration,
    )

    assistant_context_payload = _build_assistant_context_payload(
        scope=normalised_scope,
        context=normalised_context,
        orchestration=orchestration,
    )

    suggested_actions = _build_suggested_actions(
        scope=normalised_scope,
        context=normalised_context,
        runtime_payload=runtime_payload,
    )

    request_audit_event = log_assistant_request_started(
        session_id=session_id,
        conversation_id=_safe_string(conversation_id or session_id),
        user_id=user_id,
        role=role,
        message=message,
        selected_mode=selected_mode,
        orchestration=orchestration,
    )

    for sentence in build_loading_updates(
        stage="initial_review",
        orchestration=orchestration,
        search_enabled=guidance_plan.enabled,
        has_search_results=False,
    ):
        if _safe_string(sentence):
            yield {
                "type": "progress",
                "content": sentence,
            }

    search_results = await _maybe_run_guidance_search(
        enabled=guidance_plan.enabled,
        search_query=guidance_plan.search_query,
    )

    for sentence in build_loading_updates(
        stage="post_search",
        orchestration=orchestration,
        search_enabled=guidance_plan.enabled,
        has_search_results=bool(search_results),
    ):
        if _safe_string(sentence):
            yield {
                "type": "progress",
                "content": sentence,
            }

    final_system_prompt = _append_live_guidance_context(system_prompt, search_results)
    final_system_prompt = _append_scope_context(
        final_system_prompt,
        scope=normalised_scope,
        context=normalised_context,
    )

    messages = [
        {"role": "system", "content": final_system_prompt},
        *trimmed_history,
        {"role": "user", "content": user_message},
    ]

    logger.info(
        (
            "Starting AI stream session_id=%s mode=%s task_type=%s output_type=%s "
            "safeguarding=%s response_mode=%s model=%s temperature=%s max_tokens=%s "
            "history_count=%s has_document=%s sources=%s guidance_enabled=%s guidance_reason=%s "
            "scope_type=%s young_person_id=%s home_id=%s current_view=%s"
        ),
        session_id,
        mode,
        task_type,
        output_type,
        safeguarding_level,
        selected_mode,
        model_plan.model,
        model_plan.temperature,
        model_plan.max_tokens,
        len(messages),
        bool(trimmed_document_text),
        len(sources_used),
        guidance_plan.enabled,
        guidance_plan.reason,
        normalised_scope.get("scope_type"),
        normalised_scope.get("young_person_id"),
        normalised_scope.get("home_id"),
        normalised_context.get("current_view"),
    )

    provider = get_llm_provider()
    provider_success = False
    provider_error_code = None
    provider_error_message = None

    try:
        async for content in provider.stream_chat(
            ChatStreamRequest(
                messages=messages,
                model=model_plan.model,
                temperature=model_plan.temperature,
                max_tokens=model_plan.max_tokens,
                metadata={
                    "session_id": session_id,
                    "mode": mode,
                    "task_type": task_type,
                    "output_type": output_type,
                    "safeguarding_level": safeguarding_level,
                    "response_mode": selected_mode,
                    "conversation_id": _safe_string(conversation_id or session_id),
                    "user_id": _safe_string(user_id),
                    "scope_type": _safe_string(normalised_scope.get("scope_type")),
                    "young_person_id": _safe_string(normalised_scope.get("young_person_id")),
                    "home_id": _safe_string(normalised_scope.get("home_id")),
                    "current_view": _safe_string(normalised_context.get("current_view")),
                },
            )
        ):
            if _safe_string(content):
                yield {
                    "type": "token",
                    "content": content,
                }

        provider_success = True

    except Exception as exc:
        provider_error_code = "provider_stream_failed"
        provider_error_message = _safe_string(exc) or "AI provider stream failed"
        logger.exception("AI provider stream failed for session_id=%s", session_id)

        yield {
            "type": "token",
            "content": "Sorry, something went wrong while generating the response.",
        }

    finally:
        duration_ms = timer.duration_ms()

        if request_audit_event is not None:
            log_assistant_request_finished(
                base_event=request_audit_event,
                duration_ms=duration_ms,
                success=provider_success,
                source_count=len(sources_used),
                error_code=provider_error_code,
                error_message=provider_error_message,
                extra={
                    "guidance_results_used": bool(search_results),
                    "trimmed_history_count": len(trimmed_history),
                    "message_count": len(messages),
                    "scope_type": normalised_scope.get("scope_type"),
                    "young_person_id": normalised_scope.get("young_person_id"),
                    "home_id": normalised_scope.get("home_id"),
                    "current_view": normalised_context.get("current_view"),
                },
            )

    yield {
        "type": "meta",
        "sources": sources_used,
        "runtime": runtime_payload,
        "explainability": explainability_payload,
        "assistant_scope": normalised_scope,
        "assistant_context": assistant_context_payload,
        "suggested_actions": suggested_actions,
    }

    logger.info("Completed AI stream session_id=%s", session_id)
