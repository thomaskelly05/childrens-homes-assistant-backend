from __future__ import annotations

import pytest

from schemas.indicare_ai_governance import AiGovernanceEventCreate, AiGovernanceFilter
from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service


@pytest.fixture(autouse=True)
def reset_memory():
    indicare_ai_governance_event_service.reset_for_tests()
    yield
    indicare_ai_governance_event_service.reset_for_tests()


def test_record_event_stores_metadata():
    record = indicare_ai_governance_event_service.record_event(
        AiGovernanceEventCreate(
            surface="standalone_orb",
            event_type="standalone_conversation",
            message_summary="Explain daily note quality",
            model_provider="mock",
            model_name="mock-fast",
            citation_count=2,
        )
    )
    assert record is not None
    assert record.surface == "standalone_orb"
    assert record.id.startswith("ai-gov-")


def test_strips_raw_sensitive_metadata():
    record = indicare_ai_governance_event_service.record_event(
        AiGovernanceEventCreate(
            surface="standalone_orb",
            event_type="test",
            message_summary="short summary",
            metadata={
                "prompt": "full sensitive prompt text",
                "answer": "full answer body",
                "safe_key": "ok",
            },
        )
    )
    assert record is not None
    assert record.metadata.get("prompt") == "[redacted]"
    assert record.metadata.get("answer") == "[redacted]"
    assert record.metadata.get("safe_key") == "ok"


def test_classify_risk_safeguarding():
    risk = indicare_ai_governance_event_service.classify_risk(
        {
            "message_summary": "safeguarding concern about abuse",
            "safety_flags": ["safeguarding"],
        }
    )
    assert risk in {"high", "critical", "medium"}


def test_normalises_model_routing_from_standalone_response():
    record = indicare_ai_governance_event_service.record_from_standalone_response(
        {
            "answer": "Test answer",
            "sources": [{"source_type": "official"}],
            "citations": [{"label": "SCCIF"}],
            "context_used": {
                "model_routing": {
                    "provider": "openai",
                    "model": "gpt-4o-mini",
                    "task_type": "general_chat",
                    "quality_tier": "balanced",
                    "cost_tier": "standard",
                    "fallback_used": True,
                    "latency_ms": 1200,
                }
            },
        },
        message="hello",
    )
    assert record is not None
    assert record.model_provider == "openai"
    assert record.fallback_used is True
    assert record.latency_ms == 1200


def test_db_unavailable_uses_memory(monkeypatch):
    monkeypatch.setattr(
        indicare_ai_governance_event_service,
        "_try_insert_db",
        lambda record: False,
    )
    record = indicare_ai_governance_event_service.record_event(
        AiGovernanceEventCreate(surface="model_router", event_type="route_test")
    )
    assert record is not None
    events = indicare_ai_governance_event_service.get_recent_events(AiGovernanceFilter(limit=10))
    assert any(e.id == record.id for e in events)


def test_summarise_message_truncates():
    long = "word " * 80
    summary = indicare_ai_governance_event_service.summarise_message(long, max_chars=40)
    assert len(summary) <= 41
    assert summary.endswith("…")
