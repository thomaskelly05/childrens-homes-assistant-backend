from __future__ import annotations

from assistant.multi_agency_chronology import (
    build_multi_agency_chronology,
    build_multi_agency_chronology_prompt_block,
    serialise_multi_agency_chronology,
)


def test_multi_agency_chronology_builds_entries():
    evidence = [
        {
            "citation_ref": "[incident:1]",
            "record_type": "incident",
            "date": "2030-01-03T10:00:00",
            "excerpt": "Police informed and social worker updated after missing episode.",
            "tags": ["missing", "police"],
        },
        {
            "citation_ref": "[meeting:2]",
            "record_type": "meeting_note",
            "date": "2030-01-04T11:00:00",
            "excerpt": "Strategy meeting discussed exploitation concerns.",
        },
    ]

    result = build_multi_agency_chronology(
        evidence_index=evidence,
    )

    assert result.entries != []
    assert result.chronology_status in {"draft_ready", "needs_evidence"}


def test_multi_agency_chronology_warns_when_no_visible_evidence_exists():
    result = build_multi_agency_chronology(
        evidence_index=[],
    )

    assert result.chronology_status == "unavailable"
    assert "no_visible_evidence_for_multi_agency_chronology" in result.warnings


def test_multi_agency_prompt_block_contains_agency_themes():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "date": "2030-01-05T11:00:00",
            "excerpt": "Social worker informed regarding escalating self-harm concerns.",
        }
    ]

    result = build_multi_agency_chronology(
        evidence_index=evidence,
    )

    prompt_block = build_multi_agency_chronology_prompt_block(result)

    assert "MULTI-AGENCY CHRONOLOGY CONTEXT" in prompt_block
    assert "Agency themes visible" in prompt_block


def test_serialised_multi_agency_chronology_contains_source_modules():
    evidence = [
        {
            "citation_ref": "[daily_note:3]",
            "record_type": "daily_note",
            "date": "2030-01-06T09:00:00",
            "excerpt": "Young person engaged positively with education and CAMHS appointment planned.",
        }
    ]

    result = build_multi_agency_chronology(
        evidence_index=evidence,
    )

    payload = serialise_multi_agency_chronology(result)

    assert payload["entries"] != []
    assert payload["source_modules"] != {}
