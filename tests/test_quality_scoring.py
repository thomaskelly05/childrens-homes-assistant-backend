from __future__ import annotations

from assistant.quality_scoring import (
    build_quality_score,
    build_quality_score_prompt_block,
    serialise_quality_score,
)


def test_quality_scoring_builds_domain_scores():
    evidence = [
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "date": "2030-01-03T12:00:00",
            "excerpt": "Police informed after missing episode and exploitation concerns.",
        },
        {
            "citation_ref": "[manager_action:2]",
            "record_type": "manager_action",
            "excerpt": "Manager reviewed safeguarding concern and updated risk controls.",
        },
    ]

    result = build_quality_score(
        evidence_index=evidence,
    )

    assert result.domain_scores != []
    assert result.overall_score >= 0


def test_quality_scoring_warns_when_no_visible_evidence_exists():
    result = build_quality_score(
        evidence_index=[],
    )

    assert result.overall_level == "unknown"
    assert "no_visible_evidence_for_quality_scoring" in result.warnings


def test_quality_scoring_prompt_block_contains_domain_scores():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "excerpt": "Escalating self-harm concerns.",
        }
    ]

    result = build_quality_score(
        evidence_index=evidence,
    )

    prompt_block = build_quality_score_prompt_block(result)

    assert "QUALITY SCORING CONTEXT" in prompt_block
    assert "Domain scores" in prompt_block


def test_serialised_quality_score_contains_source_modules():
    evidence = [
        {
            "citation_ref": "[daily_note:3]",
            "record_type": "daily_note",
            "excerpt": "Young person engaged positively in education.",
        }
    ]

    result = build_quality_score(
        evidence_index=evidence,
    )

    payload = serialise_quality_score(result)

    assert payload["domain_scores"] != []
    assert payload["source_modules"] != {}
