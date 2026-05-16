from __future__ import annotations

from schemas.operational_memory import OperationalMemoryReplayEvent
from services.provider_operational_queue_service import provider_operational_queue_service


def _event(**overrides):
    base = {
        "id": 1,
        "replay_key": "operational_lifecycle_history:1",
        "source_table": "operational_lifecycle_history",
        "provider_id": 99,
        "home_id": 10,
        "entity_type": "safeguarding",
        "entity_id": "sg-1",
        "actor_id": 7,
        "correlation_id": "corr-1",
        "created_at": "2026-05-16T10:00:00+00:00",
        "event_type": "lifecycle.transition",
        "transition_type": "review",
        "previous_state": {"status": "open"},
        "next_state": {"status": "in_review"},
        "evidence_references": ["ev-1"],
        "chronology_references": ["chr-1"],
        "governance_references": [],
        "replay_references": {},
        "metadata": {},
    }
    base.update(overrides)
    return OperationalMemoryReplayEvent(**base)


def test_provider_operational_queues_derive_provider_scale_categories():
    items = provider_operational_queue_service.from_events(
        [
            _event(
                entity_type="safeguarding",
                entity_id="sg-1",
                next_state={"status": "escalated", "severity": "high", "requires_chronology": True},
                chronology_references=[],
            ),
            _event(
                id=2,
                replay_key="operational_lifecycle_history:2",
                entity_type="staff",
                entity_id="staff-1",
                next_state={"status": "overdue", "compliance_gap": True},
            ),
        ]
    )

    categories = {item.category for item in items}

    assert "safeguarding_escalations" in categories
    assert "chronology_gaps" in categories
    assert "workforce_compliance_gaps" in categories
    assert any(item.priority == "high" for item in items)
