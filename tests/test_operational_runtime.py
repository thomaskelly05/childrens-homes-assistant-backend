from __future__ import annotations

from assistant.operational_runtime import (
    build_operational_runtime_prompt_block,
    build_runtime_plan,
    detect_runtime_intent,
    run_operational_runtime,
    serialise_operational_runtime,
)


def test_runtime_detects_safeguarding_intent():
    intent = detect_runtime_intent(
        "Review safeguarding concerns and missing episodes"
    )

    assert intent == "safeguarding_review"


def test_runtime_builds_inspection_plan():
    plan = build_runtime_plan(
        query="Prepare inspection evidence pack for Reg 45 review",
        role="manager",
    )

    assert "inspection_evidence_pack" in plan.modules
    assert "inspection_pack" in plan.cards


def test_runtime_returns_cards_and_citations():
    evidence = [
        {
            "citation_ref": "[incident:1]",
            "record_type": "incident",
            "date": "2030-01-03T10:00:00",
            "title": "Missing from care episode",
            "excerpt": "Police informed after missing episode.",
        },
        {
            "citation_ref": "[task:2]",
            "record_type": "task",
            "date": "2030-01-04T09:00:00",
            "title": "Manager review",
            "excerpt": "Review safeguarding response and actions.",
        },
    ]

    result = run_operational_runtime(
        query="Review safeguarding concerns",
        evidence_index=evidence,
        role="manager",
    )

    assert result.cards != []
    assert result.citations != []
    assert result.intent == "safeguarding_review"


def test_runtime_prompt_block_contains_runtime_cards():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "date": "2030-01-05T11:00:00",
            "title": "Risk assessment",
            "excerpt": "Escalating self-harm concerns.",
        }
    ]

    result = run_operational_runtime(
        query="Review safeguarding risk",
        evidence_index=evidence,
        role="manager",
    )

    prompt_block = build_operational_runtime_prompt_block(result)

    assert "OPERATIONAL RUNTIME CONTEXT" in prompt_block
    assert "Runtime cards" in prompt_block


def test_serialised_runtime_contains_modules_and_cards():
    evidence = [
        {
            "citation_ref": "[dashboard:3]",
            "record_type": "daily_note",
            "date": "2030-01-06T09:00:00",
            "title": "Daily note",
            "excerpt": "Positive engagement in education.",
        }
    ]

    result = run_operational_runtime(
        query="Show operational dashboard overview",
        evidence_index=evidence,
        role="manager",
    )

    payload = serialise_operational_runtime(result)

    assert payload["modules"] != {}
    assert payload["cards"] != []
