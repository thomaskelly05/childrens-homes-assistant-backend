from __future__ import annotations

import pytest

from schemas.ai_models import AiProviderName, AiRoutingRequest, AiTaskType
from services.ai_model_router_service import ai_model_router_service


@pytest.mark.parametrize(
    ("message", "expected"),
    [
        ("tell me about IndiCare", AiTaskType.PRODUCT_EXPLANATION),
        ("what is quantum computing", AiTaskType.GENERAL_CHAT),
        ("what would Ofsted expect around child voice", AiTaskType.REGULATORY_GUIDANCE),
        ("help me write a daily note", AiTaskType.RECORDING_REWRITE),
        ("does this need safeguarding", AiTaskType.SAFEGUARDING_REFLECTION),
    ],
)
def test_classify_task_examples(message: str, expected: AiTaskType):
    assert ai_model_router_service.classify_task(message) == expected


def test_classify_task_deep_research():
    assert (
        ai_model_router_service.classify_task("deep research what Ofsted expects")
        == AiTaskType.DEEP_RESEARCH
    )


def test_classify_task_image():
    assert (
        ai_model_router_service.classify_task("describe this", has_images=True)
        == AiTaskType.IMAGE_UNDERSTANDING
    )


def test_route_includes_provider_model_and_tiers():
    decision = ai_model_router_service.route(
        AiRoutingRequest(message="tell me about IndiCare", mode="Ask ORB")
    )
    assert decision.provider in {AiProviderName.OPENAI, AiProviderName.MOCK}
    assert decision.model
    assert decision.reason
    assert decision.quality_tier
    assert decision.cost_tier
    assert decision.fallback_provider or decision.provider == AiProviderName.MOCK


@pytest.mark.asyncio
async def test_complete_with_routing_mock_fallback(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response, decision, trace = await ai_model_router_service.complete_with_routing(
        message="hello",
        system_prompt="You are ORB.",
        mode="Ask ORB",
    )
    assert response.text
    assert trace.task_type
    assert trace.provider in {AiProviderName.MOCK, AiProviderName.OPENAI}


@pytest.mark.asyncio
async def test_strict_mode_no_mock_when_openai_missing(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("AI_PROVIDER_STRICT", "true")
    response, decision, trace = await ai_model_router_service.complete_with_routing(
        message="hello",
        system_prompt="test",
    )
    assert decision.provider == AiProviderName.OPENAI
    assert response.error or not response.text
    _ = trace
