from __future__ import annotations

from assistant.what_changed import (
    build_what_changed,
    build_what_changed_prompt_block,
    serialise_what_changed,
)


def test_what_changed_detects_risk_and_progress_signals():
    evidence = [
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "date": "2030-01-05T10:00:00",
            "excerpt": "Police informed after missing episode and safeguarding concerns.",
        },
        {
            "citation_ref": "[daily_note:7]",
            "record_type": "daily_note",
            "date": "2030-01-06T09:00:00",
            "excerpt": "Young person engaged positively in education and appeared settled.",
        },
    ]

    result = build_what_changed(
        evidence_index=evidence,
        period_days=14,
    )

    assert result.signals != []
    assert any(item.direction == "deterioration_or_risk" for item in result.signals)
    assert any(item.direction == "improving_or_strength" for item in result.signals)


def test_what_changed_generates_headlines():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "date": "2030-01-07T12:00:00",
            "excerpt": "Known self-harm concerns and emotional distress.",
        }
    ]

    result = build_what_changed(
        evidence_index=evidence,
    )

    assert result.headlines != []


def test_what_changed_warns_when_no_visible_evidence_exists():
    result = build_what_changed(
        evidence_index=[],
    )

    assert result.signals == []
    assert "no_visible_evidence_for_what_changed" in result.warnings


def test_what_changed_prompt_block_contains_signals_and_citations():
    evidence = [
        {
            "citation_ref": "[daily_note:3]",
            "record_type": "daily_note",
            "date": "2030-01-03T10:00:00",
            "excerpt": "Young person anxious after family contact but later settled.",
        }
    ]

    result = build_what_changed(
        evidence_index=evidence,
        period_days=7,
    )

    prompt_block = build_what_changed_prompt_block(result)

    assert "WHAT CHANGED CONTEXT" in prompt_block
    assert "Change signals" in prompt_block
    assert "[daily_note:3]" in prompt_block


def test_serialised_what_changed_contains_nested_contexts():
    evidence = [
        {
            "citation_ref": "[task:7]",
            "record_type": "task",
            "date": "2030-01-02T11:00:00",
            "excerpt": "Manager follow up overdue.",
        }
    ]

    result = build_what_changed(
        evidence_index=evidence,
    )

    payload = serialise_what_changed(result)

    assert payload["signals"] != []
    assert payload["safeguarding"] != {}
    assert payload["patterns"] != {}
