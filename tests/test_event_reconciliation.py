from __future__ import annotations

from schemas.operational_memory import OperationalMemoryReplayEvent
from services.event_reconciliation_service import event_reconciliation_service


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


def test_event_reconciliation_detects_missing_replay_and_orphan_chronology():
    findings = event_reconciliation_service.findings_from_events(
        [
            _event(
                source_table="operational_lifecycle_history",
                replay_key="operational_lifecycle_history:1",
                chronology_references=["chr-missing"],
            ),
            _event(
                id=2,
                replay_key="operational_audit_timeline:2",
                source_table="operational_audit_timeline",
                chronology_references=["chr-missing"],
            ),
        ]
    )

    finding_types = {finding.finding_type for finding in findings}

    assert "missing_replay_event" in finding_types
    assert "orphan_chronology_reference" in finding_types
    assert all(finding.repair_hint for finding in findings)
