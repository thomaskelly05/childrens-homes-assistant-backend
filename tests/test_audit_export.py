from __future__ import annotations

from assistant.audit_export import (
    build_audit_export_bundle,
    build_audit_export_prompt_block,
    serialise_audit_export_bundle,
)


def test_audit_export_bundle_builds_sections():
    evidence = [
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "excerpt": "Police informed after missing episode and exploitation concerns.",
        },
        {
            "citation_ref": "[manager_action:2]",
            "record_type": "manager_action",
            "excerpt": "Oversight review delayed and actions remain open.",
        },
    ]

    bundle = build_audit_export_bundle(
        evidence_index=evidence,
        export_type="full_audit_bundle",
        audience="manager",
    )

    assert bundle.sections != []
    assert bundle.citations != []


def test_audit_export_bundle_warns_when_no_visible_evidence_exists():
    bundle = build_audit_export_bundle(
        evidence_index=[],
    )

    assert "no_visible_evidence_for_audit_export" in bundle.warnings


def test_audit_export_prompt_block_contains_export_sections():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "excerpt": "Escalating self-harm concerns.",
        }
    ]

    bundle = build_audit_export_bundle(
        evidence_index=evidence,
        export_type="quality_score",
    )

    prompt_block = build_audit_export_prompt_block(bundle)

    assert "AUDIT EXPORT CONTEXT" in prompt_block
    assert "Export sections" in prompt_block


def test_serialised_audit_export_bundle_contains_governance_statement():
    evidence = [
        {
            "citation_ref": "[daily_note:3]",
            "record_type": "daily_note",
            "excerpt": "Young person engaged positively in education.",
        }
    ]

    bundle = build_audit_export_bundle(
        evidence_index=evidence,
        export_type="management_summary",
    )

    payload = serialise_audit_export_bundle(bundle)

    assert payload["governance_statement"] != ""
    assert payload["sections"] != []
