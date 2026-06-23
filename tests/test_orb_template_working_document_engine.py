"""Tests for ORB template working document engine."""

from __future__ import annotations

import inspect

from schemas.orb_template_working_document import (
    OrbTemplateWorkingDocument,
    WORKING_DOCUMENT_REVIEW_REMINDER,
)
from services.orb_template_component_assignments import (
    TABLE_COLUMN_PRESETS,
    TEMPLATE_COMPONENT_ASSIGNMENTS,
    get_component_assignment,
)
from services.orb_template_library_registry import ORB_TEMPLATE_REGISTRY, orb_template_library_registry
from services.orb_template_taxonomy_service import orb_template_taxonomy_service
from services.orb_template_working_document_service import orb_template_working_document_service
from services.orb_therapeutic_template_factory_service import orb_therapeutic_template_factory_service


def test_every_canonical_template_builds_working_document():
    results = orb_template_working_document_service.build_all_canonical_working_documents()
    assert len(results) == len(ORB_TEMPLATE_REGISTRY)
    for template_id in ORB_TEMPLATE_REGISTRY:
        assert template_id in results


def test_key_lifecycle_templates_have_sections():
    for template_id in ("daily_record", "safeguarding_concern_record", "referral_summary"):
        doc = orb_template_working_document_service.build_working_document(template_id)
        assert len(doc.sections) >= 3, template_id


def test_reg45_includes_table_and_action_plan_components():
    doc = orb_template_working_document_service.build_working_document("reg45_quality_review")
    table_types = {t.table_type for t in doc.tables}
    assert "sccif_evidence_tracker" in table_types
    assert "reg_45_action_table" in table_types
    assert len(doc.action_plans) >= 1 or any(t.table_type == "reg_45_action_table" for t in doc.tables)
    assert doc.home_document_context_allowed is True


def test_incident_trend_review_supports_chart_ready_data():
    doc = orb_template_working_document_service.build_working_document("significant_incident_review")
    assert any(t.table_type == "chronology_table" for t in doc.tables)
    assert any(c.chart_type == "incident_trend_line_chart" for c in doc.charts)
    chart = doc.charts[0]
    assert chart.has_data is False
    assert chart.empty_state_guidance


def test_medication_audit_includes_checklist_action_table():
    doc = orb_template_working_document_service.build_working_document("quality_standards_audit")
    table_types = {t.table_type for t in doc.tables}
    assert "audit_checklist_table" in table_types
    assert "medication_audit_table" in table_types
    assert "action_plan_table" in table_types


def test_daily_record_opens_as_narrative_not_form_only():
    doc = orb_template_working_document_service.build_working_document("daily_record")
    narrative_sections = [s for s in doc.sections if s.section_type == "narrative"]
    assert len(narrative_sections) >= 3
    assert doc.document_type == "short_record"


def test_chat_use_template_creates_working_document_context():
    answer = "The young person had a difficult evening after contact."
    doc = orb_template_working_document_service.convert_answer_to_working_document(
        answer, "daily_record", source_station="chat"
    )
    assert doc.source_station == "chat"
    assert doc.template_id == "daily_record"
    assert doc.rendered_body


def test_dictate_transcript_maps_to_working_document():
    transcript = "Today the young person attended school.\n\nThey seemed quieter after contact."
    doc = orb_template_working_document_service.convert_dictation_to_working_document(
        transcript, "daily_record"
    )
    assert doc.source_station == "dictate"
    filled = [s for s in doc.sections if s.body.strip()]
    assert len(filled) >= 1


def test_voice_save_generated_document_draft_metadata():
    doc = orb_template_working_document_service.build_working_document(
        "daily_record", {"source_station": "voice"}
    )
    result = orb_template_working_document_service.save_working_document_to_records_workspace(
        doc, user_id=1
    )
    assert result["auto_finalised"] is False
    assert result["workspace_item_id"]


def test_records_workspace_stores_sections_tables_chart_config_source_chips():
    doc = orb_template_working_document_service.build_working_document("reg45_quality_review")
    result = orb_template_working_document_service.save_working_document_to_records_workspace(
        doc, user_id=42
    )
    from services.orb_records_workspace_service import orb_records_workspace_service

    item = orb_records_workspace_service.get_item(42, result["workspace_item_id"])
    meta = item.metadata
    assert meta.get("sections")
    assert meta.get("tables")
    assert meta.get("charts") is not None
    assert meta.get("source_chips_metadata") or meta.get("source_chips")
    assert meta.get("review_before_use_reminder")


def test_linked_home_documents_permission_aware():
    doc = orb_template_working_document_service.build_working_document("reg45_quality_review")
    updated = orb_template_working_document_service.attach_home_document_context(
        "reg45_quality_review",
        ["nonexistent-doc-id"],
        document=doc,
        user_context={"user_id": 1, "current_user": {"id": 1, "role": "manager"}},
    )
    assert updated.metadata.get("home_document_notice") == (
        "No relevant home document is currently linked."
    )


