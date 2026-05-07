from __future__ import annotations

from assistant.risk_trajectory import (
    build_risk_trajectory,
    build_risk_trajectory_prompt_block,
    serialise_risk_trajectory,
)


def test_risk_trajectory_detects_escalating_pattern():
    evidence = [
        {
            "citation_ref": "[daily_note:1]",
            "record_type": "daily_note",
            "date": "2030-01-01T10:00:00",
            "excerpt": "Young person appeared settled and engaged positively.",
        },
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "date": "2030-01-03T12:00:00",
            "excerpt": "Police informed after missing episode and exploitation concerns.",
        },
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "date": "2030-01-05T08:00:00",
            "excerpt": "Escalating self-harm concerns and unsafe contact with unknown adults.",
        },
    ]

    result = build_risk_trajectory(
        evidence_index=evidence,
    )

    assert result.trajectory in {"escalating", "broadly_stable_or_mixed"}
    assert result.points != []


def test_risk_trajectory_detects_reduction_or_control():
    evidence = [
        {
            "citation_ref": "[incident:1]",
            "record_type": "incident",
            "date": "2030-01-01T10:00:00",
            "excerpt": "Missing episode and police involvement.",
        },
        {
            "citation_ref": "[manager_action:2]",
            "record_type": "manager_action",
            "date": "2030-01-05T12:00:00",
            "excerpt": "Risk assessment updated and safety plan reviewed.",
        },
        {
            "citation_ref": "[daily_note:3]",
            "record_type": "daily_note",
            "date": "2030-01-07T09:00:00",
            "excerpt": "Young person more settled and engaging positively.",
        },
    ]

    result = build_risk_trajectory(
        evidence_index=evidence,
    )

    assert result.trajectory in {"reducing_or_better_controlled", "broadly_stable_or_mixed"}


def test_risk_trajectory_warns_when_no_visible_evidence_exists():
    result = build_risk_trajectory(
        evidence_index=[],
    )

    assert result.trajectory == "unknown"
    assert "no_visible_evidence_for_risk_trajectory" in result.warnings


def test_risk_trajectory_prompt_block_contains_points_and_actions():
    evidence = [
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "date": "2030-01-03T12:00:00",
            "excerpt": "Police informed after missing episode.",
        }
    ]

    result = build_risk_trajectory(
        evidence_index=evidence,
    )

    prompt_block = build_risk_trajectory_prompt_block(result)

    assert "RISK TRAJECTORY CONTEXT" in prompt_block
    assert "Recommended professional review actions" in prompt_block
    assert "[incident:44]" in prompt_block


def test_serialised_risk_trajectory_contains_points_and_rationale():
    evidence = [
        {
            "citation_ref": "[task:7]",
            "record_type": "task",
            "date": "2030-01-02T11:00:00",
            "excerpt": "Manager review overdue.",
        }
    ]

    result = build_risk_trajectory(
        evidence_index=evidence,
    )

    payload = serialise_risk_trajectory(result)

    assert payload["points"] != []
    assert payload["rationale"] != []
