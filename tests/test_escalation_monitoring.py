from __future__ import annotations

from assistant.escalation_monitoring import (
    build_escalation_monitoring,
    build_escalation_monitoring_prompt_block,
    serialise_escalation_monitoring,
)


def test_escalation_monitoring_detects_high_attention_alerts():
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

    result = build_escalation_monitoring(
        evidence_index=evidence,
    )

    assert result.alerts != []
    assert result.monitoring_level in {
        "urgent_review_required",
        "high_attention",
        "monitoring_required",
    }


def test_escalation_monitoring_warns_when_no_visible_evidence_exists():
    result = build_escalation_monitoring(
        evidence_index=[],
    )

    assert result.monitoring_level == "unknown"
    assert "no_visible_evidence_for_escalation_monitoring" in result.warnings


def test_escalation_monitoring_prompt_block_contains_alerts():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "excerpt": "Escalating self-harm concerns.",
        }
    ]

    result = build_escalation_monitoring(
        evidence_index=evidence,
    )

    prompt_block = build_escalation_monitoring_prompt_block(result)

    assert "ESCALATION MONITORING CONTEXT" in prompt_block
    assert "Alerts" in prompt_block


def test_serialised_escalation_monitoring_contains_alert_payloads():
    evidence = [
        {
            "citation_ref": "[manager_action:2]",
            "record_type": "manager_action",
            "excerpt": "Manager reviewed safeguarding concern.",
        }
    ]

    result = build_escalation_monitoring(
        evidence_index=evidence,
    )

    payload = serialise_escalation_monitoring(result)

    assert payload["alerts"] != []
    assert payload["management_oversight"] != {}
