from __future__ import annotations

import asyncio
import json
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


def _safe_string(value: Any) -> str:
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


def _trim_search_results(search_results: str, selected_mode: str) -> str:
    text = _safe_string(search_results)
    if not text:
        return ""

    if selected_mode == "quick":
        limit = 1500
    elif selected_mode == "deep":
        limit = 5000
    else:
        limit = 3000

    return text[:limit]


def _trim_messages_for_mode(
    messages: list[dict[str, Any]] | None,
    selected_mode: str,
) -> list[dict[str, Any]]:
    if not messages:
        return []

    if selected_mode == "quick":
        keep = 4
        max_chars = 1200
    elif selected_mode == "deep":
        keep = 8
        max_chars = 2800
    else:
        keep = 6
        max_chars = 1800

    trimmed: list[dict[str, Any]] = []
    for item in messages[-keep:]:
        if not isinstance(item, dict):
            continue

        role = _safe_string(item.get("role")).lower()
        content = _safe_string(item.get("content"))

        if role not in {"user", "assistant", "system"}:
            continue
        if not content:
            continue

        trimmed.append(
            {
                "role": role,
                "content": content[:max_chars],
            }
        )

    return trimmed


def _has_internal_snapshot_context(user_context: dict[str, Any] | None) -> bool:
    if not isinstance(user_context, dict) or not user_context:
        return False

    if user_context.get("report_type") in {"monthly", "reg45", "yearly"}:
        return True

    period = user_context.get("period")
    if isinstance(period, dict) and (
        period.get("start_date") or period.get("end_date")
    ):
        return True

    keys = {
        "children_outcomes",
        "incident_summary",
        "safeguarding_summary",
        "compliance_summary",
        "staffing_summary",
        "supervision_summary",
        "management_summary",
        "positive_indicators",
    }

    return any(key in user_context for key in keys)


def _should_skip_guidance_search(
    *,
    task_type: str,
    output_type: str,
    user_context: dict[str, Any] | None,
    has_document_text: bool,
) -> bool:
    internal_snapshot_task = _has_internal_snapshot_context(user_context)

    if internal_snapshot_task and not has_document_text:
        return True

    if task_type in {"report", "summary", "draft"} and internal_snapshot_task:
        return True

    if output_type in {"report", "structured_report", "email_report"} and internal_snapshot_task:
        return True

    return False


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
        "The following trusted guidance excerpts were retrieved for this request.\n"
        "Where relevant, prioritise Children’s Homes Regulations 2015, the Quality Standards,\n"
        "the Guide to the Children’s Homes Regulations including the Quality Standards,\n"
        "SCCIF expectations, safeguarding guidance, and official children’s homes practice frameworks.\n\n"
        f"{search_results}\n\n"
        "Use this material only where it genuinely improves accuracy.\n"
        "Do not overstate what the guidance says.\n"
        "Do not let guidance replace the specific evidence in the OS record.\n"
        "If guidance and local evidence differ, say so clearly."
    ).strip()


def _append_service_level_answer_rules(system_prompt: str) -> str:
    extra = """
============================================================
SERVICE-LEVEL ANSWER RULES

Your answer must:
- stay within the authorised children’s residential care scope
- be practical, analytical and safeguarding-aware
- keep children’s lived experience central where relevant
- distinguish clearly between evidence, concern, inference and missing information
- avoid generic filler and unsupported statements
- use inline citations throughout when evidence exists
- not cluster all citations only at the end
- not invent citations for unsupported claims
- match the user’s requested structure exactly where one is given
- avoid markdown headings if the user asked for plain section labels only

If the request is inspection, RI, manager, home oversight, chronology, Reg 45, compliance or safeguarding related:
- answer as an experienced children’s homes professional
- think in line with Ofsted, SCCIF, the Quality Standards, leadership and management expectations, and safe residential practice
"""
    return f"{system_prompt}\n\n{extra}".strip()


def _normalise_sources(value: Any) -> list[dict]:
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
            "title": item.get("title"),
            "summary": item.get("summary"),
            "description": item.get("description"),
            "section": item.get("section"),
            "page_number": item.get("page_number"),
            "excerpt": item.get("excerpt"),
            "url": item.get("url"),
            "record_type": item.get("record_type"),
            "record_id": item.get("record_id"),
            "citation_ref": item.get("citation_ref"),
        }

        key = "|".join(
            str(source.get(k) or "")
            for k in [
                "type",
                "label",
                "document_title",
                "section",
                "page_number",
                "url",
                "record_type",
                "record_id",
                "citation_ref",
            ]
        )

        if key in seen:
            continue

        seen.add(key)
        cleaned.append(source)

    return cleaned


