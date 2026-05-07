from __future__ import annotations

from assistant.home_quality_trends import (
    build_home_quality_trend,
    build_home_quality_trend_prompt_block,
    serialise_home_quality_trend,
)


def test_home_quality_trend_builds_integrated_view():
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
            "date": "2030-01-04T09:00:00",
            "excerpt": "Manager reviewed safeguarding incident and updated risk assessment.",
        },
        {
            "citation_ref": "[daily_note:3]",
            "record_type": "daily_note",
            "date": "2030-01-05T09:00:00",
            "excerpt": "Young person settled and engaged positively in education.",
        },
    ]

    result = build_home_quality_trend(
        evidence_index=evidence,
    )

    assert result.trend != ""
    assert result.headlines != []
    assert result.priority_actions != []


def test_home_quality_trend_warns_when_no_visible_evidence_exists():
    result = build_home_quality_trend(
        evidence_index=[],
    )

    assert result.trend == "unknown"
    assert "no_visible_evidence_for_home_quality_trend" in result.warnings


def test_home_quality_prompt_block_contains_strengths_and_vulnerabilities():
    evidence = [
        {
            "citation_ref": "[task:7]",
            "record_type": "task",
            "date": "2030-01-02T11:00:00",
            "excerpt": "Overdue safeguarding review action.",
        }
    ]

    result = build_home_quality_trend(
        evidence_index=evidence,
    )

    prompt_block = build_home_quality_trend_prompt_block(result)

    assert "HOME QUALITY TREND CONTEXT" in prompt_block
    assert "Priority actions" in prompt_block


def test_serialised_home_quality_trend_contains_nested_contexts():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "date": "2030-01-06T08:00:00",
            "excerpt": "Escalating emotional wellbeing concerns.",
        }
    ]

    result = build_home_quality_trend(
        evidence_index=evidence,
    )

    payload = serialise_home_quality_trend(result)

    assert payload["inspection_readiness"] != {}
    assert payload["management_oversight"] != {}
    assert payload["risk_trajectory"] != {}
    assert payload["actions"] != {}
