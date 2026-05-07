from __future__ import annotations

from assistant.evidence_retrieval_orchestrator import (
    build_evidence_retrieval_prompt_block,
    retrieve_relevant_evidence,
    serialise_evidence_retrieval,
)


def test_retrieval_returns_ranked_cited_evidence():
    evidence = [
        {
            "citation_ref": "[incident:1]",
            "record_type": "incident",
            "date": "2030-01-03T10:00:00",
            "title": "Missing from care episode",
            "excerpt": "Police informed after missing episode and exploitation concerns.",
        },
        {
            "citation_ref": "[daily_note:2]",
            "record_type": "daily_note",
            "date": "2030-01-01T09:00:00",
            "title": "Daily note",
            "excerpt": "Young person engaged positively in education.",
        },
    ]

    result = retrieve_relevant_evidence(
        query="recent safeguarding concerns involving police",
        evidence_index=evidence,
    )

    assert result.retrieved != []
    assert result.retrieved[0].citation_ref == "[incident:1]"


def test_retrieval_warns_when_no_visible_evidence_exists():
    result = retrieve_relevant_evidence(
        query="safeguarding concerns",
        evidence_index=[],
    )

    assert "no_visible_evidence_for_retrieval" in result.warnings


def test_retrieval_prompt_block_contains_retrieved_evidence():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "date": "2030-01-05T11:00:00",
            "title": "Risk assessment review",
            "excerpt": "Escalating self-harm concerns.",
        }
    ]

    result = retrieve_relevant_evidence(
        query="self-harm safeguarding risk",
        evidence_index=evidence,
    )

    prompt_block = build_evidence_retrieval_prompt_block(result)

    assert "EVIDENCE RETRIEVAL CONTEXT" in prompt_block
    assert "Retrieved evidence" in prompt_block


def test_serialised_retrieval_contains_focus_information():
    evidence = [
        {
            "citation_ref": "[task:3]",
            "record_type": "manager_action",
            "date": "2030-01-06T09:00:00",
            "title": "Manager oversight task",
            "excerpt": "Review overdue safeguarding actions.",
        }
    ]

    result = retrieve_relevant_evidence(
        query="management oversight overdue actions",
        evidence_index=evidence,
    )

    payload = serialise_evidence_retrieval(result)

    assert payload["retrieved"] != []
    assert payload["retrieval_focus"] != []
