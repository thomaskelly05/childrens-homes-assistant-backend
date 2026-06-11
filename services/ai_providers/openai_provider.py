from __future__ import annotations

import logging
import os
import time
from collections.abc import AsyncIterator
from typing import Any

from schemas.ai_models import (
    AiProviderName,
    AiProviderRequest,
    AiProviderResponse,
    AiUsageEstimate,
)
from services.ai_providers.base import AiProviderBase
from services.openai_header_sanitisation import create_async_openai_client

logger = logging.getLogger("indicare.ai_provider.openai")


def _text(value: Any) -> str:
    return str(value or "").strip()


def _stream_delta(value: Any) -> str:
    """Preserve leading/trailing spaces inside streamed token chunks."""
    if value is None:
        return ""
    return str(value)


def _default_timeout() -> float:
    try:
        return float(os.getenv("OPENAI_TIMEOUT_SECONDS", "45"))
    except (TypeError, ValueError):
        return 45.0


class OpenAiProvider(AiProviderBase):
    provider_name = AiProviderName.OPENAI.value

    def is_available(self) -> bool:
        return bool(_text(os.getenv("OPENAI_API_KEY")))

    async def complete(self, request: AiProviderRequest) -> AiProviderResponse:
        api_key = _text(os.getenv("OPENAI_API_KEY"))
        if not api_key:
            return AiProviderResponse(
                text="",
                provider=AiProviderName.OPENAI,
                model=request.model,
                error="openai_unavailable",
            )

        started = time.perf_counter()
        timeout = request.timeout_seconds or _default_timeout()

        try:
            client = create_async_openai_client(api_key=api_key, timeout=timeout)
            messages = self._build_messages(request)
            response = await client.chat.completions.create(
                model=request.model,
                messages=messages,
                temperature=max(0.0, min(float(request.temperature), 2.0)),
                max_tokens=max(64, min(int(request.max_output_tokens), 4096)),
            )
            choice = response.choices[0] if response.choices else None
            text = _text(choice.message.content if choice and choice.message else "")
            usage = None
            if response.usage:
                usage = AiUsageEstimate(
                    input_tokens=response.usage.prompt_tokens,
                    output_tokens=response.usage.completion_tokens,
                    total_tokens=response.usage.total_tokens,
                )
            latency_ms = int((time.perf_counter() - started) * 1000)
            return AiProviderResponse(
                text=text,
                provider=AiProviderName.OPENAI,
                model=request.model,
                usage=usage,
                latency_ms=latency_ms,
                finish_reason=_text(getattr(choice, "finish_reason", None)) or None,
            )
        except Exception as exc:
            logger.warning(
                "openai_provider_complete_failed model=%s error_type=%s",
                request.model,
                type(exc).__name__,
            )
            return AiProviderResponse(
                text="",
                provider=AiProviderName.OPENAI,
                model=request.model,
                latency_ms=int((time.perf_counter() - started) * 1000),
                error="provider_error",
                metadata={"error_type": type(exc).__name__},
            )

    def _build_messages(self, request: AiProviderRequest) -> list[dict[str, Any]]:
        messages: list[dict[str, Any]] = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        for item in request.history[-16:]:
            role = _text(item.get("role")).lower()
            content = _text(item.get("content"))
            if role in {"user", "assistant"} and content:
                messages.append({"role": role, "content": content})

        if request.images:
            user_content: list[dict[str, Any]] = [{"type": "text", "text": request.message}]
            for url in request.images[:4]:
                user_content.append({"type": "image_url", "image_url": {"url": url}})
            messages.append({"role": "user", "content": user_content})
        else:
            messages.append({"role": "user", "content": request.message})
        return messages

    async def stream(self, request: AiProviderRequest) -> AsyncIterator[str]:
        api_key = _text(os.getenv("OPENAI_API_KEY"))
        if not api_key:
            return

        timeout = request.timeout_seconds or _default_timeout()
        try:
            client = create_async_openai_client(api_key=api_key, timeout=timeout)
            messages = self._build_messages(request)
            stream = await client.chat.completions.create(
                model=request.model,
                messages=messages,
                temperature=max(0.0, min(float(request.temperature), 2.0)),
                max_tokens=max(64, min(int(request.max_output_tokens), 4096)),
                stream=True,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                content = _stream_delta(getattr(delta, "content", None))
                if content:
                    yield content
        except Exception as exc:
            logger.warning(
                "openai_provider_stream_failed model=%s error_type=%s",
                request.model,
                type(exc).__name__,
            )
            return


openai_provider = OpenAiProvider()
