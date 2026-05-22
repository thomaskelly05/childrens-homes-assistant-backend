from __future__ import annotations

import asyncio
from pathlib import Path

import pytest
import routers.orb_standalone_routes as orb_standalone_routes
from services.ai_provider_registry import ai_provider_registry
from services.orb_general_assistant_service import orb_general_assistant_service

REPO_ROOT = Path(__file__).resolve().parents[1]
STANDALONE_CLIENT = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-client.ts"
ORB_COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"


@pytest.mark.asyncio
async def test_standalone_answer_includes_model_routing(monkeypatch):
    async def stub_complete(**_kwargs):
        from schemas.ai_models import (
            AiCostTier,
            AiProviderName,
            AiProviderResponse,
            AiQualityTier,
            AiRiskLevel,
            AiRoutingDecision,
            AiTaskType,
            AiModelRouterTrace,
        )

        decision = AiRoutingDecision(
            provider=AiProviderName.MOCK,
            model="mock-text",
            task_type=AiTaskType.PRODUCT_EXPLANATION,
            risk_level=AiRiskLevel.LOW,
            quality_tier=AiQualityTier.BALANCED,
            cost_tier=AiCostTier.STANDARD,
            reason="test",
        )
        trace = AiModelRouterTrace(
            task_type=AiTaskType.PRODUCT_EXPLANATION,
            risk_level=AiRiskLevel.LOW,
            quality_tier=AiQualityTier.BALANCED,
            cost_tier=AiCostTier.STANDARD,
            provider=AiProviderName.MOCK,
            model="mock-text",
            reason="test",
            latency_ms=12,
        )
        return (
            AiProviderResponse(
                text="IndiCare is a children's homes platform.",
                provider=AiProviderName.MOCK,
                model="mock-text",
                latency_ms=12,
            ),
            decision,
            trace,
        )

    monkeypatch.setattr(
        "services.orb_general_assistant_service.ai_model_router_service.complete_with_routing",
        stub_complete,
    )

    result = await orb_general_assistant_service.answer(
        "tell me about indicare",
        mode="Ask ORB",
    )
    routing = (result.get("context_used") or {}).get("model_routing") or {}
    assert routing.get("task_type") == "product_explanation"
    assert routing.get("os_linked") is None
    assert result["context_used"]["os_linked"] is False
    assert result["context_used"]["care_record_access"] is False


def test_model_router_health_endpoint(fake_state):
    response = asyncio.run(
        orb_standalone_routes.standalone_model_router_health(current_user=fake_state["user"])
    )
    data = response["data"]
    assert "default_provider" in data
    assert "providers" in data
    assert "strict" in data
    assert "api_key" not in str(data).lower()


def test_frontend_model_route_display():
    client = STANDALONE_CLIENT.read_text(encoding="utf-8")
    companion = ORB_COMPANION.read_text(encoding="utf-8")
    assert "StandaloneOrbModelRouting" in client
    assert "modelRouting" in companion
    assert "Model route" in companion
    assert "JSON.stringify" not in companion.split("Model route")[1][:400]
