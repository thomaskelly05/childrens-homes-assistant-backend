from __future__ import annotations

import json
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
    async def stream_chat(self, request: ChatStreamRequest) -> AsyncIterator[str | dict[str, Any]]:
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


def _looks_like_json(text: str) -> bool:
    value = _safe_string(text)
    return value.startswith("{") and value.endswith("}")


def _safe_json_loads(text: str) -> dict[str, Any] | None:
    value = _safe_string(text)
    if not value:
        return None

    try:
        parsed = json.loads(value)
        if isinstance(parsed, dict):
            return parsed
        return None
    except Exception:
        return None


def _build_structured_output_instruction() -> str:
    return """
Return the final answer in this exact JSON shape:

{
  "text": "final answer text for the user",
  "sources": [],
  "runtime": {},
  "explainability": {},
  "assistant_scope": {},
  "assistant_context": {},
  "suggested_actions": [],
  "evidence_index": []
}

Rules:
- "text" must contain the full user-facing answer.
- If no sources are available, return an empty array.
- If no evidence_index is available, return an empty array.
- Do not wrap the JSON in markdown fences.
- Return valid JSON only.
""".strip()


def _should_request_structured_output(metadata: dict[str, Any]) -> bool:
    if not isinstance(metadata, dict):
        return True

    explicit = metadata.get("structured_output")
    if isinstance(explicit, bool):
        return explicit

    return True


def _merge_structured_instruction(messages: list[dict[str, str]]) -> list[dict[str, str]]:
    if not messages:
        return messages

    updated = list(messages)
    instruction = _build_structured_output_instruction()

    if updated[0]["role"] == "system":
        updated[0] = {
            "role": "system",
            "content": f'{updated[0]["content"]}\n\n{"=" * 60}\nSTRUCTURED OUTPUT CONTRACT\n\n{instruction}',
        }
        return updated

    return [{"role": "system", "content": instruction}, *updated]


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

    async def _stream_text_chat(
        self,
        *,
        request: ChatStreamRequest,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str]:
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

    async def _generate_structured_followup(
        self,
        *,
        request: ChatStreamRequest,
        original_messages: list[dict[str, str]],
        final_answer_text: str,
    ) -> dict[str, Any] | None:
        model = _safe_string(request.model) or "gpt-4o-mini"
        max_tokens = min(max(_normalise_max_tokens(request.max_tokens), 512), 4096)

        followup_messages = [
            *original_messages,
            {"role": "assistant", "content": final_answer_text},
            {
                "role": "user",
                "content": (
                    "Now convert your final answer into the required JSON structure only. "
                    "Do not change the meaning of the answer. Return valid JSON only."
                ),
            },
        ]
        followup_messages = _merge_structured_instruction(followup_messages)

        try:
            response = await self._client.chat.completions.create(
                model=model,
                messages=followup_messages,
                temperature=0,
                max_tokens=max_tokens,
                stream=False,
            )

            if not response.choices:
                return None

            message = response.choices[0].message
            raw_content = getattr(message, "content", None)

            if isinstance(raw_content, list):
                parts: list[str] = []
                for part in raw_content:
                    if isinstance(part, dict):
                        part_text = _safe_string(part.get("text"))
                        if part_text:
                            parts.append(part_text)
                text = "\n".join(parts).strip()
            else:
                text = _safe_string(raw_content)

            if not text:
                return None

            parsed = _safe_json_loads(text)
            if parsed is None:
                logger.warning("Structured follow-up was not valid JSON")
                return None

            return parsed

        except Exception:
            logger.exception("Structured follow-up generation failed")
            return None

    async def stream_chat(self, request: ChatStreamRequest) -> AsyncIterator[str | dict[str, Any]]:
        messages = _normalise_messages(request.messages)

        if not messages:
            logger.warning("OpenAIProvider.stream_chat called with no valid messages")
            return

        structured_output = _should_request_structured_output(request.metadata)
        streaming_messages = list(messages)

        final_text_parts: list[str] = []

        try:
            async for token in self._stream_text_chat(
                request=request,
                messages=streaming_messages,
            ):
                if token:
                    final_text_parts.append(token)
                    yield token

            final_answer_text = "".join(final_text_parts).strip()

            if structured_output and final_answer_text:
                structured = await self._generate_structured_followup(
                    request=request,
                    original_messages=messages,
                    final_answer_text=final_answer_text,
                )

                if structured:
                    if not _safe_string(structured.get("text")):
                        structured["text"] = final_answer_text

                    if not isinstance(structured.get("sources"), list):
                        structured["sources"] = []

                    if not isinstance(structured.get("runtime"), dict):
                        structured["runtime"] = {}

                    if not isinstance(structured.get("explainability"), dict):
                        structured["explainability"] = {}

                    if not isinstance(structured.get("assistant_scope"), dict):
                        structured["assistant_scope"] = {}

                    if not isinstance(structured.get("assistant_context"), dict):
                        structured["assistant_context"] = {}

                    if not isinstance(structured.get("suggested_actions"), list):
                        structured["suggested_actions"] = []

                    if not isinstance(structured.get("evidence_index"), list):
                        structured["evidence_index"] = []

                    yield structured

        except Exception as exc:
            logger.exception(
                "LLM stream failed provider=%s model=%s error=%r",
                self._provider_name,
                _safe_string(request.model) or "gpt-4o-mini",
                exc,
            )
            raise

        finally:
            logger.info(
                "LLM stream end provider=%s model=%s",
                self._provider_name,
                _safe_string(request.model) or "gpt-4o-mini",
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