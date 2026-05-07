from __future__ import annotations

from assistant.smart_recommendations import (
    build_smart_recommendations,
    build_smart_recommendations_prompt_block,
    serialise_smart_recommendations,
)


def test_smart_recommendations_generates_operational_guidance():
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
            "excerpt": "Overdue safeguarding review action.",
        },
    ]

    result = build_smart_recommendations(
        evidence_index=evidence,
        user_role="Registered Manager",
    )

    assert result.recommendations != []
    assert result.role_group == "manager"


def test_smart_recommendations_supports_frontline_role_guidance():
    evidence = [
        {
            "citation_ref": "[daily_note:3]",
            "record_type": "daily_note",
            "excerpt": "Young person anxious after family contact.",
        }
    ]

    result = build_smart_recommendations(
        evidence_index=evidence,
        user_role="Residential Support Worker",
    )

    assert any(item.audience == "frontline" for item in result.recommendations)


def test_smart_recommendations_warns_when_no_visible_evidence_exists():
    result = build_smart_recommendations(
        evidence_index=[],
    )

    assert result.recommendations != []
    assert "no_visible_evidence_for_smart_recommendations" in result.warnings


def test_smart_recommendations_prompt_block_contains_recommendations():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "excerpt": "Escalating self-harm concerns.",
        }
    ]

    result = build_smart_recommendations(
        evidence_index=evidence,
        user_role="Manager",
    )

    prompt_block = build_smart_recommendations_prompt_block(result)

    assert "SMART RECOMMENDATIONS CONTEXT" in prompt_block
    assert "Recommendations" in prompt_block


def test_serialised_smart_recommendations_contains_recommendation_payloads():
    evidence = [
        {
            "citation_ref": "[manager_action:2]",
            "record_type": "manager_action",
            "excerpt": "Manager reviewed safeguarding concern.",
        }
    ]

    result = build_smart_recommendations(
        evidence_index=evidence,
        user_role="RI",
    )

    payload = serialise_smart_recommendations(result)

    assert payload["recommendations"] != []
    assert payload["intelligence"] != {}
