"""Legacy OpenAI streaming helper.

Status: **not wired to live routes** — ORB chat streaming uses ``assistant.llm_provider``
(``OpenAIProvider.stream_chat``) with ``AIPrivacyDecision``, redaction and usage audit.

Kept for backward compatibility and inventory tests. New code must not import this module.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Iterable

logger = logging.getLogger("indicare.streaming")


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_messages(messages: Iterable[dict[str, Any]]) -> list[dict[str, str]]:
    formatted_messages: list[dict[str, str]] = []

    for m in messages:
        role = _safe_string(m.get("role"))
        content = _safe_string(m.get("content"))

        if role not in {"system", "user", "assistant"}:
            continue

        if not content:
            continue

        formatted_messages.append({"role": role, "content": content})

    return formatted_messages


def run_chat_stream(
    messages: list[dict[str, Any]],
    model: str = "gpt-4o-mini",
    *,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
    metadata: dict[str, Any] | None = None,
) -> Iterable[str]:
    """Stream assistant text via governed OpenAI path (legacy module only)."""
    from services.ai_external_call_governance import (
        evaluate_external_call,
        record_model_usage,
        redact_chat_messages,
    )

    formatted_messages = _normalise_messages(messages)

    if not formatted_messages:
        logger.warning("run_chat_stream called with no valid messages")
        return

    meta = metadata if isinstance(metadata, dict) else {}
    decision = evaluate_external_call(
        feature=str(meta.get("ai_feature") or "legacy_assistant_stream"),
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        metadata={**meta, "route": "assistant.streaming.run_chat_stream"},
        local_fallback_available=False,
    )
    if not decision.allowed:
        yield "\n\nExternal AI is not available for this request. Please review provider settings."
        return

    formatted_messages, redaction_applied = redact_chat_messages(
        formatted_messages,
        mode=decision.redaction_mode,
    )

    api_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not api_key:
        yield "\n\nSorry, external AI is not configured."
        return

    try:
        from services.openai_header_sanitisation import create_sync_openai_client

        client = create_sync_openai_client(api_key=api_key)
        stream = client.chat.completions.create(
            model=model,
            messages=formatted_messages,
            stream=True,
        )

        output_parts: list[str] = []
        for chunk in stream:
            try:
                if not chunk.choices:
                    continue

                delta = chunk.choices[0].delta
                if not delta:
                    continue

                content = getattr(delta, "content", None)
                if content:
                    output_parts.append(content)
                    yield content

            except Exception as chunk_error:
                logger.exception("Failed while reading stream chunk: %s", chunk_error)
                continue

        record_model_usage(
            feature=str(meta.get("ai_feature") or "legacy_assistant_stream"),
            decision=decision,
            provider_id=provider_id,
            home_id=home_id,
            user_id=user_id,
            model=model,
            input_tokens=max(1, sum(len(m.get("content", "")) for m in formatted_messages) // 4),
            output_tokens=max(1, len("".join(output_parts)) // 4),
            redaction_applied=redaction_applied,
            metadata={"route": "assistant.streaming.run_chat_stream", "stream": True},
        )

    except Exception as e:
        logger.exception("OpenAI streaming request failed: %s", e)
        yield "\n\nSorry, something went wrong while generating the response. Please try again."
