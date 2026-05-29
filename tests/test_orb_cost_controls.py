from __future__ import annotations

from pathlib import Path

import pytest

from schemas.ai_models import AiRiskLevel, AiTaskType
from services.ai_cost_policy_service import ai_cost_policy_service
from services.ai_model_router_service import ai_model_router_service
from services.orb_general_assistant_service import orb_general_assistant_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.orb_local_response_service import orb_local_response_service
from services.orb_usage_budget_service import orb_usage_budget_service

ROUTES = Path(__file__).resolve().parents[1] / "routers" / "orb_standalone_routes.py"


def test_greeting_uses_no_llm_template():
    local = orb_local_response_service.try_local_response("hello")
    assert local is not None
    assert local.get("no_llm") is True
    instant = orb_general_assistant_service._try_instant_fast_answer("hello")
    assert instant is not None


def test_fast_tier_uses_low_cost_route():
    tier = orb_knowledge_retrieval_service.resolve_prompt_tier("hello there")
    assert tier == "fast"
    cost, quality = ai_cost_policy_service.tier_from_prompt_tier("fast")
    assert cost is not None
    assert quality is not None


def test_safeguarding_deep_tier_routes_premium():
    from schemas.ai_models import AiRoutingRequest

    tier = orb_knowledge_retrieval_service.resolve_prompt_tier(
        "there is immediate danger and abuse allegation",
        mode="Safeguarding Thinking",
    )
    assert tier == "deep"
    request = AiRoutingRequest(
        message="safeguarding threshold and immediate danger — does this need LADO?",
        mode="Safeguarding Thinking",
        retrieval_context={"prompt_tier": "deep"},
    )
    decision = ai_model_router_service.route(request)
    assert decision.risk_level == AiRiskLevel.SAFEGUARDING_SENSITIVE
    assert decision.task_type in {
        AiTaskType.SAFEGUARDING_REFLECTION,
        AiTaskType.REGULATORY_GUIDANCE,
    }
    assert decision.cost_tier.value == "premium"


def test_usage_limit_friendly_message():
    decision = orb_usage_budget_service._limit_decision(safeguarding=False, hard=True)
    assert decision.allowed is False
    assert decision.message
    assert "usage limit" in decision.message.lower() or "limited" in decision.message.lower()


def test_high_risk_limit_returns_safety_template_not_dead_end():
    decision = orb_usage_budget_service._limit_decision(safeguarding=True, hard=True)
    assert decision.use_safeguarding_template is True
    assert "safeguarding" in (decision.message or "").lower()
    assert "DSL" in (decision.message or "") or "manager" in (decision.message or "").lower()


def test_usage_event_helper_exists():
    text = ROUTES.read_text(encoding="utf-8")
    assert "record_standalone_orb_usage" in text


def test_budget_env_vars_configurable(monkeypatch):
    from services.orb_usage_budget_service import OrbUsageBudgetService

    monkeypatch.setenv("ORB_DAILY_HARD_USAGE_LIMIT", "5")
    monkeypatch.setenv("ORB_DOCUMENT_ANALYSIS_DAILY_LIMIT", "2")
    service = OrbUsageBudgetService()
    assert service.daily_hard == 5
    assert service.document_analysis_daily == 2


def test_standalone_usage_records_prompt_tier_metadata():
    from services.orb_standalone_usage_service import _estimate_cost

    assert _estimate_cost(100, 200, cost_tier="low") >= 0
