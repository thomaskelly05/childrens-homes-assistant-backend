from __future__ import annotations

from assistant.pattern_detection import (
    build_pattern_prompt_block,
    detect_patterns,
    serialise_pattern_detection,
)


def test_pattern_detection_identifies_repeated_safeguarding_themes():
    evidence = [
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "date": "2026-01-01",
            "excerpt": "Police informed after missing episode and exploitation concerns.",
        },
        {
            "citation_ref": "[daily_note:2]",
            "record_type": "daily_note",
            "date": "2026-01-02",
            "excerpt": "Young person discussed worries about unsafe adults and going missing.",
        },
    ]

    result = detect_patterns(
        evidence_index=evidence,
    )

    themes = {finding.theme for finding in result.findings}

    assert "safeguarding" in themes
    safeguarding = next(f for f in result.findings if f.theme == "safeguarding")
    assert safeguarding.count >= 2
    assert "[incident:44]" in safeguarding.citation_refs


def test_pattern_detection_identifies_positive_progress():
    evidence = [
        {
            "citation_ref": "[daily_note:5]",
            "record_type": "daily_note",
            "excerpt": "Young person engaged positively in education and appeared settled.",
        },
        {
            "citation_ref": "[keywork:1]",
            "record_type": "keywork",
            "excerpt": "Positive progress discussed during keywork session.",
        },
    ]

    result = detect_patterns(
        evidence_index=evidence,
    )

    assert any(f.theme == "positive_progress" for f in result.findings)


def test_pattern_detection_warns_when_no_visible_evidence_exists():
    result = detect_patterns(
        evidence_index=[],
    )

    assert result.findings == []
    assert "no_visible_evidence_for_pattern_detection" in result.warnings


def test_pattern_prompt_block_contains_citations_and_examples():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "excerpt": "Known self-harm and emotional wellbeing concerns.",
        },
        {
            "citation_ref": "[daily_note:7]",
            "record_type": "daily_note",
            "excerpt": "Young person appeared anxious and distressed after contact.",
        },
    ]

    result = detect_patterns(
        evidence_index=evidence,
    )

    prompt_block = build_pattern_prompt_block(result)

    assert "PATTERN DETECTION CONTEXT" in prompt_block
    assert "[risk:2]" in prompt_block or "[daily_note:7]" in prompt_block
    assert "patterns for professional review" in prompt_block


def test_serialised_pattern_detection_contains_findings_and_record_types():
    evidence = [
        {
            "citation_ref": "[handover:1]",
            "record_type": "handover",
            "excerpt": "Manager follow up required regarding staffing and oversight.",
        },
        {
            "citation_ref": "[manager_action:2]",
            "record_type": "manager_action",
            "excerpt": "Manager review and action plan agreed.",
        },
    ]

    result = detect_patterns(
        evidence_index=evidence,
    )

    payload = serialise_pattern_detection(result)

    assert payload["evidence_count"] == 2
    assert "handover" in payload["top_record_types"]
