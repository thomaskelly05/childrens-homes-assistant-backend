from __future__ import annotations

from assistant.shift_intelligence import (
    build_shift_intelligence,
    build_shift_intelligence_prompt_block,
    serialise_shift_intelligence,
)


def test_shift_intelligence_builds_handover_sections():
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
        {
            "citation_ref": "[daily_note:9]",
            "record_type": "daily_note",
            "excerpt": "Young person settled after returning to the home.",
        },
    ]

    result = build_shift_intelligence(
        evidence_index=evidence,
    )

    assert result.key_updates != []
    assert result.safeguarding_alerts != []


def test_shift_intelligence_warns_when_no_visible_evidence_exists():
    result = build_shift_intelligence(
        evidence_index=[],
    )

    assert result.shift_status == "unknown"
    assert "no_visible_evidence_for_shift_intelligence" in result.warnings


def test_shift_intelligence_prompt_block_contains_sections():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "excerpt": "Escalating self-harm concerns.",
        }
    ]

    result = build_shift_intelligence(
        evidence_index=evidence,
    )

    prompt_block = build_shift_intelligence_prompt_block(result)

    assert "SHIFT INTELLIGENCE CONTEXT" in prompt_block
    assert "Key updates" in prompt_block or "Safeguarding alerts" in prompt_block


def test_serialised_shift_intelligence_contains_source_modules():
    evidence = [
        {
            "citation_ref": "[manager_action:2]",
            "record_type": "manager_action",
            "excerpt": "Manager reviewed safeguarding concern.",
        }
    ]

    result = build_shift_intelligence(
        evidence_index=evidence,
    )

    payload = serialise_shift_intelligence(result)

    assert payload["source_modules"] != {}
    assert payload["key_updates"] != [] or payload["manager_follow_up"] != []
