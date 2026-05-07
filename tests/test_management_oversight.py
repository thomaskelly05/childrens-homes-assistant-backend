from __future__ import annotations

from assistant.management_oversight import (
    build_management_oversight,
    build_management_oversight_prompt_block,
    serialise_management_oversight,
)


def test_management_oversight_detects_strengths_and_gaps():
    evidence = [
        {
            "citation_ref": "[manager_action:1]",
            "record_type": "manager_action",
            "date": "2030-01-01T10:00:00",
            "excerpt": "Manager reviewed safeguarding concern and completed follow up.",
        },
        {
            "citation_ref": "[task:7]",
            "record_type": "task",
            "date": "2030-01-03T10:00:00",
            "excerpt": "Overdue action awaiting review.",
        },
    ]

    result = build_management_oversight(
        evidence_index=evidence,
    )

    assert result.findings != []
    assert result.gaps != []
    assert result.strengths != []


def test_management_oversight_warns_when_no_visible_evidence_exists():
    result = build_management_oversight(
        evidence_index=[],
    )

    assert result.oversight_level == "unknown"
    assert "no_visible_evidence_for_management_oversight" in result.warnings


def test_management_oversight_prompt_block_contains_gaps_and_actions():
    evidence = [
        {
            "citation_ref": "[inspection_action:2]",
            "record_type": "inspection_action",
            "date": "2030-01-05T09:00:00",
            "excerpt": "Action not completed and awaiting manager review.",
        }
    ]

    result = build_management_oversight(
        evidence_index=evidence,
    )

    prompt_block = build_management_oversight_prompt_block(result)

    assert "MANAGEMENT OVERSIGHT CONTEXT" in prompt_block
    assert "Visible oversight gaps" in prompt_block
    assert "Recommended actions" in prompt_block


def test_serialised_management_oversight_contains_findings():
    evidence = [
        {
            "citation_ref": "[quality_audit:1]",
            "record_type": "quality_audit",
            "date": "2030-01-06T09:00:00",
            "excerpt": "Manager signed off completed actions.",
        }
    ]

    result = build_management_oversight(
        evidence_index=evidence,
    )

    payload = serialise_management_oversight(result)

    assert payload["findings"] != []
    assert payload["oversight_level"] != ""
