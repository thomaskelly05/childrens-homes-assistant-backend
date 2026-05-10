from __future__ import annotations

from assistant.inspection_readiness import (
    build_inspection_readiness,
    build_inspection_readiness_prompt_block,
    serialise_inspection_readiness,
)


def test_inspection_readiness_builds_domain_scores_and_actions():
    evidence = [
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "excerpt": "Missing episode with police involvement and safeguarding concerns.",
        },
        {
            "citation_ref": "[manager_action:2]",
            "record_type": "manager_action",
            "excerpt": "Manager oversight and review completed.",
        },
        {
            "citation_ref": "[daily_note:1]",
            "record_type": "daily_note",
            "excerpt": "Young person engaged positively in education.",
        },
    ]

    result = build_inspection_readiness(
        evidence_index=evidence,
    )

    assert result.domain_scores != []
    assert result.immediate_actions != []
    assert result.overall_level in {"strong", "developing", "limited", "weak"}


def test_inspection_readiness_warns_when_no_evidence_exists():
    result = build_inspection_readiness(
        evidence_index=[],
    )

    assert result.overall_level in {"weak", "limited"}
    assert "no_visible_evidence_for_inspection_readiness" in result.warnings


def test_inspection_readiness_prompt_block_contains_actions_and_vulnerabilities():
    evidence = [
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "excerpt": "Repeated exploitation and missing concerns with police involvement.",
        }
    ]

    result = build_inspection_readiness(
        evidence_index=evidence,
    )

    prompt_block = build_inspection_readiness_prompt_block(result)

    assert "INSPECTION READINESS CONTEXT" in prompt_block
    assert "Do not predict or imply an Ofsted grade" in prompt_block
    assert "Immediate actions" in prompt_block


def test_serialised_inspection_readiness_contains_nested_contexts():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "excerpt": "Known self-harm and emotional wellbeing concerns.",
        },
        {
            "citation_ref": "[task:7]",
            "record_type": "task",
            "excerpt": "Quality assurance review required.",
        },
    ]

    result = build_inspection_readiness(
        evidence_index=evidence,
    )

    payload = serialise_inspection_readiness(result)

    assert payload["domain_scores"] != []
    assert payload["safeguarding"] != {}
    assert payload["patterns"] != {}
    assert payload["reg45"] != {}
