from __future__ import annotations

from assistant.chronology_drafting import (
    build_chronology_draft,
    build_chronology_draft_prompt_block,
    serialise_chronology_draft,
)


def test_chronology_drafting_builds_entries():
    evidence = [
        {
            "citation_ref": "[incident:1]",
            "record_type": "incident",
            "date": "2030-01-03T10:00:00",
            "excerpt": "Young person missing overnight and police informed.",
            "tags": ["missing", "police"],
        },
        {
            "citation_ref": "[task:2]",
            "record_type": "task",
            "excerpt": "Manager to review safeguarding response.",
            "tags": ["action_relevant"],
        },
    ]

    result = build_chronology_draft(
        evidence_index=evidence,
    )

    assert result.entries != []
    assert result.draft_status in {"draft_ready", "needs_evidence"}


def test_chronology_drafting_warns_when_no_visible_evidence_exists():
    result = build_chronology_draft(
        evidence_index=[],
    )

    assert result.draft_status == "unavailable"
    assert "no_visible_evidence_for_chronology_drafting" in result.warnings


def test_chronology_draft_prompt_block_contains_entries():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "date": "2030-01-05T11:00:00",
            "excerpt": "Escalating self-harm concerns.",
        }
    ]

    result = build_chronology_draft(
        evidence_index=evidence,
    )

    prompt_block = build_chronology_draft_prompt_block(result)

    assert "CHRONOLOGY DRAFTING CONTEXT" in prompt_block
    assert "Draft entries" in prompt_block


def test_serialised_chronology_draft_contains_source_modules():
    evidence = [
        {
            "citation_ref": "[daily_note:3]",
            "record_type": "daily_note",
            "date": "2030-01-06T09:00:00",
            "excerpt": "Young person engaged positively in education.",
        }
    ]

    result = build_chronology_draft(
        evidence_index=evidence,
    )

    payload = serialise_chronology_draft(result)

    assert payload["entries"] != []
    assert payload["source_modules"] != {}
