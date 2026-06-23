"""Tests for ORB template library convergence foundation pass."""

from __future__ import annotations

import inspect

from schemas.orb_home_documents import HOME_DOCUMENT_TYPE_LABELS, HOME_AWARE_ANSWER_DISCLAIMER
from schemas.orb_records_workspace import OrbRecordWorkspaceItem
from services.orb_founder_analytics_foundation_service import orb_founder_analytics_foundation_service
from services.orb_regulation_practice_anchor_service import (
    PRACTICE_ANCHOR_DISCLAIMER,
    orb_regulation_practice_anchor_service,
)
from services.orb_template_library_registry import ORB_TEMPLATE_REGISTRY, orb_template_library_registry
from services.orb_template_taxonomy_data import LIFECYCLE_GROUPS, ORB_TEMPLATE_TAXONOMY
from services.orb_template_taxonomy_service import orb_template_taxonomy_service
from services.orb_therapeutic_template_factory_service import (
    orb_therapeutic_template_factory_service,
)


def test_taxonomy_has_ten_lifecycle_groups():
    assert len(LIFECYCLE_GROUPS) == 10
    assert set(LIFECYCLE_GROUPS) == set("ABCDEFGHIJ")


def test_taxonomy_coverage_complete():
    report = orb_template_taxonomy_service.coverage_report()
    assert report["coverage_complete"] is True
    assert report["missing_from_canonical_registry"] == []
    assert report["duplicate_registry_created"] is False


def test_canonical_registry_has_lifecycle_templates():
    assert len(ORB_TEMPLATE_REGISTRY) >= 140


def test_templates_have_adult_guidance_and_child_voice_prompts():
    sample_ids = [
        "daily_record",
        "safeguarding_concern_record",
        "referral_summary",
        "transition_planning_note",
    ]
    for template_id in sample_ids:
        template = orb_therapeutic_template_factory_service.get_template(template_id)
        assert template is not None, template_id
        assert template.get("adult_guidance_before_completing")
        assert template.get("child_voice_prompts")
        assert template.get("therapeutic_wording_examples")
        assert template.get("what_to_avoid")
        assert "guarantee" in (
            template.get("compliance_disclaimer", "") + template.get("review_before_use", "")
        ).lower()


def test_station_availability_works():
    chat_templates = orb_template_taxonomy_service.templates_for_station("chat")
    assert len(chat_templates) >= 40
    assert all("chat" in t["station_availability"] for t in chat_templates)

    write_templates = orb_template_taxonomy_service.templates_for_station("write")
    assert len(write_templates) >= 80


def test_templates_searchable_by_category_title_regulation():
    # By lifecycle group
    group_a = orb_template_taxonomy_service.list_taxonomy(lifecycle_group="A")
    assert any(t["template_id"] == "referral_summary" for t in group_a)

    # By title search
    results = orb_template_taxonomy_service.search("handover")
    assert any(t["template_id"] == "handover_note" for t in results)

    # By regulation anchor
    protection = orb_template_taxonomy_service.list_taxonomy(regulation_anchor="protection_children")
    assert any(t["template_id"] == "safeguarding_concern_record" for t in protection)

    # Registry search still works
    registry_results = orb_template_library_registry.list_templates(search="daily")
    assert any(t["id"] == "daily_record" for t in registry_results)


def test_save_destination_exists_for_all_taxonomy_entries():
    for meta in ORB_TEMPLATE_TAXONOMY.values():
        assert meta.get("save_destination"), meta["template_id"]


def test_no_duplicate_registry_created():
    import services.orb_template_library_registry as registry_module
    import services.orb_therapeutic_template_factory_service as factory_module
    import services.orb_template_taxonomy_service as taxonomy_module

    assert registry_module.ORB_TEMPLATE_REGISTRY is not None
    factory_source = inspect.getsource(factory_module)
    taxonomy_source = inspect.getsource(taxonomy_module)
    assert "ORB_TEMPLATE_REGISTRY:" not in factory_source
    assert "def _build_registry" not in factory_source
    assert "def _build_registry" not in taxonomy_source
    assert "_TEMPLATE_SPECS" not in taxonomy_source


def test_home_document_upload_types_defined():
    required_types = [
        "statement_of_purpose",
        "safeguarding_policy",
        "missing_from_care_policy",
        "physical_intervention_policy",
        "medication_policy",
        "child_specific_plan",
        "local_authority_protocol",
    ]
    for doc_type in required_types:
        assert doc_type in HOME_DOCUMENT_TYPE_LABELS
    assert "never invents" in HOME_AWARE_ANSWER_DISCLAIMER.lower()


def test_founder_analytics_redacts_identifiers_by_default():
    payload = {
        "template_id": "daily_record",
        "child_name": "Should be redacted",
        "staff_id": "staff-123",
        "metadata": {"count": 5},
    }
    redacted = orb_founder_analytics_foundation_service.redact_identifiers_by_default(payload)
    assert redacted["child_name"] == "[REDACTED]"
    assert redacted["staff_id"] == "[REDACTED]"
    assert redacted["template_id"] == "daily_record"
    assert redacted["metadata"]["count"] == 5

    agg = orb_founder_analytics_foundation_service.aggregate_template_usage(
        [{"template_id": "daily_record"}, {"template_id": "daily_record"}]
    )
    assert agg["identifiers_redacted"] is True
    assert agg["most_used_templates"][0]["template_id"] == "daily_record"


def test_regulation_anchors_do_not_claim_guaranteed_compliance():
    assert "guarantee" in PRACTICE_ANCHOR_DISCLAIMER.lower() or "not guarantee" in PRACTICE_ANCHOR_DISCLAIMER.lower()
    anchors = orb_regulation_practice_anchor_service.list_anchors()
    assert len(anchors) >= 20
    map_result = orb_regulation_practice_anchor_service.template_anchor_map(
        "safeguarding_concern_record",
        ["protection_children", "sccif_help_protection"],
    )
    assert map_result["claims_compliance_guaranteed"] is False
    assert map_result["disclaimer"]


def test_records_workspace_schema_has_required_fields():
    item = OrbRecordWorkspaceItem(
        owner_user_id="user-1",
        title="Test draft",
        template_id="daily_record",
        source_station="write",
    )
    assert item.owner_user_id == "user-1"
    assert item.child_id is None
    assert item.status == "draft"
    assert item.audit_trail == []


def test_station_wiring_plan_has_all_stations():
    plan = orb_template_taxonomy_service.station_wiring_plan()
    for station in ("chat", "dictate", "voice", "write", "records", "communicate", "templates"):
        assert station in plan
        assert plan[station]["template_count"] > 0
