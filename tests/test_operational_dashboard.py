from __future__ import annotations

from assistant.operational_dashboard import (
    build_operational_dashboard,
    build_operational_dashboard_prompt_block,
    serialise_operational_dashboard,
)


def test_operational_dashboard_builds_consolidated_cards():
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

    dashboard = build_operational_dashboard(
        evidence_index=evidence,
        scope_type="home",
        user_role="manager",
    )

    assert dashboard.cards != []
    assert dashboard.source_modules != {}


def test_operational_dashboard_warns_when_no_visible_evidence_exists():
    dashboard = build_operational_dashboard(
        evidence_index=[],
    )

    assert dashboard.cards != []
    assert "no_visible_evidence_for_operational_dashboard" in dashboard.warnings


def test_operational_dashboard_prompt_block_contains_dashboard_cards():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "excerpt": "Escalating self-harm concerns.",
        }
    ]

    dashboard = build_operational_dashboard(
        evidence_index=evidence,
        user_role="Registered Manager",
    )

    prompt_block = build_operational_dashboard_prompt_block(dashboard)

    assert "OPERATIONAL DASHBOARD CONTEXT" in prompt_block
    assert "Dashboard cards" in prompt_block


def test_serialised_operational_dashboard_contains_cards_and_modules():
    evidence = [
        {
            "citation_ref": "[manager_action:2]",
            "record_type": "manager_action",
            "excerpt": "Manager reviewed safeguarding concern.",
        }
    ]

    dashboard = build_operational_dashboard(
        evidence_index=evidence,
        user_role="RI",
    )

    payload = serialise_operational_dashboard(dashboard)

    assert payload["cards"] != []
    assert payload["source_modules"] != {}
