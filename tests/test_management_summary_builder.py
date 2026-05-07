from __future__ import annotations

from assistant.management_summary_builder import (
    build_management_summary,
    build_management_summary_prompt_block,
    serialise_management_summary,
)


def test_management_summary_builds_sections_and_actions():
    evidence = [
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "date": "2030-01-03T12:00:00",
            "excerpt": "Police informed after missing episode and exploitation concerns.",
        },
        {
            "citation_ref": "[task:7]",
            "record_type": "task",
            "excerpt": "Overdue safeguarding review action awaiting completion.",
        },
    ]

    summary = build_management_summary(
        evidence_index=evidence,
        audience="manager",
    )

    assert summary.sections != []
    assert summary.immediate_actions != []


def test_management_summary_builds_headline_when_no_high_priority_exists():
    evidence = [
        {
            "citation_ref": "[daily_note:3]",
            "record_type": "daily_note",
            "excerpt": "Young person engaged positively in education.",
        }
    ]

    summary = build_management_summary(
        evidence_index=evidence,
        audience="RI",
    )

    assert summary.headline != ""


def test_management_summary_prompt_block_contains_sections_and_actions():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "excerpt": "Escalating self-harm concerns.",
        }
    ]

    summary = build_management_summary(
        evidence_index=evidence,
        audience="Registered Manager",
    )

    prompt_block = build_management_summary_prompt_block(summary)

    assert "MANAGEMENT SUMMARY CONTEXT" in prompt_block
    assert "Sections" in prompt_block


def test_serialised_management_summary_contains_dashboard_payload():
    evidence = [
        {
            "citation_ref": "[manager_action:2]",
            "record_type": "manager_action",
            "excerpt": "Manager reviewed safeguarding concern.",
        }
    ]

    summary = build_management_summary(
        evidence_index=evidence,
        audience="provider",
    )

    payload = serialise_management_summary(summary)

    assert payload["sections"] != []
    assert payload["dashboard"] != {}
