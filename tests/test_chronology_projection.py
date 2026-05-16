from __future__ import annotations

from schemas.operational_memory import OperationalMemoryReplayEvent
from services.chronology_projection_service import chronology_projection_service


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
        "next_state": {"status": "in_review", "title": "Safeguarding review"},
        "evidence_references": ["ev-1"],
        "chronology_references": ["chr-1"],
        "governance_references": [],
        "replay_references": {},
        "metadata": {"lifecycle": {"inspection_ids": ["insp-1"]}},
    }
    base.update(overrides)
    return OperationalMemoryReplayEvent(**base)


def test_chronology_projection_merges_links_by_canonical_chronology_id():
    projections = chronology_projection_service.from_events(
        [
            _event(),
            _event(
                id=2,
                replay_key="governance_signoff_history:2",
                source_table="governance_signoff_history",
                evidence_references=["ev-2"],
                governance_references=["gov-1"],
                metadata={"signoff_metadata": {"signoff_id": "sig-1"}},
            ),
        ],
        projection_type="safeguarding",
    )

    assert len(projections) == 1
    projection = projections[0]
    assert projection.projection_id == "chronology:chr-1"
    assert projection.linked_evidence == ["ev-1", "ev-2"]
    assert projection.linked_governance_reviews == ["gov-1"]
    assert projection.linked_signoffs == ["sig-1"]
    assert projection.source_event_ids == ["operational_lifecycle_history:1", "governance_signoff_history:2"]
