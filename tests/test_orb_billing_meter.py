from __future__ import annotations

from datetime import datetime, timezone

import pytest

from services.orb_billing_meter_service import orb_billing_meter_service
from services.orb_plan_limits_service import orb_plan_limits_service


@pytest.fixture(autouse=True)
def _reset_meter_memory():
    orb_billing_meter_service.reset_memory_events()
    yield
    orb_billing_meter_service.reset_memory_events()


def test_user_meter_returns_current_user_only():
    orb_billing_meter_service.seed_memory_event(
        {
            "user_id": 10,
            "prompt_tier": "fast",
            "estimated_cost": 0.01,
            "tokens_in": 100,
            "tokens_out": 50,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    orb_billing_meter_service.seed_memory_event(
        {
            "user_id": 20,
            "prompt_tier": "deep",
            "estimated_cost": 0.5,
            "tokens_in": 500,
            "tokens_out": 300,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    meter = orb_billing_meter_service.user_meter(user_id=10, user={"id": 10, "role": "staff"})
    assert meter["user_id"] == 10
    assert meter["total_requests"] == 1
    assert meter["fast_requests"] == 1
    assert meter["deep_requests"] == 0
    assert "plan_name" in meter
    assert "soft_limit_reached" in meter
    assert "hard_limit_reached" in meter


def test_plan_limits_soft_and_hard_states():
    limits = orb_plan_limits_service.get_limits("orb_residential_individual")
    state = orb_plan_limits_service.limit_state(
        plan_name="orb_residential_individual",
        user=None,
        daily_requests=limits.daily_soft_limit,
        monthly_requests=limits.monthly_soft_limit,
    )
    assert state["soft_limit_reached"] is True
    assert state["hard_limit_reached"] is False

    hard = orb_plan_limits_service.limit_state(
        plan_name="orb_residential_individual",
        user=None,
        daily_requests=limits.daily_hard_limit + 1,
        monthly_requests=limits.monthly_hard_limit + 1,
    )
    assert hard["hard_limit_reached"] is True


def test_billing_meter_includes_prompt_tier_and_cost_fields():
    orb_billing_meter_service.seed_memory_event(
        {
            "user_id": 5,
            "prompt_tier": "document",
            "provider": "openai",
            "action_id": "analyse_policy",
            "estimated_cost": 0.02,
            "tokens_in": 200,
            "tokens_out": 120,
            "event_type": "document_analysis",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    meter = orb_billing_meter_service.user_meter(user_id=5, user={"id": 5})
    assert meter["document_requests"] == 1
    assert meter["estimated_cost"] >= 0
    assert meter["estimated_tokens_in"] == 200
    assert meter["estimated_tokens_out"] == 120
    assert meter["prompt_tier_split"].get("document") == 1


def test_admin_usage_summary_shape():
    summary = orb_billing_meter_service.admin_usage_summary(days=7)
    assert "total_requests" in summary
    assert "estimated_total_cost" in summary
    assert "daily_usage_trend" in summary