def _normalise_evidence_index(value: Any, *, limit: int = 200) -> list[dict]:
    if not isinstance(value, list):
        return []

    cleaned: list[dict] = []
    seen: set[str] = set()

    for item in value[:limit]:
        if not isinstance(item, dict):
            continue

        evidence = {
            "citation_ref": item.get("citation_ref"),
            "record_type": item.get("record_type"),
            "record_id": item.get("record_id"),
            "label": item.get("label"),
            "title": item.get("title"),
            "section": item.get("section"),
            "excerpt": item.get("excerpt"),
            "description": item.get("description"),
            "event_at": item.get("event_at"),
            "updated_at": item.get("updated_at"),
            "url": item.get("url"),
        }

        key = "|".join(
            str(evidence.get(k) or "")
            for k in [
                "citation_ref",
                "record_type",
                "record_id",
                "label",
                "section",
                "url",
            ]
        )

        if key in seen:
            continue

        seen.add(key)
        cleaned.append(evidence)

    return cleaned


def _normalise_suggested_actions(value: Any) -> list[Any]:
    if not isinstance(value, list):
        return []

    cleaned: list[Any] = []
    seen: set[str] = set()

    for item in value:
        if isinstance(item, dict):
            key = json.dumps(item, sort_keys=True, ensure_ascii=False)
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(item)
            continue

        text = _safe_string(item)
        if not text:
            continue
        lowered = text.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        cleaned.append(text)

    return cleaned


