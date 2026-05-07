from __future__ import annotations

from assistant.inspection_evidence_pack import (
    build_inspection_evidence_pack,
    build_inspection_evidence_pack_prompt_block,
    serialise_inspection_evidence_pack,
)


def test_inspection_evidence_pack_builds_themes_and_items():
    evidence = [
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "date": "2030-01-03T12:00:00",
            "excerpt": "Police informed after missing episode and exploitation concerns.",
        },
        {
            "citation_ref": "[manager_action:2]",
            "record_type": "manager_action",
            "date": "2030-01-04T09:00:00",
            "excerpt": "Manager reviewed safeguarding concern and updated risk controls.",
        },
        {
            "citation_ref": "[daily_note:9]",
            "record_type": "daily_note",
            "excerpt": "Young person engaged positively in education.",
        },
    ]

    pack = build_inspection_evidence_pack(
        evidence_index=evidence,
    )

    assert pack.themes != []
    assert pack.evidence_count == 3


def test_inspection_evidence_pack_warns_when_no_visible_evidence_exists():
    pack = build_inspection_evidence_pack(
        evidence_index=[],
    )

    assert pack.themes == []
    assert "no_visible_evidence_for_inspection_evidence_pack" in pack.warnings


def test_inspection_evidence_pack_prompt_block_contains_themes():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "excerpt": "Escalating self-harm concerns.",
        }
    ]

    pack = build_inspection_evidence_pack(
        evidence_index=evidence,
    )

    prompt_block = build_inspection_evidence_pack_prompt_block(pack)

    assert "INSPECTION EVIDENCE PACK CONTEXT" in prompt_block
    assert "Evidence themes" in prompt_block


def test_serialised_inspection_evidence_pack_contains_theme_payloads():
    evidence = [
        {
            "citation_ref": "[reg45:1]",
            "record_type": "reg45_review",
            "excerpt": "Quality assurance review completed.",
        }
    ]

    pack = build_inspection_evidence_pack(
        evidence_index=evidence,
    )

    payload = serialise_inspection_evidence_pack(pack)

    assert payload["themes"] != []
    assert payload["reg45"] != {}
