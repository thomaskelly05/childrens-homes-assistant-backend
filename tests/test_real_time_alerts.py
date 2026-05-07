from __future__ import annotations

from assistant.real_time_alerts import (
    build_real_time_alerts,
    build_real_time_alerts_prompt_block,
    serialise_real_time_alerts,
)


def test_real_time_alerts_builds_alert_payloads():
    evidence = [
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "excerpt": "Police informed after missing episode and exploitation concerns.",
        },
        {
            "citation_ref": "[task:7]",
            "record_type": "task",
            "excerpt": "Multiple safeguarding review actions remain overdue.",
        },
    ]

    result = build_real_time_alerts(
        evidence_index=evidence,
        audience="manager",
    )

    assert result.alerts != []
    assert result.alert_level in {"critical", "high", "medium", "low", "none"}


def test_real_time_alerts_warns_when_no_visible_evidence_exists():
    result = build_real_time_alerts(
        evidence_index=[],
    )

    assert result.alerts != []
    assert "no_visible_evidence_for_real_time_alerts" in result.warnings


def test_real_time_alert_prompt_block_contains_alerts():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "excerpt": "Escalating self-harm concerns.",
        }
    ]

    result = build_real_time_alerts(
        evidence_index=evidence,
    )

    prompt_block = build_real_time_alerts_prompt_block(result)

    assert "REAL-TIME OPERATIONAL ALERT CONTEXT" in prompt_block
    assert "Alerts" in prompt_block


def test_serialised_real_time_alerts_contains_source_modules():
    evidence = [
        {
            "citation_ref": "[manager_action:2]",
            "record_type": "manager_action",
            "excerpt": "Oversight review delayed and actions remain open.",
        }
    ]

    result = build_real_time_alerts(
        evidence_index=evidence,
    )

    payload = serialise_real_time_alerts(result)

    assert payload["alerts"] != []
    assert payload["source_modules"] != {}
