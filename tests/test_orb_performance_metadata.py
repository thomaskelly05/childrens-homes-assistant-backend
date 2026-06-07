"""ORB Residential performance timing metadata contract tests."""

from __future__ import annotations

import asyncio

import pytest

from routers.orb_standalone_routes import (
    OrbStandaloneConversationRequest,
    standalone_orb_conversation,
)
from services.orb_chat_timing_service import (
    OrbChatTimingTracker,
    build_route_timing_payload,
)
from services.indicare_intelligence_route_finalize_service import finalize_standalone_intelligence


def test_build_route_timing_payload_includes_stages():
    tracker = OrbChatTimingTracker()
    tracker.mark("request_received")
    tracker.mark("retrieval_complete")
    tracker.mark("model_start")
    tracker.mark("model_complete")
    tracker.mark("response_sent")

    payload = build_route_timing_payload(
        tracker,
        route="/orb/standalone/conversation",
        elapsed_ms=1200,
        retrieval_elapsed_ms=45,
        provider_elapsed_ms=900,
        prompt_tier="deep",
        prompt_char_estimate=8000,
    )

    assert payload["route"] == "/orb/standalone/conversation"
    assert payload["elapsed_ms"] == 1200
    assert payload["retrieval_elapsed_ms"] == 45
    assert payload["provider_elapsed_ms"] == 900
    assert payload["prompt_tier"] == "deep"
    assert "stages" in payload
    assert payload["stages"].get("request_received_ms") == 0
    assert payload["stages"].get("model_complete_ms") is not None


def test_finalize_records_timing_marks(monkeypatch):
    monkeypatch.setenv("ORB_CHAT_TIMING_DEBUG", "true")
    from services.indicare_intelligence_core_service import indicare_intelligence_core_service

    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "Create an Ofsted evidence map for missing-from-care practice.",
        mode="Ofsted Lens",
    )
    timing = OrbChatTimingTracker()
    finalize_standalone_intelligence(
        indicare_intelligence=packet,
        answer="## Evidence map\n\nTheme one.",
        prompt_text="Create an Ofsted evidence map for missing-from-care practice.",
        mode="Ofsted Lens",
        record_learning=False,
        timing=timing,
    )
    marks = timing.to_stage_metadata()
    assert marks.get("finalise_start_ms") is not None
    assert marks.get("quality_gate_complete_ms") is not None


@pytest.mark.asyncio
async def test_conversation_context_used_includes_timing(fake_state, monkeypatch):
    async def stub_answer(*_args, **_kwargs):
        return {
            "answer": "## Ofsted evidence map\n\n### Theme\n\nDetail.",
            "confidence": "medium",
            "context_used": {
                "model_routing": {
                    "model": "mock-text",
                    "provider": "mock",
                    "latency_ms": 500,
                }
            },
            "sources": [],
            "citations": [],
        }

    monkeypatch.setattr(
        "routers.orb_standalone_routes._select_assistant_runtime",
        lambda: type("Runtime", (), {"answer": stub_answer})(),
    )
    monkeypatch.setattr(
        "routers.orb_standalone_routes.record_standalone_orb_usage",
        lambda **_kwargs: None,
    )
    monkeypatch.setattr(
        "routers.orb_standalone_routes.orb_plan_enforcement_service.enforce_or_raise",
        lambda **_kwargs: type("Decision", (), {"use_safeguarding_template": False, "soft_limit_reached": False})(),
    )
    monkeypatch.setattr(
        "services.indicare_intelligence_core_service.indicare_intelligence_core_service.record_learning",
        lambda *_args, **_kwargs: {"recorded": False, "skipped": True},
    )

    response = await standalone_orb_conversation(
        OrbStandaloneConversationRequest(
            message="Create an Ofsted evidence map for missing-from-care practice.",
            mode="Ofsted Lens",
        ),
        current_user=fake_state["user"],
    )

    assert response["standalone"] is True
    assert response["os_records_accessed"] is False
    timing = (response.get("context_used") or {}).get("timing") or {}
    assert timing.get("route") == "/orb/standalone/conversation"
    assert timing.get("elapsed_ms") is not None
    assert timing.get("retrieval_elapsed_ms") is not None
    assert timing.get("prompt_char_estimate", 0) > 0
    assert "stages" in timing


@pytest.mark.asyncio
async def test_agent_run_includes_timing_metadata(monkeypatch):
    from schemas.orb_agents import OrbAgentRunRequest
    from services.orb_agent_orchestrator_service import orb_agent_orchestrator_service

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
            AiProviderResponse(
                text="## Evidence map\n\nTheme detail.",
                provider=AiProviderName.MOCK,
                model="mock-text",
            ),
            decision,
            trace,
        )

    monkeypatch.setattr(
        "services.orb_agent_orchestrator_service.ai_model_router_service.complete_with_routing",
        stub_llm,
    )

    response = await orb_agent_orchestrator_service.run_agent(
        OrbAgentRunRequest(
            agent_type="ofsted_research",
            prompt="Create an Ofsted evidence map for missing-from-care practice.",
            mode="Ofsted Lens",
        )
    )

    timing = (response.context_used or {}).get("timing") or {}
    assert timing.get("route") == "/orb/standalone/agents/run"
    assert timing.get("elapsed_ms") is not None
    assert timing.get("agent_type") == "ofsted_research"
