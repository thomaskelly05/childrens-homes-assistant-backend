from __future__ import annotations

import pytest
from pydantic import ValidationError

from schemas.operational_state import (
    OPERATIONAL_STATE_SCHEMA_VERSION,
    AuditTimelineEvent,
    EvidenceEdge,
    OperationalStateLifecycleSnapshot,
    RealtimeAwarenessEvent,
)


def test_operational_state_contracts_include_schema_version():
    snapshot = OperationalStateLifecycleSnapshot(
        entity_type="safeguarding",
        entity_id="sg-1",
        current_state="in_review",
        chronology_ids=["chr-1", "chr-1", ""],
        governance_ids=["gov-1", " gov-1 "],
    )

    payload = snapshot.model_dump(mode="json")

    assert payload["schema_version"] == OPERATIONAL_STATE_SCHEMA_VERSION
    assert payload["history"] == []
    assert payload["resolution"]["schema_version"] == OPERATIONAL_STATE_SCHEMA_VERSION
    assert payload["chronology_ids"] == ["chr-1"]
    assert payload["governance_ids"] == ["gov-1"]


def test_operational_state_contracts_reject_blank_required_identifiers():
    with pytest.raises(ValidationError):
        EvidenceEdge(
            source_type="",
            source_id="record-1",
            target_type="evidence",
            target_id="ev-1",
            relationship="supports_review",
        )

    with pytest.raises(ValidationError):
        AuditTimelineEvent(action="document.review", entity_type="document", entity_id=" ")


def test_realtime_awareness_contract_is_versioned_and_scoped():
    event = RealtimeAwarenessEvent(
        event_type="operational_state.lifecycle",
        home_id="home-1",
        entity_type="document",
        entity_id="doc-1",
        lifecycle_status="resolved",
        dedupe_key="home-1:document:doc-1:resolved",
    )

    assert event.schema_version == OPERATIONAL_STATE_SCHEMA_VERSION
    assert event.home_id == "home-1"
    assert event.lifecycle_status == "resolved"

    with pytest.raises(ValidationError):
        RealtimeAwarenessEvent(event_type="audit.timeline", home_id="", entity_type="audit", entity_id="audit-1")