def _extract_structured_payload(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None

    structured_keys = {
        "answer",
        "text",
        "message",
        "content",
        "sources",
        "runtime",
        "explainability",
        "assistant_scope",
        "assistant_context",
        "suggested_actions",
        "evidence_index",
    }

    if any(key in value for key in structured_keys):
        return value

    return None


def _extract_text_from_provider_payload(value: Any) -> str:
    if isinstance(value, str):
        return value

    if not isinstance(value, dict):
        return ""

    direct_candidates = [
        value.get("text"),
        value.get("message"),
        value.get("answer"),
        value.get("output"),
        value.get("content"),
    ]

    for candidate in direct_candidates:
        if isinstance(candidate, str) and candidate.strip():
            return candidate

    content = value.get("content")
    if isinstance(content, dict):
        for candidate in [
            content.get("text"),
            content.get("message"),
            content.get("answer"),
            content.get("output"),
            content.get("content"),
        ]:
            if isinstance(candidate, str) and candidate.strip():
                return candidate

    return ""


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
):
    history = history or []
    user_context = user_context or {}
    timer = AssistantAuditTimer.start()
    request_audit_event = None

    selected_mode = _normalise_response_mode(response_mode, speed)
    trimmed_document_text = _trim_document_text(document_text, selected_mode)

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
            user_context=user_context,
        )
    )

    runtime = orchestration.runtime
    model_plan = orchestration.model_plan
    guidance_plan = orchestration.guidance_plan

    system_prompt = orchestration.system_prompt
    user_message = orchestration.user_message
    trimmed_history = _trim_messages_for_mode(orchestration.trimmed_history, selected_mode)

    mode = getattr(runtime, "mode", "general_practice")
    safeguarding_level = getattr(runtime, "safeguarding_level", "normal")
    task_type = getattr(runtime, "task_type", "guidance")
    output_type = getattr(runtime, "output_type", "plain_response")

    sources_used = _normalise_sources(orchestration.sources)
    runtime_payload = dict(orchestration.runtime_payload or {})
    explainability_payload = build_explainability_payload(
        user_message=message,
        orchestration=orchestration,
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

    skip_guidance_search = _should_skip_guidance_search(
        task_type=task_type,
        output_type=output_type,
        user_context=user_context,
        has_document_text=bool(trimmed_document_text),
    )
    guidance_enabled = bool(guidance_plan.enabled) and not skip_guidance_search

    for sentence in build_loading_updates(
        stage="initial_review",
        orchestration=orchestration,
        search_enabled=guidance_enabled,
        has_search_results=False,
    ):
        if _safe_string(sentence):
            yield {
                "type": "progress",
                "content": sentence,
            }

    search_results = await _maybe_run_guidance_search(
        enabled=guidance_enabled,
        search_query=guidance_plan.search_query,
    )
    trimmed_search_results = _trim_search_results(search_results, selected_mode)

    for sentence in build_loading_updates(
        stage="post_search",
        orchestration=orchestration,
        search_enabled=guidance_enabled,
        has_search_results=bool(trimmed_search_results),
    ):
        if _safe_string(sentence):
            yield {
                "type": "progress",
                "content": sentence,
            }

    final_system_prompt = _append_live_guidance_context(system_prompt, trimmed_search_results)
    final_system_prompt = _append_service_level_answer_rules(final_system_prompt)

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
            "guidance_skipped=%s"
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
        guidance_enabled,
        guidance_plan.reason,
        skip_guidance_search,
    )

    provider = get_llm_provider()
    provider_success = False
    provider_error_code = None
    provider_error_message = None

    final_answer_parts: list[str] = []
    provider_meta_sources: list[dict] = []
    provider_runtime: dict[str, Any] = {}
    provider_explainability: dict[str, Any] = {}
    provider_assistant_scope: dict[str, Any] = {}
    provider_assistant_context: dict[str, Any] = {}
    provider_suggested_actions: list[Any] = []
    provider_evidence_index: list[dict] = []

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
                },
            )
        ):
            if isinstance(content, dict):
                structured = _extract_structured_payload(content)

                if structured:
                    text = _extract_text_from_provider_payload(structured)
                    if text:
                        final_answer_parts.append(text)
                        yield {
                            "type": "token",
                            "content": text,
                        }

                    if isinstance(structured.get("sources"), list):
                        provider_meta_sources = _normalise_sources(structured.get("sources"))

                    if isinstance(structured.get("runtime"), dict):
                        provider_runtime = {
                            **provider_runtime,
                            **structured.get("runtime", {}),
                        }

                    if isinstance(structured.get("explainability"), dict):
                        provider_explainability = {
                            **provider_explainability,
                            **structured.get("explainability", {}),
                        }

                    if isinstance(structured.get("assistant_scope"), dict):
                        provider_assistant_scope = {
                            **provider_assistant_scope,
                            **structured.get("assistant_scope", {}),
                        }

                    if isinstance(structured.get("assistant_context"), dict):
                        provider_assistant_context = {
                            **provider_assistant_context,
                            **structured.get("assistant_context", {}),
                        }

                    if isinstance(structured.get("suggested_actions"), list):
                        provider_suggested_actions = _normalise_suggested_actions(
                            structured.get("suggested_actions")
                        )

                    if isinstance(structured.get("evidence_index"), list):
                        provider_evidence_index = _normalise_evidence_index(
                            structured.get("evidence_index")
                        )

                    continue

                token_text = _extract_text_from_provider_payload(content)
                if _safe_string(token_text):
                    final_answer_parts.append(token_text)
                    yield {
                        "type": "token",
                        "content": token_text,
                    }
                continue

            if _safe_string(content):
                final_answer_parts.append(str(content))
                yield {
                    "type": "token",
                    "content": str(content),
                }

        provider_success = True

    except Exception as exc:
        provider_error_code = "provider_stream_failed"
        provider_error_message = _safe_string(exc) or "AI provider stream failed"
        logger.exception(
            "AI provider stream failed for session_id=%s model=%s error=%r",
            session_id,
            model_plan.model,
            exc,
        )

        fallback_text = (
            "Sorry, something went wrong while generating the response. "
            f"Provider error: {provider_error_message}"
        )
        final_answer_parts.append(fallback_text)
        yield {
            "type": "token",
            "content": fallback_text,
        }

    finally:
        duration_ms = timer.duration_ms()

        if request_audit_event is not None:
            log_assistant_request_finished(
                base_event=request_audit_event,
                duration_ms=duration_ms,
                success=provider_success,
                source_count=len(provider_meta_sources or sources_used),
                error_code=provider_error_code,
                error_message=provider_error_message,
                extra={
                    "guidance_results_used": bool(trimmed_search_results),
                    "guidance_search_skipped": skip_guidance_search,
                    "trimmed_history_count": len(trimmed_history),
                    "message_count": len(messages),
                    "evidence_count": len(
                        provider_evidence_index
                        or runtime_payload.get("evidence_index")
                        or []
                    ),
                },
            )

    final_sources = _normalise_sources(provider_meta_sources or sources_used)

    final_runtime = {
        **runtime_payload,
        **provider_runtime,
        "guidance_results_used": bool(trimmed_search_results),
        "guidance_search_skipped": skip_guidance_search,
        "response_mode": selected_mode,
        "task_type": task_type,
        "output_type": output_type,
        "safeguarding_level": safeguarding_level,
    }

    final_explainability = {
        **(explainability_payload or {}),
        **provider_explainability,
    }

    final_evidence_index = _normalise_evidence_index(
        provider_evidence_index
        or final_runtime.get("evidence_index")
        or []
    )

    if final_evidence_index:
        final_runtime["evidence_index"] = final_evidence_index
        final_runtime["evidence_items_loaded"] = len(final_evidence_index)

    meta_payload = {
        "type": "meta",
        "sources": final_sources,
        "runtime": final_runtime,
        "explainability": final_explainability,
    }

    if provider_assistant_scope:
        meta_payload["assistant_scope"] = provider_assistant_scope

    if provider_assistant_context:
        meta_payload["assistant_context"] = provider_assistant_context

    if provider_suggested_actions:
        meta_payload["suggested_actions"] = provider_suggested_actions

    if final_evidence_index:
        meta_payload["evidence_index"] = final_evidence_index

    yield meta_payload

    logger.info("Completed AI stream session_id=%s", session_id)


async def generate_ai_response(
    message: str,
    session_id: str = "non_stream",
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
) -> str:
    parts: list[str] = []

    async for item in generate_ai_stream(
        message=message,
        session_id=session_id,
        history=history,
        document_text=document_text,
        document_name=document_name,
        role=role,
        ld_lens=ld_lens,
        training_mode=training_mode,
        speed=speed,
        user_context=user_context,
        response_mode=response_mode,
        user_id=user_id,
        conversation_id=conversation_id,
    ):
        if isinstance(item, dict) and item.get("type") == "token":
            content = _safe_string(item.get("content"))
            if content:
                parts.append(content)

    return "".join(parts).strip()