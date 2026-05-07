from __future__ import annotations

from assistant.action_extraction import (
    build_action_extraction_prompt_block,
    extract_actions,
    serialise_action_extraction,
)


def test_action_extraction_detects_open_and_completed_actions():
    evidence = [
        {
            "citation_ref": "[task:1]",
            "record_type": "task",
            "date": "2030-01-01T10:00:00",
            "excerpt": "Manager to review safeguarding concern. Overdue action awaiting completion.",
            "status": "open",
        },
        {
            "citation_ref": "[manager_action:2]",
            "record_type": "manager_action",
            "date": "2030-01-02T10:00:00",
            "excerpt": "Risk assessment updated and action completed.",
            "status": "completed",
        },
    ]

    result = extract_actions(
        evidence_index=evidence,
    )

    assert result.actions != []
    assert result.open_count >= 1
    assert result.completed_count >= 1


def test_action_extraction_identifies_quality_gaps():
    evidence = [
        {
            "citation_ref": "[inspection_action:7]",
            "record_type": "inspection_action",
            "excerpt": "Action to be completed.",
        }
    ]

    result = extract_actions(
        evidence_index=evidence,
    )

    assert result.gap_count >= 1
    assert "action_quality_gaps_present" in result.warnings


def test_action_extraction_warns_when_no_visible_evidence_exists():
    result = extract_actions(
        evidence_index=[],
    )

    assert result.actions == []
    assert "no_visible_evidence_for_action_extraction" in result.warnings


def test_action_extraction_prompt_block_contains_actions_and_gaps():
    evidence = [
        {
            "citation_ref": "[reg45_action:2]",
            "record_type": "reg45_action",
            "excerpt": "Manager to complete review by next month.",
        }
    ]

    result = extract_actions(
        evidence_index=evidence,
    )

    prompt_block = build_action_extraction_prompt_block(result)

    assert "ACTION EXTRACTION CONTEXT" in prompt_block
    assert "Visible actions" in prompt_block
    assert "[reg45_action:2]" in prompt_block


def test_serialised_action_extraction_contains_actions():
    evidence = [
        {
            "citation_ref": "[task:5]",
            "record_type": "task",
            "excerpt": "Senior to update placement plan.",
            "status": "open",
        }
    ]

    result = extract_actions(
        evidence_index=evidence,
    )

    payload = serialise_action_extraction(result)

    assert payload["actions"] != []
    assert payload["open_count"] >= 1
