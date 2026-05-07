from __future__ import annotations

from assistant.regulatory_concern_detection import (
    build_regulatory_concern_detection,
    build_regulatory_concern_prompt_block,
    serialise_regulatory_concern_detection,
)


def test_regulatory_concern_detection_builds_possible_concerns():
    evidence = [
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "excerpt": "Police informed after missing episode and exploitation concerns.",
        },
        {
            "citation_ref": "[manager_action:2]",
            "record_type": "manager_action",
            "excerpt": "Oversight review delayed and actions remain open.",
        },
    ]

    result = build_regulatory_concern_detection(
        evidence_index=evidence,
    )

    assert result.concerns != []
    assert result.overall_level in {
        "urgent_review_required",
        "high_attention",
        "review_required",
        "no_regulatory_concern_detected",
    }


def test_regulatory_concern_detection_warns_when_no_visible_evidence_exists():
    result = build_regulatory_concern_detection(
        evidence_index=[],
    )

    assert result.overall_level == "unknown"
    assert "no_visible_evidence_for_regulatory_concern_detection" in result.warnings


def test_regulatory_concern_prompt_block_contains_review_language():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "excerpt": "Escalating self-harm concerns.",
        }
    ]

    result = build_regulatory_concern_detection(
        evidence_index=evidence,
    )

    prompt_block = build_regulatory_concern_prompt_block(result)

    assert "REGULATORY CONCERN CONTEXT" in prompt_block
    assert "possible concerns" in prompt_block.lower()


def test_serialised_regulatory_concern_detection_contains_context():
    evidence = [
        {
            "citation_ref": "[task:7]",
            "record_type": "task",
            "excerpt": "Open safeguarding review actions remain overdue.",
        }
    ]

    result = build_regulatory_concern_detection(
        evidence_index=evidence,
    )

    payload = serialise_regulatory_concern_detection(result)

    assert payload["concerns"] != [] or payload["regulatory_context"] != {}
