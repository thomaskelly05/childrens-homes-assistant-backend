"""ORB standalone agent full-brain upgrade and boundary tests."""

from __future__ import annotations

import asyncio

import pytest

import routers.orb_agent_routes as agent_routes
from schemas.orb_agents import OrbAgentRunRequest
from services.orb_agent_orchestrator_service import orb_agent_orchestrator_service
from services.orb_brain_metadata_service import normalise_brain_metadata
from services.orb_knowledge_library_service import orb_knowledge_library_service


@pytest.fixture(autouse=True)
def seeded_library(monkeypatch):
    svc = orb_knowledge_library_service
    svc._memory_sources = {}
    svc._memory_chunks = {}
    svc._seeded = False
    monkeypatch.setattr(svc, "_use_db", lambda: False)
    svc.seed_builtin_sources()


FORBIDDEN_ID_FIELDS = (
    "child_id",
    "young_person_id",
    "staff_id",
    "home_id",
    "record_id",
    "chronology_id",
)


@pytest.mark.parametrize("field_name", FORBIDDEN_ID_FIELDS)
def test_run_agent_rejects_os_identifiers(fake_state, field_name):
    from fastapi import HTTPException

    payload = {"prompt": "Research safeguarding themes", field_name: 42}
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            agent_routes.run_agent(
                OrbAgentRunRequest(**payload),
                current_user=fake_state["user"],
            )
        )
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_agent_run_includes_full_brain_metadata(monkeypatch):
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
                text="## Summary\n\nLeadership briefing.\n\n## Key points\n\n- Point one",
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
            prompt="What would Ofsted ask about leadership?",
            mode="Ofsted Lens",
        )
    )

    ctx = response.context_used
    assert response.success is True
    assert ctx.get("standalone_only") is True
    assert ctx.get("os_linked") is False
    assert ctx.get("care_record_access") is False
    assert ctx.get("os_records_accessed") is False
    assert ctx.get("expert_depth")
    assert ctx.get("active_brains") or ctx.get("active_intelligence_layers")
    assert ctx.get("cognition_display_labels") or ctx.get("reasoning_lenses")
    assert ctx.get("evaluation")
    assert ctx.get("shared_cognition", {}).get("operational_context_used") is False

    meta = normalise_brain_metadata(response.context_used)
    assert meta is not None
    assert meta["feature"] == "agent"


@pytest.mark.asyncio
async def test_shared_cognition_called_with_standalone_surface(monkeypatch):
    captured: dict = {}

    def stub_build_context(**kwargs):
        captured.update(kwargs)
        return {
            "surface": "standalone_orb",
            "active_brains": ["test_brain"],
            "cognition_display_labels": ["ORB"],
            "explainability": {},
            "prompt_blocks": [],
            "citations": [],
        }

    def stub_build_packet(message, **kwargs):
        return {
            "version": "indicare_intelligence_10",
            "expert_depth": "residential_standard",
            "active_brains": ["indicare_intelligence_core"],
            "active_intelligence_layers": ["safeguarding_intelligence"],
            "prompt_block": "Intelligence block",
            "quality_gate_preview": {"passed": True},
            "gaps": [],
            "missingness_graph": {"nodes": [], "edges": []},
            "registered_home_domains": [],
            "whole_child_domains": [],
            "source_basis": {},
            "convergence": {"active_engines": []},
        }

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
            task_type=AiTaskType.GENERAL_CHAT,
            risk_level=AiRiskLevel.LOW,
            quality_tier=AiQualityTier.STANDARD,
            cost_tier=AiCostTier.LOW,
            reason="test",
            fallback_provider=None,
            fallback_model=None,
            estimated_cost_tier=AiCostTier.LOW,
            requires_citations=False,
            requires_rag=True,
            requires_vision=False,
            requires_safety_review=False,
            max_output_tokens=400,
            timeout_seconds=30,
        )
        trace = AiModelRouterTrace(
            task_type=AiTaskType.GENERAL_CHAT,
            risk_level=AiRiskLevel.LOW,
            quality_tier=AiQualityTier.STANDARD,
            cost_tier=AiCostTier.LOW,
            provider=AiProviderName.MOCK,
            model="mock-text",
            reason="test",
            fallback_used=False,
        )
        return (
            AiProviderResponse(text="## Summary\n\nAnswer.", provider=AiProviderName.MOCK, model="mock-text"),
            decision,
            trace,
        )

    monkeypatch.setattr(
        "services.orb_agent_orchestrator_service.shared_institutional_cognition_runtime.build_context",
        stub_build_context,
    )
    monkeypatch.setattr(
        "services.orb_agent_orchestrator_service.indicare_intelligence_core_service.build_intelligence_packet",
        stub_build_packet,
    )
    monkeypatch.setattr(
        "services.orb_agent_orchestrator_service.ai_model_router_service.complete_with_routing",
        stub_llm,
    )

    response = await orb_agent_orchestrator_service.run_agent(
        OrbAgentRunRequest(prompt="General practice question about recording", agent_type="general_research")
    )

    assert captured.get("surface") == "standalone_orb"
    assert captured.get("operational_context") is None
    assert response.success is True
    assert response.sources is not None
    assert response.citations is not None


@pytest.mark.asyncio
async def test_agent_preserves_citations_and_evaluation(monkeypatch):
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
            AiProviderResponse(text="## Summary\n\nBriefing with sources.", provider=AiProviderName.MOCK, model="mock-text"),
            decision,
            trace,
        )

    monkeypatch.setattr(
        "services.orb_agent_orchestrator_service.ai_model_router_service.complete_with_routing",
        stub_llm,
    )

    response = await orb_agent_orchestrator_service.run_agent(
        OrbAgentRunRequest(
            agent_type="manager_briefing",
            prompt="Create a manager briefing on staff supervision",
            preferred_output="briefing",
        )
    )

    assert response.success is True
    assert isinstance(response.sources, list)
    assert isinstance(response.citations, list)
    assert response.context_used.get("evaluation")
