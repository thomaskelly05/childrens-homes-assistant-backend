from __future__ import annotations

import asyncio
import logging
import os

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
):
    history = history or []
    user_context = user_context or {}

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

    messages = [
        {"role": "system", "content": final_system_prompt},
        *trimmed_history,
        {"role": "user", "content": user_message},
    ]

    logger.info(
        (
            "Starting AI stream session_id=%s mode=%s task_type=%s output_type=%s "
            "safeguarding=%s response_mode=%s model=%s temperature=%s max_tokens=%s "
            "history_count=%s has_document=%s sources=%s guidance_enabled=%s guidance_reason=%s"
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
    )

    provider = get_llm_provider()

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
                },
            )
        ):
            if _safe_string(content):
                yield {
                    "type": "token",
                    "content": content,
                }

    except Exception:
        logger.exception("AI provider stream failed for session_id=%s", session_id)
        yield {
            "type": "token",
            "content": "Sorry, something went wrong while generating the response.",
        }

    yield {
        "type": "meta",
        "sources": sources_used,
        "runtime": runtime_payload,
        "explainability": explainability_payload,
    }

    logger.info("Completed AI stream session_id=%s", session_id)
