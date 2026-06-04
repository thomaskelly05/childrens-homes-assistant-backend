from __future__ import annotations

import pytest

from assistant.llm_provider import ChatStreamRequest, OpenAIProvider, ProviderConfig, reset_llm_provider
from services.ai_external_call_governance import evaluate_external_call, redact_chat_messages
from services.ai_gateway_service import AIGatewayRequest, ai_gateway_service
from services.ai_usage_audit_service import ai_usage_audit_service


@pytest.fixture(autouse=True)
def _patch_audit(monkeypatch):
    recorded: list[dict] = []

    def _record(audit):
        recorded.append(audit)

    monkeypatch.setattr(ai_usage_audit_service, "record", _record)
    yield recorded


def test_streaming_privacy_blocks_when_external_ai_disabled():
    decision = evaluate_external_call(
        feature="orb_chat_stream",
        metadata={"external_ai_enabled": False},
        local_fallback_available=True,
    )
    assert decision.allowed is False


def test_streaming_redacts_messages_before_provider():
    messages = [
        {"role": "user", "content": "John Smith DOB 01/02/2010 at SW1A 1AA"},
    ]
    redacted, applied = redact_chat_messages(messages, mode="strict")
    assert applied is True
    assert "John Smith" not in redacted[0]["content"]


@pytest.mark.asyncio
async def test_stream_chat_raises_when_governance_blocks(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "false")
    provider = OpenAIProvider(ProviderConfig(provider_name="openai", api_key="sk-test"))

    async def _fail_create(**_kwargs):
        raise AssertionError("OpenAI should not be called when external AI is disabled")

    provider._client.chat.completions.create = _fail_create  # type: ignore[method-assign]

    with pytest.raises(RuntimeError, match="external_ai_disabled"):
        async for _ in provider.stream_chat(
            ChatStreamRequest(
                messages=[{"role": "user", "content": "hello"}],
                metadata={"ai_feature": "orb_chat_stream"},
            )
        ):
            pass


def test_gateway_blocks_restricted_feature(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    with pytest.raises(Exception) as exc:
        ai_gateway_service.draft_text(
            AIGatewayRequest(
                feature="medical_diagnosis_draft",
                prompt="test",
                external_ai_required=True,
            )
        )
    assert exc.value.status_code == 403


def test_audit_persistence_failure_does_not_break_gateway_response(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")

    class _Msg:
        content = "draft"

    class _Choice:
        message = _Msg()

    class _Resp:
        choices = [_Choice()]

    class _Completions:
        def create(self, **_kwargs):
            return _Resp()

    class _Client:
        chat = type("Chat", (), {"completions": _Completions()})()

    monkeypatch.setattr(ai_gateway_service, "_client", _Client())
    monkeypatch.setattr(
        ai_usage_audit_service,
        "record",
        lambda _audit: (_ for _ in ()).throw(RuntimeError("db down")),
    )

    response = ai_gateway_service.draft_text(
        AIGatewayRequest(feature="metadata", prompt="Summarise", system_prompt="sys")
    )
    assert response.ok is True
    assert response.text == "draft"
