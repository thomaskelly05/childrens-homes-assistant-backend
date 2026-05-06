from __future__ import annotations

from assistant.safeguarding_escalation import (
    build_safeguarding_escalation,
    build_safeguarding_prompt_block,
    serialise_safeguarding_escalation,
)


def test_safeguarding_escalation_detects_urgent_indicators():
    evidence = [
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "date": "2026-01-07T03:00:00",
            "label": "Serious safeguarding incident",
            "excerpt": "Police attended after serious injury and emergency hospital admission.",
        }
    ]

    escalation = build_safeguarding_escalation(
        evidence_index=evidence,
    )

    assert escalation.level == "urgent"
    assert escalation.indicators[0].severity == "urgent"
    assert any("emergency services" in action.lower() for action in escalation.recommended_actions)


def test_safeguarding_escalation_detects_heightened_missing_risk():
    evidence = [
        {
            "citation_ref": "[incident:45]",
            "record_type": "missing_episode",
            "date": "2026-01-05T23:00:00",
            "label": "Missing from home",
            "excerpt": "Young person absconded overnight and police were informed.",
        }
    ]

    escalation = build_safeguarding_escalation(
        evidence_index=evidence,
    )

    assert escalation.level in {"urgent", "heightened"}
    assert any("missing-from-care" in action.lower() for action in escalation.recommended_actions)


def test_safeguarding_escalation_warns_when_no_evidence_visible():
    escalation = build_safeguarding_escalation(
        evidence_index=[],
    )

    assert escalation.level == "unknown"
    assert "no_visible_evidence_for_safeguarding_analysis" in escalation.warnings


def test_safeguarding_prompt_block_contains_citations_and_safe_language():
    evidence = [
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "date": "2026-01-07T03:00:00",
            "label": "Safeguarding concern",
            "excerpt": "Possible exploitation concerns linked to unknown adults.",
        }
    ]

    escalation = build_safeguarding_escalation(
        evidence_index=evidence,
    )

    prompt_block = build_safeguarding_prompt_block(escalation)

    assert "SAFEGUARDING ESCALATION CONTEXT" in prompt_block
    assert "Do not make final threshold decisions" in prompt_block
    assert "[incident:44]" in prompt_block


def test_serialised_safeguarding_escalation_contains_indicators():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "date": "2026-01-02",
            "label": "Risk assessment",
            "excerpt": "Known self-harm concerns and online risk.",
        }
    ]

    escalation = build_safeguarding_escalation(
        evidence_index=evidence,
    )

    payload = serialise_safeguarding_escalation(escalation)

    assert payload["level"] in {"heightened", "urgent", "review"}
    assert payload["indicators"][0]["citation_ref"] == "[risk:2]"
