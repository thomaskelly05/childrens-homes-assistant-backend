from __future__ import annotations

import logging
import os
from typing import Any, Iterable

from openai import OpenAI

logger = logging.getLogger("indicare.streaming")

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_messages(messages: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Convert simple message dicts into the format expected by chat completions.
    Skips empty / invalid rows safely.
    """
    formatted_messages: list[dict[str, Any]] = []

    for m in messages:
        role = _safe_string(m.get("role"))
        content = _safe_string(m.get("content"))

        if role not in {"system", "user", "assistant"}:
            continue

        if not content:
            continue

        formatted_messages.append({
            "role": role,
            "content": [
                {"type": "text", "text": content}
            ]
        })

    return formatted_messages


def run_chat_stream(
    messages: list[dict[str, Any]],
    model: str = "gpt-4o-mini",
) -> Iterable[str]:
    """
    Stream assistant text chunks from OpenAI.

    Input format:
    [
        {"role": "system", "content": "..."},
        {"role": "user", "content": "..."},
        {"role": "assistant", "content": "..."},
    ]
    """

    formatted_messages = _normalise_messages(messages)

    if not formatted_messages:
        logger.warning("run_chat_stream called with no valid messages")
        return

    try:
        stream = client.chat.completions.create(
            model=model,
            messages=formatted_messages,
            stream=True,
        )

        for chunk in stream:
            try:
                if not chunk.choices:
                    continue

                delta = chunk.choices[0].delta
                if not delta:
                    continue

                content = getattr(delta, "content", None)
                if content:
                    yield content

            except Exception as chunk_error:
                logger.exception("Failed while reading stream chunk: %s", chunk_error)
                continue

    except Exception as e:
        logger.exception("OpenAI streaming request failed: %s", e)
        yield "\n\nSorry, something went wrong while generating the response. Please try again."
