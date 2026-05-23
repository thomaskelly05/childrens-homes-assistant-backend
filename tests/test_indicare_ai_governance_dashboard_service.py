from __future__ import annotations

import pytest

from schemas.indicare_ai_governance import AiGovernanceEventCreate, AiGovernanceFilter
from services.indicare_ai_governance_dashboard_service import indicare_ai_governance_dashboard_service
from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service


@pytest.fixture(autouse=True)
def seed_events():
    indicare_ai_governance_event_service.reset_for_tests()
    for idx in range(3):
        indicare_ai_governance_event_service.record_event(
            AiGovernanceEventCreate(
                surface="standalone_orb" if idx % 2 == 0 else "operational_orb",
                event_type="standalone_conversation" if idx % 2 == 0 else "operational_conversation",
                model_provider="mock",
                cost_tier="standard",
                citation_count=1 if idx else 0,
                fallback_used=idx == 2,
                evaluation_score=0.8,
            )
        )
    yield
    indicare_ai_governance_event_service.reset_for_tests()


def test_build_dashboard_summary(fake_state):
    dashboard = indicare_ai_governance_dashboard_service.build_dashboard(
        AiGovernanceFilter(period="7d"),
        fake_state["user"],
    )
    assert dashboard.summary.total_ai_requests >= 3
    assert dashboard.usage.standalone_requests >= 1
    assert dashboard.usage.operational_requests >= 1
    assert dashboard.health.privacy_notice


def test_fallback_rate_computed(fake_state):
    usage = indicare_ai_governance_dashboard_service.build_usage_metrics(
        AiGovernanceFilter(period="7d"),
        fake_state["user"],
    )
    assert usage.fallback_rate >= 0


def test_degraded_when_build_raises(fake_state, monkeypatch):
    monkeypatch.setattr(
        indicare_ai_governance_dashboard_service,
        "build_usage_metrics",
        lambda *a, **k: (_ for _ in ()).throw(RuntimeError("boom")),
    )
    dashboard = indicare_ai_governance_dashboard_service.build_dashboard(
        AiGovernanceFilter(),
        fake_state["user"],
    )
    assert dashboard.degraded is True
    assert dashboard.warning
