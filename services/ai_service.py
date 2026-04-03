from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from openai import AsyncOpenAI

from assistant.orchestrator import OrchestratorRequest, build_orchestrator_result
from assistant.web_search import web_search

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

SEARCH_TIMEOUT_SECONDS = float(os.getenv("GUIDANCE_SEARCH_TIMEOUT_SECONDS", "3.0"))


async def maybe_run_guidance_search(
    message: str,
    enabled: bool,
    search_query: str = "",
) -> str:
    if not enabled:
        return ""

    query = (search_query or message or "").strip()
    if not query:
        return ""

    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(web_search, query),
            timeout=SEARCH_TIMEOUT_SECONDS,
        )
        return result or ""
    except TimeoutError:
        logger.warning("Guidance search timed out")
        return ""
    except Exception:
        logger.exception("Guidance search failed")
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
):
    history = history or []
    user_context = user_context or {}

    orchestration = build_orchestrator_result(
        OrchestratorRequest(
            message=message,
            session_id=session_id,
            history=history,
            role=role,
            document_text=document_text,
            document_name=document_name,
            ld_lens=ld_lens,
            training_mode=training_mode,
            speed=response_mode or speed or "balanced",
            user_context=user_context,
        )
    )

    system_prompt = orchestration.system_prompt
    messages = orchestration.messages
    runtime = orchestration.runtime
    mode = getattr(runtime, "mode", "general_practice")
    safeguarding_level = getattr(runtime, "safeguarding_level", "normal")
    sources_used = orchestration.sources
    runtime_payload = orchestration.runtime_payload
    guidance_plan = orchestration.guidance_plan
    model_plan = orchestration.model_plan

    search_results = await maybe_run_guidance_search(
        message=message,
        enabled=guidance_plan.enabled,
        search_query=guidance_plan.search_query,
    )

    if search_results:
        system_prompt += f"""

LIVE GUIDANCE CONTEXT

The following trusted guidance excerpts were retrieved for this request:

{search_results}

Use this only where it genuinely improves accuracy.
Prefer statutory guidance, legislation, Ofsted, and official frameworks where relevant.
Do not let this stop you completing practical drafting tasks directly.
"""
        # Rebuild messages so the updated system prompt is included
        messages = [{"role": "system", "content": system_prompt}, *orchestration.trimmed_history, {"role": "user", "content": orchestration.user_message}]

    logger.info(
        (
            "Starting OpenAI stream session_id=%s mode=%s safeguarding=%s "
            "response_mode=%s model=%s max_tokens=%s history_count=%s "
            "has_document=%s sources=%s guidance_enabled=%s guidance_reason=%s"
        ),
        session_id,
        mode,
        safeguarding_level,
        orchestration.selected_mode,
        model_plan.model,
        model_plan.max_tokens,
        len(messages),
        bool(orchestration.trimmed_document_text),
        len(sources_used),
        guidance_plan.enabled,
        guidance_plan.reason,
    )

    stream = await client.chat.completions.create(
        model=model_plan.model,
        messages=messages,
        stream=True,
        temperature=model_plan.temperature,
        max_tokens=model_plan.max_tokens,
    )

    async for chunk in stream:
        if not chunk.choices:
            continue

        delta = chunk.choices[0].delta
        content = getattr(delta, "content", None)

        if content:
            yield {
                "type": "token",
                "content": content,
            }

    yield {
        "type": "meta",
        "sources": sources_used,
        "runtime": runtime_payload,
    }

    logger.info("Completed OpenAI stream session_id=%s", session_id)
