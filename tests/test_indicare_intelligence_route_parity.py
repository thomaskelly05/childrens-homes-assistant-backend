from __future__ import annotations

import inspect

import pytest

from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.indicare_intelligence_route_finalize_service import (
    finalize_standalone_intelligence,
    intelligence_context_summary,
    is_care_related_action,
)
from services.orb_action_engine_service import orb_action_engine_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service


def test_prepare_request_bundle_always_includes_intelligence_core():
    bundle = orb_knowledge_retrieval_service.prepare_request_bundle(
        "Young person missing overnight — what should I record?",
        mode="Safeguarding Thinking",
    )
    intel = bundle.get("indicare_intelligence") or {}
    assert intel.get("version") == "indicare_intelligence_10"
    assert intel.get("expert_depth")
    summary = intelligence_context_summary(intel)
    assert summary.get("expert_depth") == intel.get("expert_depth")
    legacy = bundle.get("expert_brain_9") or {}
    assert legacy.get("active") or intel.get("orb9_packet")


def test_finalize_standalone_adds_quality_gate_and_learning():
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "Child disclosed self-harm", mode="Safeguarding Thinking"
    )
    answer, meta = finalize_standalone_intelligence(
        indicare_intelligence=packet,
        answer="Focus on immediate safety and inform your manager.",
        prompt_text="Child disclosed self-harm",
        mode="Safeguarding Thinking",
    )
    assert answer
    assert meta.get("answer_quality_gate")
    assert meta.get("indicare_intelligence_core")
    assert meta.get("learning_ledger")


@pytest.mark.asyncio
async def test_action_engine_run_action_includes_intelligence_core(monkeypatch):
    async def fake_complete(*_args, **_kwargs):
        class _Resp:
            text = "Based only on what you provided — review chronology and manager oversight."

        return _Resp(), None, None

    monkeypatch.setattr(
        "services.orb_action_engine_service.ai_model_router_service.complete_with_routing",
        fake_complete,
    )
    result = await orb_action_engine_service.run_action(
        action="what_am_i_missing",
        source_message="Incident last night — child absconded and returned smelling of cannabis.",
        mode="Safeguarding Thinking",
    )
    assert result.get("indicare_intelligence_core")
    assert result.get("context_used", {}).get("answer_quality_gate")
    assert is_care_related_action("what_am_i_missing")


def test_standalone_conversation_route_imports_finalize():
    from routers import orb_standalone_routes

    source = inspect.getsource(orb_standalone_routes.standalone_orb_conversation)
    assert "finalize_standalone_intelligence" in source
    stream_source = inspect.getsource(orb_standalone_routes.standalone_orb_conversation_stream)
    assert "finalize_standalone_intelligence" in stream_source


def test_operational_assistant_uses_intelligence_core():
    from services import orb_operational_assistant_service as mod

    source = inspect.getsource(mod.OrbOperationalAssistantService.answer)
    assert "prepare_request_bundle" in source
    assert "finalize_standalone_intelligence" in source
    prompt_source = inspect.getsource(mod.OrbOperationalAssistantService.build_operational_prompt)
    assert "IndiCare Intelligence Core" in prompt_source
