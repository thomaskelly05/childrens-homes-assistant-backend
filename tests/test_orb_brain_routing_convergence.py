from __future__ import annotations

import pytest

from routers.orb_standalone_routes import (
    OrbStandaloneActionRunRequest,
    _standalone_conversation_response,
    standalone_orb_action_run,
)
from services.orb_action_engine_service import orb_action_engine_service
from services.orb_agent_orchestrator_service import orb_agent_orchestrator_service
from services.orb_brain_metadata_service import (
    ORB_BRAIN_ID,
    ORB_BRAIN_POWERED_BY,
    ORB_BRAIN_PRODUCT,
    assert_standalone_brain_contract,
    build_brain_metadata,
    merge_context_used,
    normalise_brain_metadata,
)
from services.orb_converged_general_assistant_service import orb_converged_general_assistant_service
from services.orb_dictate_service import generate_dictate_note
from services.orb_document_intelligence_service import orb_document_intelligence_service
from schemas.orb_dictate import OrbDictateGenerateRequest
from schemas.orb_document_intelligence import OrbDocumentIntelligenceRequest
from schemas.orb_agents import OrbAgentRunRequest


def test_build_brain_metadata_contract():
    meta = build_brain_metadata(mode="Ask ORB", feature="conversation")
    assert_standalone_brain_contract(meta)
    assert meta["surface"] == "orb_standalone"
    assert meta["product"] == ORB_BRAIN_PRODUCT
    assert meta["powered_by"] == ORB_BRAIN_POWERED_BY
    assert meta["brain"] == ORB_BRAIN_ID


def test_merge_context_used_preserves_mode():
    ctx = merge_context_used({"mode": "Ofsted Lens"}, feature="conversation")
    assert ctx["brain_metadata"]["brain"] == ORB_BRAIN_ID
    assert ctx["mode"] == "Ofsted Lens"
    assert ctx["os_records_accessed"] is False


def test_standalone_conversation_response_includes_brain_metadata():
    payload = _standalone_conversation_response(
        answer="Test answer",
        mode="Ask ORB",
        conversation_id="c1",
    )
    meta = normalise_brain_metadata(payload)
    assert meta is not None
    assert_standalone_brain_contract(meta)
    assert payload["context_used"]["brain_metadata"]["feature"] == "conversation"


@pytest.mark.asyncio
async def test_action_engine_includes_brain_metadata(monkeypatch):
    async def stub_llm(**_kwargs):
        return "Based only on what you have provided…\n\n## Notes\nDetail."

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    result = await orb_action_engine_service.run_action(
        action="what_am_i_missing",
        source_answer="Staff supported the young person after contact.",
        mode="Ask ORB",
    )
    meta = normalise_brain_metadata(result)
    assert meta is not None
    assert meta["feature"] == "action_engine"
    assert meta["lens"] == "what_am_i_missing"
    assert result["os_records_accessed"] is False


@pytest.mark.asyncio
async def test_document_intelligence_includes_brain_metadata(monkeypatch):
    async def stub_analyse(*_args, **_kwargs):
        from schemas.orb_documents import OrbDocumentUnderstanding

        return OrbDocumentUnderstanding(
            title="T",
            plain_english_summary="Summary",
            sources=[],
            citations=[],
        )

    from services.orb_document_understanding_service import orb_document_understanding_service

    monkeypatch.setattr(orb_document_understanding_service, "analyse_document", stub_analyse)
    response = await orb_document_intelligence_service.run(
        OrbDocumentIntelligenceRequest(
            document_text="Daily note about a calm evening.",
            lens="summary",
            mode="Ask ORB",
        )
    )
    meta = response.data.brain_metadata
    assert meta is not None
    assert_standalone_brain_contract(meta)
    assert meta["lens"] == "summary"
    assert response.data.os_records_accessed is False


def test_dictate_includes_brain_metadata():
    result = generate_dictate_note(
        OrbDictateGenerateRequest(
            input_text="Young person settled after tea.",
            note_type="daily_record",
        )
    )
    assert result.brain_metadata is not None
    assert_standalone_brain_contract(result.brain_metadata)
    assert result.brain_metadata["feature"] == "dictate"


@pytest.mark.asyncio
async def test_agent_run_includes_brain_metadata(monkeypatch):
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
            AiProviderResponse(text="## Summary\n\nLeadership briefing.", provider=AiProviderName.MOCK, model="mock-text"),
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
    meta = normalise_brain_metadata(response.context_used)
    assert meta is not None
    assert meta["feature"] == "agent"
    assert response.context_used.get("os_records_accessed") is False


@pytest.mark.asyncio
async def test_converged_assistant_merges_brain_metadata(monkeypatch):
    async def stub_answer(*_args, **_kwargs):
        return {
            "answer": "Helpful standalone answer.",
            "sources": [],
            "context_used": {"model_routing": {"provider": "mock"}},
        }

    from services.orb_general_assistant_service import orb_general_assistant_service

    monkeypatch.setattr(orb_general_assistant_service, "answer", stub_answer)
    result = await orb_converged_general_assistant_service.answer(
        "How should I record a restraint?",
        mode="Record This Properly",
    )
    meta = normalise_brain_metadata(result)
    assert meta is not None
    assert meta["feature"] == "conversation"
    assert result["os_records_accessed"] is False


@pytest.mark.asyncio
async def test_standalone_action_route_wraps_brain_metadata(monkeypatch):
    async def stub_run_action(**_kwargs):
        return {
            "action": "add_ofsted_lens",
            "answer": "Lens text",
            "sources": [],
            "standalone": True,
            "os_records_accessed": False,
            "action_engine": {},
        }

    monkeypatch.setattr(orb_action_engine_service, "run_action", stub_run_action)
    envelope = await standalone_orb_action_run(
        OrbStandaloneActionRunRequest(
            action="add_ofsted_lens",
            source_answer="Notes here",
            mode="Ofsted Lens",
        ),
        current_user={"id": 1, "user_id": 1, "role": "orb_residential"},
    )
    meta = normalise_brain_metadata(envelope["data"])
    assert meta is not None
    assert meta["feature"] == "action_engine"
