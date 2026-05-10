from __future__ import annotations

from assistant.structured_safeguarding_review import (
    build_structured_safeguarding_review,
    build_structured_safeguarding_review_prompt_block,
    serialise_structured_safeguarding_review,
)


def test_structured_safeguarding_review_builds_sections():
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

    result = build_structured_safeguarding_review(
        evidence_index=evidence,
    )

    assert result.sections != []
    assert result.review_status in {
        "urgent_review_required",
        "high_attention_review",
        "review_required",
        "routine_review",
    }


def test_structured_safeguarding_review_warns_when_no_visible_evidence_exists():
    result = build_structured_safeguarding_review(
        evidence_index=[],
    )

    assert result.review_status == "unavailable"
    assert "no_visible_evidence_for_structured_safeguarding_review" in result.warnings


def test_structured_safeguarding_review_prompt_block_contains_sections():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "date": "2030-01-05T11:00:00",
            "excerpt": "Escalating self-harm concerns.",
        }
    ]

    result = build_structured_safeguarding_review(
        evidence_index=evidence,
    )

    prompt_block = build_structured_safeguarding_review_prompt_block(result)

    assert "STRUCTURED SAFEGUARDING REVIEW CONTEXT" in prompt_block
    assert "Review sections" in prompt_block


def test_serialised_structured_safeguarding_review_contains_source_modules():
    evidence = [
        {
            "citation_ref": "[daily_note:3]",
            "record_type": "daily_note",
            "date": "2030-01-06T09:00:00",
            "excerpt": "Young person engaged positively in education.",
        }
    ]

    result = build_structured_safeguarding_review(
        evidence_index=evidence,
    )

    payload = serialise_structured_safeguarding_review(result)

    assert payload["sections"] != []
    assert payload["source_modules"] != {}
