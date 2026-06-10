"""Tests for ORB internal-knowledge-first execution policy."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from routers.orb_standalone_routes import (
    OrbStandaloneConversationRequest,
    _build_standalone_request_context,
)
from services.orb_brain_convergence_orchestrator_service import orb_brain_convergence_orchestrator_service
from services.orb_brain_visibility_service import sanitize_orb_brain_metadata_for_user
from services.orb_execution_policy_service import orb_execution_policy_service
from services.orb_general_assistant_service import orb_general_assistant_service


def _stub_retrieval_bundle():
    return {
        "prompt_tier": "residential",
        "grounding_context": "Grounding text",
        "source_packs": [{"id": "pack1", "title": "Test pack"}],
        "indicare_intelligence": {"expert_depth": "residential_standard"},
        "expert_depth": "residential_standard",
        "selected_contract": "daily_record",
        "embedding_calls": 0,
        "simple_standard_contract": True,
    }


def _patch_context_build(monkeypatch):
    monkeypatch.setattr(
        "routers.orb_standalone_routes.orb_knowledge_retrieval_service.prepare_request_bundle",
        lambda *args, **kwargs: _stub_retrieval_bundle(),
    )
    monkeypatch.setattr(
        "routers.orb_standalone_routes.shared_institutional_cognition_runtime.prompt_addendum",
        lambda **kwargs: "shared-runtime-block",
    )
    monkeypatch.setattr(
        "routers.orb_standalone_routes.run_brain_selection_shadow",
        lambda *args, **kwargs: {},
    )


def test_every_prompt_enters_convergence_orchestrator(monkeypatch):
    _patch_context_build(monkeypatch)
    calls: list[str] = []

    original = orb_brain_convergence_orchestrator_service.build_brain_decision

    def tracking(*args, **kwargs):
        calls.append(kwargs.get("route", ""))
        return original(*args, **kwargs)

    monkeypatch.setattr(
        orb_brain_convergence_orchestrator_service,
        "build_brain_decision",
        tracking,
    )
    payload = OrbStandaloneConversationRequest(message="Help me write a daily note", mode="Ask ORB")
    _build_standalone_request_context(payload)
    assert calls


def test_daily_note_selects_daily_record_contract():
    brain = orb_brain_convergence_orchestrator_service.build_brain_decision(
        "Help me write a daily note",
        mode="Ask ORB",
    )
    policy = orb_execution_policy_service.resolve(
        "Help me write a daily note",
        brain_convergence=brain.to_dict(),
    )
    assert policy.selected_contract == "daily_record"


def test_daily_note_uses_deterministic_execution():
    policy = orb_execution_policy_service.resolve("Help me write a daily note", mode="Ask ORB")
    assert policy.execution_policy in {"deterministic_only", "internal_template_plus_validator"}
    assert policy.openai_allowed is False
    assert policy.embeddings_allowed is False
    assert policy.scenario_bank_allowed is False


def test_high_risk_missing_allows_mandatory_safeguarding():
    prompt = "A young person is missing from the home right now — what do I do?"
    brain = orb_brain_convergence_orchestrator_service.build_brain_decision(prompt, mode="Ask ORB")
    policy = orb_execution_policy_service.resolve(prompt, brain_convergence=brain.to_dict())
    assert policy.execution_policy == "openai_mandatory_safeguarding"
    assert policy.openai_allowed is True


def test_abuse_disclosure_allows_mandatory_safeguarding():
    prompt = "A young person disclosed historic sexual abuse to me tonight. What do I do?"
    brain = orb_brain_convergence_orchestrator_service.build_brain_decision(prompt, mode="Ask ORB")
    policy = orb_execution_policy_service.resolve(prompt, brain_convergence=brain.to_dict())
    assert policy.execution_policy == "openai_mandatory_safeguarding"
    assert policy.openai_allowed is True


def test_execution_policy_attached_to_request_context(monkeypatch):
    _patch_context_build(monkeypatch)
    payload = OrbStandaloneConversationRequest(message="Help me write a daily note", mode="Ask ORB")
    ctx = _build_standalone_request_context(payload)
    assert ctx.get("execution_policy")
    assert ctx["execution_policy"]["selected_contract"] == "daily_record"


@pytest.mark.asyncio
async def test_founder_admin_sees_execution_policy_telemetry():
    policy = orb_execution_policy_service.resolve("Help me write a daily note")
    telemetry = orb_execution_policy_service.build_execution_telemetry(
        policy=policy,
        openai_called=False,
        prompt_chars=400,
        total_ms=12,
    )
    context = {
        "execution_policy": policy.to_dict(),
        "execution_telemetry": telemetry,
        "optimisation_gap": telemetry.get("optimisation_gap"),
    }
    admin_view = sanitize_orb_brain_metadata_for_user(context, {"role": "founder"})
    assert admin_view.get("execution_policy")
    assert admin_view.get("execution_telemetry")


def test_normal_user_cannot_see_execution_telemetry():
    policy = orb_execution_policy_service.resolve("Help me write a daily note")
    telemetry = orb_execution_policy_service.build_execution_telemetry(
        policy=policy,
        openai_called=False,
    )
    context = {
        "execution_policy": policy.to_dict(),
        "execution_telemetry": telemetry,
        "optimisation_gap": "deterministic template available",
        "selected_contract": "daily_record",
    }
    staff_view = sanitize_orb_brain_metadata_for_user(context, {"role": "staff"})
    assert "execution_policy" not in staff_view
    assert "execution_telemetry" not in staff_view
    assert "optimisation_gap" not in staff_view
    assert "selected_contract" not in staff_view


@pytest.mark.asyncio
async def test_openai_not_called_before_internal_classification():
    with patch(
        "services.ai_model_router_service.ai_model_router_service.complete_with_routing"
    ) as mock_llm:
        result = await orb_general_assistant_service.answer(
            "Help me write a daily note",
            mode="Ask ORB",
            raw_user_message="Help me write a daily note",
        )
        mock_llm.assert_not_called()
        assert result.get("no_llm") is True
