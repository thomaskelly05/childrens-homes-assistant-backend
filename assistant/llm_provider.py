from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any, AsyncIterator

from openai import AsyncOpenAI

logger = logging.getLogger("indicare.llm_provider")


# ---------------------------------------------------------
# Public configuration objects
# ---------------------------------------------------------

@dataclass
class ChatStreamRequest:
    messages: list[dict[str, Any]]
    model: str = "gpt-4o-mini"
    temperature: float = 0.2
    max_tokens: int = 850


# ---------------------------------------------------------
# Base provider
# ---------------------------------------------------------

class BaseLLMProvider:
    provider_name: str = "base"

    async def stream_chat(self, request: ChatStreamRequest) -> AsyncIterator[str]:
        raise NotImplementedError


# ---------------------------------------------------------
# OpenAI provider
# ---------------------------------------------------------

class OpenAIProvider(BaseLLMProvider):
    provider_name = "openai"

    def __init__(self, api_key: str | None = None):
        self.client = AsyncOpenAI(api_key=api_key or os.environ.get("OPENAI_API_KEY"))

    @staticmethod
    def _safe_string(value: Any) -> str:
        if value is None:
            return ""
        if isinstance(value, str):
            return value.strip()
        return str(value).strip()

    def _normalise_messages(self, messages: list[dict[str, Any]]) -> list[dict[str, str]]:
        """
        Convert mixed internal message shapes into the simple format expected by
        chat completions:
            [{"role": "system", "content": "..."}, ...]
        """
        formatted: list[dict[str, str]] = []

        for item in messages or []:
            if not isinstance(item, dict):
                continue

            role = self._safe_string(item.get("role")).lower()
            content = self._safe_string(item.get("content"))

            if role not in {"system", "user", "assistant"}:
                continue
            if not content:
                continue

            formatted.append(
                {
                    "role": role,
                    "content": content,
                }
            )

        return formatted

    async def stream_chat(self, request: ChatStreamRequest) -> AsyncIterator[str]:
        formatted_messages = self._normalise_messages(request.messages)

        if not formatted_messages:
            logger.warning("OpenAIProvider.stream_chat called with no valid messages")
            return

        logger.info(
            "OpenAIProvider starting stream model=%s temperature=%s max_tokens=%s messages=%s",
            request.model,
            request.temperature,
            request.max_tokens,
            len(formatted_messages),
        )

        try:
            stream = await self.client.chat.completions.create(
                model=request.model,
                messages=formatted_messages,
                stream=True,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            )

            async for chunk in stream:
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
                    logger.exception("OpenAIProvider chunk read failed: %s", chunk_error)
                    continue

        except Exception as e:
            logger.exception("OpenAIProvider stream failed: %s", e)
            raise


# ---------------------------------------------------------
# Provider factory
# ---------------------------------------------------------

def get_llm_provider() -> BaseLLMProvider:
    """
    Central provider factory.

    Later, this can support:
    - AnthropicProvider
    - AzureOpenAIProvider
    - LocalProvider

    For now, OpenAI is the active provider.
    """
    provider_name = (os.environ.get("LLM_PROVIDER") or "openai").strip().lower()

    if provider_name == "openai":
        return OpenAIProvider()

    logger.warning("Unknown LLM_PROVIDER=%s, falling back to OpenAIProvider", provider_name)
    return OpenAIProvider()
