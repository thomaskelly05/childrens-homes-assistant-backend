from __future__ import annotations

from assistant.operational_state import (
    build_operational_state_prompt_block,
    build_operational_state_snapshot,
    serialise_operational_state_snapshot,
)


def test_operational_state_snapshot_builds_runtime_state():
    evidence = [
        {
            "citation_ref": "[incident:1]",
            "record_type": "incident",
            "date": "2030-01-03T10:00:00",
            "title": "Missing episode",
            "excerpt": "Police informed after missing episode.",
        }
    ]

    snapshot = build_operational_state_snapshot(
        query="Review safeguarding concern",
        evidence_index=evidence,
        scope_type="home",
        scope_id="home-1",
        role="manager",
    )

    assert snapshot.state_id.startswith("home:home-1")
    assert snapshot.runtime != {}
    assert snapshot.citation_count >= 1


def test_operational_state_prompt_block_contains_state_context():
    snapshot = build_operational_state_snapshot(
        query="Show dashboard",
        evidence_index=[],
        scope_id="home-1",
    )

    prompt_block = build_operational_state_prompt_block(snapshot)

    assert "OPERATIONAL STATE CONTEXT" in prompt_block
    assert "Workflow" in prompt_block


def test_serialised_operational_state_contains_markers():
    snapshot = build_operational_state_snapshot(
        query="Show dashboard",
        evidence_index=[],
        role="RI",
    )

    payload = serialise_operational_state_snapshot(snapshot)

    assert payload["runtime"] != {}
    assert payload["context_markers"] != {}
