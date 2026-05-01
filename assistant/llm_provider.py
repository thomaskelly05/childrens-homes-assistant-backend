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
                        text = _safe_string(part.get("text"))
                        if text:
                            parts.append(text)
                content = "\n".join(parts).strip()
            else:
                content = _safe_string(raw_content)
        else:
            continue

        if not role or not content:
            continue

        formatted.append({"role": role, "content": content})

    return formatted


def _normalise_temperature(value: Any) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.2

    return max(0.0, min(number, 2.0))


def _normalise_max_tokens(value: Any) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return 850

    return max(64, min(number, 4096))


def _load_provider_config() -> ProviderConfig:
    provider_name = _safe_string(os.getenv("INDICARE_LLM_PROVIDER", "openai")).lower()

    return ProviderConfig(
        provider_name=provider_name,
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=_safe_string(os.getenv("OPENAI_BASE_URL")) or None,
        organisation=_safe_string(os.getenv("OPENAI_ORG_ID")) or None,
        project=_safe_string(os.getenv("OPENAI_PROJECT_ID")) or None,
    )


def _safe_json_loads(text: str) -> dict[str, Any] | None:
    value = _safe_string(text)
    if not value:
        return None

    if value.startswith("```"):
        value = value.strip("`").strip()
        if value.lower().startswith("json"):
            value = value[4:].strip()

    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        return None


def _normalise_structured_payload(
    payload: dict[str, Any] | None,
    *,
    fallback_text: str,
) -> dict[str, Any]:
    payload = payload if isinstance(payload, dict) else {}

    text = _safe_string(
        payload.get("text")
        or payload.get("answer")
        or payload.get("message")
        or payload.get("content")
        or fallback_text
    )

    return {
        "type": "structured",
        "text": text or fallback_text,
        "sources": payload.get("sources") if isinstance(payload.get("sources"), list) else [],
        "runtime": payload.get("runtime") if isinstance(payload.get("runtime"), dict) else {},
        "explainability": payload.get("explainability") if isinstance(payload.get("explainability"), dict) else {},
        "assistant_scope": payload.get("assistant_scope") if isinstance(payload.get("assistant_scope"), dict) else {},
        "assistant_context": payload.get("assistant_context") if isinstance(payload.get("assistant_context"), dict) else {},
        "suggested_actions": payload.get("suggested_actions") if isinstance(payload.get("suggested_actions"), list) else [],
        "evidence_index": payload.get("evidence_index") if isinstance(payload.get("evidence_index"), list) else [],
    }


def _build_structured_output_instruction() -> str:
    return """
Return valid JSON only in this exact shape:

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
- Preserve inline evidence citations already used in the answer.
- Never invent source IDs, record IDs, citation_ref values, dates, or evidence.
- If no sources are available, return an empty array.
- If no evidence_index is available, return an empty array.
- Do not wrap the JSON in markdown fences.
""".strip()


def _should_request_structured_output(metadata: dict[str, Any]) -> bool:
    if not isinstance(metadata, dict):
        return True

    explicit = metadata.get("structured_output")
    if isinstance(explicit, bool):
        return explicit

    return True


class OpenAIProvider:
    def __init__(self, config: ProviderConfig):
        if not config.api_key:
            raise RuntimeError("OPENAI_API_KEY is missing")

        client_kwargs: dict[str, Any] = {"api_key": config.api_key}

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

    async def _generate_structured_meta(
        self,
        *,
        request: ChatStreamRequest,
        original_messages: list[dict[str, str]],
        final_answer_text: str,
    ) -> dict[str, Any]:
        model = _safe_string(request.model) or "gpt-4o-mini"
        max_tokens = min(max(_normalise_max_tokens(request.max_tokens), 512), 4096)

        messages = [
            {
                "role": "system",
                "content": _build_structured_output_instruction(),
            },
            {
                "role": "user",
                "content": (
                    "Create the JSON metadata wrapper for this final answer.\n\n"
                    "Do not rewrite the answer. Do not add new facts. "
                    "Do not invent sources or evidence.\n\n"
                    f"Final answer:\n{final_answer_text}"
                ),
            },
        ]

        try:
            response = await self._client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0,
                max_tokens=max_tokens,
                stream=False,
            )

            if not response.choices:
                return _normalise_structured_payload(
                    None,
                    fallback_text=final_answer_text,
                )

            raw_content = getattr(response.choices[0].message, "content", None)
            text = _safe_string(raw_content)
            parsed = _safe_json_loads(text)

            if parsed is None:
                logger.warning("Structured metadata response was not valid JSON")
                return _normalise_structured_payload(
                    None,
                    fallback_text=final_answer_text,
                )

            return _normalise_structured_payload(
                parsed,
                fallback_text=final_answer_text,
            )

        except Exception:
            logger.exception("Structured metadata generation failed")
            return _normalise_structured_payload(
                None,
                fallback_text=final_answer_text,
            )

    async def stream_chat(self, request: ChatStreamRequest) -> AsyncIterator[str | dict[str, Any]]:
        messages = _normalise_messages(request.messages)

        if not messages:
            logger.warning("OpenAIProvider.stream_chat called with no valid messages")
            return

        structured_output = _should_request_structured_output(request.metadata)
        final_text_parts: list[str] = []

        try:
            async for token in self._stream_text_chat(
                request=request,
                messages=messages,
            ):
                if token:
                    final_text_parts.append(token)
                    yield token

            final_answer_text = "".join(final_text_parts).strip()

            if structured_output and final_answer_text:
                structured = await self._generate_structured_meta(
                    request=request,
                    original_messages=messages,
                    final_answer_text=final_answer_text,
                )
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
