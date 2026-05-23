from __future__ import annotations

import pytest

from schemas.orb_agents import OrbAgentRunRequest
from services.orb_agent_orchestrator_service import orb_agent_orchestrator_service
from services.orb_knowledge_library_service import orb_knowledge_library_service


@pytest.fixture(autouse=True)
def seeded_library(monkeypatch):
    svc = orb_knowledge_library_service
    svc._memory_sources = {}
    svc._memory_chunks = {}
    svc._seeded = False
    monkeypatch.setattr(svc, "_use_db", lambda: False)
    svc.seed_builtin_sources()


@pytest.mark.asyncio
async def test_run_agent_returns_sources_citations_steps(monkeypatch):
    async def stub_llm(**_kwargs):
        from schemas.ai_models import (
            AiCostTier,
            AiModelRouterTrace,
            AiProviderName,
            AiProviderResponse,
            AiQualityTier,
            AiRiskLevel,
            AiRoutingDecision,
            AiTaskType,
        )

        decision = AiRoutingDecision(
            provider=AiProviderName.MOCK,
            model="mock-text",
            task_type=AiTaskType.DEEP_RESEARCH,
            risk_level=AiRiskLevel.MEDIUM,
            quality_tier=AiQualityTier.STANDARD,
            cost_tier=AiCostTier.LOW,
            reason="test",
            fallback_provider=None,
            fallback_model=None,
            estimated_cost_tier=AiCostTier.LOW,
            requires_citations=True,
            requires_rag=True,
            requires_vision=False,
            requires_safety_review=False,
            max_output_tokens=800,
            timeout_seconds=30,
        )
        trace = AiModelRouterTrace(
            task_type=AiTaskType.DEEP_RESEARCH,
            risk_level=AiRiskLevel.MEDIUM,
            quality_tier=AiQualityTier.STANDARD,
            cost_tier=AiCostTier.LOW,
            provider=AiProviderName.MOCK,
            model="mock-text",
            reason="test",
            fallback_used=False,
        )
        return (
            AiProviderResponse(text="## Summary\n\nTest briefing.\n\n## Key points\n\n- Point one", provider=AiProviderName.MOCK, model="mock-text"),
            decision,
            trace,
        )

    monkeypatch.setattr(
        "services.orb_agent_orchestrator_service.ai_model_router_service.complete_with_routing",
        stub_llm,
    )

    request = OrbAgentRunRequest(
        agent_type="ofsted_research",
        prompt="Research what Ofsted expects around child voice",
        preferred_output="briefing",
        depth="standard",
    )
    response = await orb_agent_orchestrator_service.run_agent(request)

    assert response.agent_type == "ofsted_research"
    assert response.output.body
    assert response.steps
    assert response.safety_notice
    assert response.context_used.get("os_linked") is False
    assert response.context_used.get("care_record_access") is False


@pytest.mark.asyncio
async def test_run_agent_includes_live_web_note_in_warnings():
    request = OrbAgentRunRequest(
        agent_type="general_research",
        prompt="Research guidance on supervision",
        depth="quick",
    )
    response = await orb_agent_orchestrator_service.run_agent(request)
    combined = " ".join(
        [
            " ".join(response.warnings),
            response.output.body,
            response.safety_notice or "",
        ]
    ).lower()
    assert "live web" in combined or "knowledge library" in combined
