from __future__ import annotations

from assistant.chronology_synthesiser import (
    build_chronology_prompt_block,
    build_chronology_synthesis,
    serialise_chronology_synthesis,
)


def test_chronology_synthesis_builds_ordered_events():
    evidence = [
        {
            "citation_ref": "[daily_note:2]",
            "record_type": "daily_note",
            "date": "2026-01-05T10:00:00",
            "label": "Daily note",
            "excerpt": "Young person engaged well in education.",
        },
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "date": "2026-01-06T02:15:00",
            "label": "Missing from home incident",
            "excerpt": "Police informed after missing episode.",
        },
    ]

    synthesis = build_chronology_synthesis(
        evidence_index=evidence,
    )

    assert synthesis.included_count == 2
    assert synthesis.events[0].citation_ref == "[daily_note:2]"
    assert synthesis.events[1].citation_ref == "[incident:44]"
    assert synthesis.events[1].priority > synthesis.events[0].priority


def test_chronology_synthesis_warns_when_no_evidence_visible():
    synthesis = build_chronology_synthesis(
        evidence_index=[],
    )

    assert synthesis.events == []
    assert "no_visible_evidence_for_chronology" in synthesis.warnings


def test_chronology_prompt_block_contains_citations_and_warning_rules():
    evidence = [
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "date": "2026-01-06T02:15:00",
            "label": "Missing from home incident",
            "excerpt": "Police informed after missing episode.",
        }
    ]

    synthesis = build_chronology_synthesis(
        evidence_index=evidence,
    )

    prompt_block = build_chronology_prompt_block(synthesis)

    assert "CHRONOLOGY EVIDENCE" in prompt_block
    assert "Do not add events that are not listed here" in prompt_block
    assert "[incident:44]" in prompt_block


def test_serialised_chronology_contains_event_metadata():
    evidence = [
        {
            "citation_ref": "[task:7]",
            "record_type": "task",
            "date": "2026-01-07",
            "label": "Manager follow-up",
            "excerpt": "Review safeguarding planning.",
        }
    ]

    synthesis = build_chronology_synthesis(
        evidence_index=evidence,
    )

    payload = serialise_chronology_synthesis(synthesis)

    assert payload["included_count"] == 1
    assert payload["events"][0]["citation_ref"] == "[task:7]"
    assert payload["events"][0]["priority"] >= 1
