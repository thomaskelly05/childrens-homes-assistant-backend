from __future__ import annotations

from schemas.operational_memory import OperationalMemoryReplayEvent
from services.evidence_graph_service import evidence_graph_service


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
        "metadata": {"lifecycle": {"inspection_ids": ["insp-1"]}},
    }
    base.update(overrides)
    return OperationalMemoryReplayEvent(**base)


def test_evidence_graph_traversal_explains_lifecycle_and_chronology_links():
    traversal = evidence_graph_service.from_events(
        entity_type="safeguarding",
        entity_id="sg-1",
        events=[_event(evidence_references=["ev-1"], chronology_references=["chr-1"])],
    )

    assert traversal.root_entity_id == "sg-1"
    assert "ev-1" in traversal.lifecycle_linked_evidence
    assert "ev-1" in traversal.chronology_linked_evidence
    assert any(edge.why_linked.startswith("lifecycle supports") for edge in traversal.edges)