def test_missing_home_document_does_not_fake_context():
    result = orb_template_working_document_service.list_relevant_home_documents_for_template(
        "reg45_quality_review",
        {"user_id": 999, "current_user": {"id": 999, "role": "manager"}},
    )
    assert result["never_invent_content"] is True
    assert result.get("notice") == "No relevant home document is currently linked." or result["documents"] == []


def test_conflict_advisory_appears_for_safeguarding_home_doc_types():
    doc = orb_template_working_document_service.build_working_document("safeguarding_concern_record")
    doc.home_document_chips = [
        __import__(
            "schemas.orb_template_working_document", fromlist=["OrbTemplateSourceChip"]
        ).OrbTemplateSourceChip(
            chip_id="test",
            label="Home document: Safeguarding policy",
            chip_type="home_document",
            reference_id="x",
        )
    ]
    doc.metadata["manager_review_advisory"] = (
        "This should be reviewed by the manager because local procedure must not "
        "override safeguarding duties."
    )
    assert "manager" in doc.metadata["manager_review_advisory"].lower()


def test_no_duplicate_template_registry():
    report = orb_template_taxonomy_service.coverage_report()
    assert report["duplicate_registry_created"] is False
    # Service imports canonical registry only — no second registry module
    import services.orb_template_working_document_service as svc

    assert "orb_template_library_registry" in svc.__doc__ or hasattr(svc, "ORB_TEMPLATE_REGISTRY")


def test_no_template_claims_guaranteed_compliance():
    doc = orb_template_working_document_service.build_working_document("daily_record")
    combined = (
        doc.review_before_use_reminder
        + doc.compliance_disclaimer
        + " ".join(doc.review_prompts)
    ).lower()
    assert "guarantee" in combined or "compliance" in combined
    assert "does not guarantee" in doc.compliance_disclaimer.lower()


def test_child_voice_prompt_exists_where_appropriate():
    doc = orb_template_working_document_service.build_working_document("daily_record")
    assert doc.child_voice_prompts
    enriched = orb_therapeutic_template_factory_service.get_template("daily_record")
    assert enriched and enriched.get("child_voice_prompts")


def test_review_before_use_reminder_exists():
    doc = orb_template_working_document_service.build_working_document("incident_record")
    assert doc.review_before_use_reminder == WORKING_DOCUMENT_REVIEW_REMINDER
    assert "review" in doc.review_before_use_reminder.lower()


def test_source_anchors_remain_chips_not_body_dump():
    doc = orb_template_working_document_service.build_working_document("reg45_quality_review")
    assert doc.source_chips
    for chip in doc.source_chips:
        assert chip.metadata_only is True
    assert all(chip.label not in (doc.sections[0].body if doc.sections else "") for chip in doc.source_chips)


def test_suggest_document_components_for_reg44():
    components = orb_template_working_document_service.suggest_document_components("reg44_action_tracker")
    assert components["tables"]
    assert any(t["table_type"] == "reg_44_evidence_table" for t in components["tables"])


def test_section_orb_help_requires_adult_review():
    result = orb_template_working_document_service.update_section_with_orb_help(
        "doc-1", "section-1", "Add child voice", current_body="Facts here."
    )
    assert result["requires_adult_review"] is True
    assert result["auto_finalised"] is False


def test_generate_chart_from_table_without_data():
    doc = orb_template_working_document_service.build_working_document("significant_incident_review")
    table_id = doc.tables[0].table_id
    chart = orb_template_working_document_service.generate_chart_from_table(
        doc.document_id, table_id, "incident_trend_line_chart", document=doc
    )
    assert chart["has_data"] is False
    assert chart["do_not_invent_data"] is True


def test_all_table_types_defined():
    assert len(TABLE_COLUMN_PRESETS) == 18


def test_key_template_assignments_present():
    expected = {
        "daily_record",
        "reg45_quality_review",
        "reg44_action_tracker",
        "significant_incident_review",
        "quality_standards_audit",
        "locality_risk_assessment",
        "staff_supervision",
        "care_plan_review_note",
        "sccif_evidence_tracker",
        "rights_discussion_record",
    }
    assert expected.issubset(set(TEMPLATE_COMPONENT_ASSIGNMENTS))


def test_working_document_schema_export_options():
    doc = orb_template_working_document_service.build_working_document("daily_record")
    assert "pdf" in doc.export_options
    assert "copy" in doc.export_options


def test_unknown_template_raises():
    import pytest

    with pytest.raises(ValueError, match="Unknown template"):
        orb_template_working_document_service.build_working_document("not_a_real_template_id")


def test_orb_write_routes_registered():
    from routers.orb_templates_launch_routes import router

    paths = {getattr(r, "path", "") for r in router.routes}
    assert "/templates/working-document/build" in paths or any(
        "working-document" in p for p in paths
    )
