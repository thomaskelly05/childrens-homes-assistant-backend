from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Protocol

from openai import AsyncOpenAI

logger = logging.getLogger("indicare.llm_provider")


@dataclass
class ChatMessage:
    role: str
    content: str


@dataclass
class ChatStreamRequest:
    messages: list[dict[str, Any]] | list[ChatMessage]
    model: str = "gpt-4o-mini"
    temperature: float = 0.2
    max_tokens: int = 850
    top_p: float | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ProviderConfig:
    provider_name: str
    api_key: str | None
    base_url: str | None = None
    organisation: str | None = None
    project: str | None = None


class LLMProvider(Protocol):
    async def stream_chat(self, request: ChatStreamRequest) -> AsyncIterator[str]:
        ...


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_role(value: Any) -> str:
    role = _safe_string(value).lower()
    if role in {"system", "user", "assistant"}:
        return role
    return ""


def _normalise_messages(
    messages: list[dict[str, Any]] | list[ChatMessage],
) -> list[dict[str, str]]:
    formatted: list[dict[str, str]] = []

    for item in messages or []:
        if isinstance(item, ChatMessage):
            role = _normalise_role(item.role)
            content = _safe_string(item.content)
        elif isinstance(item, dict):
            role = _normalise_role(item.get("role"))
            raw_content = item.get("content")

            if isinstance(raw_content, list):
                parts: list[str] = []
                for part in raw_content:
                    if isinstance(part, dict):
                        part_text = _safe_string(part.get("text"))
                        if part_text:
                            parts.append(part_text)
                content = "\n".join(parts).strip()
            else:
                content = _safe_string(raw_content)
        else:
            continue

        if not role or not content:
            continue

        formatted.append(
            {
                "role": role,
                "content": content,
            }
        )

    return formatted


def _normalise_temperature(value: Any) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.2

    if number < 0:
        return 0.0
    if number > 2:
        return 2.0
    return number


def _normalise_max_tokens(value: Any) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return 850

    return max(64, min(number, 4096))


def _load_provider_config() -> ProviderConfig:
    provider_name = _safe_string(os.getenv("INDICARE_LLM_PROVIDER", "openai")).lower()

    if provider_name == "openai":
        return ProviderConfig(
            provider_name="openai",
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=_safe_string(os.getenv("OPENAI_BASE_URL")) or None,
            organisation=_safe_string(os.getenv("OPENAI_ORG_ID")) or None,
            project=_safe_string(os.getenv("OPENAI_PROJECT_ID")) or None,
        )

    return ProviderConfig(
        provider_name=provider_name,
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=_safe_string(os.getenv("OPENAI_BASE_URL")) or None,
        organisation=_safe_string(os.getenv("OPENAI_ORG_ID")) or None,
        project=_safe_string(os.getenv("OPENAI_PROJECT_ID")) or None,
    )


class OpenAIProvider:
    def __init__(self, config: ProviderConfig):
        if not config.api_key:
            raise RuntimeError("OPENAI_API_KEY is missing")

        client_kwargs: dict[str, Any] = {
            "api_key": config.api_key,
        }

        if config.base_url:
            client_kwargs["base_url"] = config.base_url
        if config.organisation:
            client_kwargs["organization"] = config.organisation
        if config.project:
            client_kwargs["project"] = config.project

        self._client = AsyncOpenAI(**client_kwargs)
        self._provider_name = "openai"

    async def stream_chat(self, request: ChatStreamRequest) -> AsyncIterator[str]:
        messages = _normalise_messages(request.messages)

        if not messages:
            logger.warning("OpenAIProvider.stream_chat called with no valid messages")
            return

        model = _safe_string(request.model) or "gpt-4o-mini"
        temperature = _normalise_temperature(request.temperature)
        max_tokens = _normalise_max_tokens(request.max_tokens)

        params: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": True,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if request.top_p is not None:
            try:
                params["top_p"] = float(request.top_p)
            except (TypeError, ValueError):
                pass

        logger.info(
            "LLM stream start provider=%s model=%s temperature=%s max_tokens=%s messages=%s",
            self._provider_name,
            model,
            temperature,
            max_tokens,
            len(messages),
        )

        try:
            stream = await self._client.chat.completions.create(**params)

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

                except Exception:
                    logger.exception("Error while reading streamed OpenAI chunk")
                    continue

        except Exception as exc:
            logger.exception(
                "LLM stream failed provider=%s model=%s error=%r",
                self._provider_name,
                model,
                exc,
            )
            raise

        finally:
            logger.info(
                "LLM stream end provider=%s model=%s",
                self._provider_name,
                model,
            )


_provider_instance: LLMProvider | None = None


def build_llm_provider() -> LLMProvider:
    config = _load_provider_config()

    if config.provider_name == "openai":
        return OpenAIProvider(config)

    logger.warning(
        "Unknown LLM provider '%s'. Falling back to OpenAIProvider.",
        config.provider_name,
    )
    return OpenAIProvider(config)


def get_llm_provider() -> LLMProvider:
    global _provider_instance

    if _provider_instance is None:
        _provider_instance = build_llm_provider()

    return _provider_instance


def reset_llm_provider() -> None:
    global _provider_instance
    _provider_instance = None
