from __future__ import annotations

from schemas.data_protection import DataClassification
from services.ai_cost_control_service import ai_cost_control_service
from services.ai_privacy_service import AIPrivacyService
from services.ai_provider_policy import AIProviderPolicy
from services.ai_redaction_service import AIRedactionService
from services.chronology_cluster_service import chronology_cluster_service
from services.intelligence_cache_service import intelligence_cache_service
from services.metadata_extraction_service import metadata_extraction_service
from services.orb_cost_optimised_retrieval import orb_cost_optimised_retrieval_service
from services.provider_data_intelligence_settings_service import provider_data_intelligence_settings_service
from services.regulatory_graph_service import regulatory_graph_service


def _record(record_id: int, young_person_id: int, home_id: int, text: str, *, hidden: bool = False) -> dict:
    metadata = metadata_extraction_service.extract_metadata(
        record_type="daily_note",
        record={
            "id": record_id,
            "provider_id": 9,
            "home_id": home_id,
            "young_person_id": young_person_id,
            "summary": text,
            "workflow_status": "submitted",
        },
        source_record_id=record_id,
    )
    return {
        "id": record_id,
        "record_type": "daily_note",
        "title": f"Daily note {record_id}",
        "summary": text,
        "event_date": f"2026-05-{record_id:02d}",
        "metadata": metadata.model_dump(mode="json"),
        "hidden": hidden,
    }


def test_daily_note_metadata_extracts_care_regulatory_and_ai_markers():
    metadata = metadata_extraction_service.extract_for_daily_note(
        {
            "provider_id": 3,
            "home_id": 4,
            "author_id": 8,
            "education_update": "Refused school, teacher called later.",
            "family_update": "Contact with mum went well.",
            "behaviour_update": "Missing episode, police called and returned safely.",
            "actions_required": "Follow up with manager.",
        },
        young_person_id=12,
        home_id=4,
        staff_id=8,
        source_record_id=99,
    )

    assert metadata.care.education_present is True
    assert metadata.care.family_contact_present is True
    assert metadata.care.missing_marker is True
    assert metadata.care.child_voice_missing is True
    assert "education" in metadata.regulatory.quality_standard_ids
    assert "protection_of_children" in metadata.regulatory.quality_standard_ids
    assert "sccif_help_and_protection" in metadata.regulatory.sccif_area_ids
    assert metadata.ai.sensitivity_classification == DataClassification.SAFEGUARDING_SENSITIVE
    assert metadata.ai.retrieval_priority == "high"


def test_regulatory_graph_builds_scoped_report_evidence_pack_without_hidden_or_cross_child_records():
    records = [
        _record(1, 10, 5, "Young person said school was better and teacher praised progress."),
        _record(2, 11, 5, "Missing episode for another child."),
        _record(3, 10, 5, "Hidden safeguarding note", hidden=True),
    ]

    pack = regulatory_graph_service.get_reg45_evidence_pack(records, scope={"home_id": 5, "young_person_id": 10})

    assert [citation.record_id for citation in pack.citations] == [1]
    assert pack.relevant_metadata["selected_record_count"] == 1
    assert all(gap["young_person_id"] == 10 for gap in pack.evidence_gaps)
    assert any(link["type"] == "quality_standard" for link in pack.regulatory_links)


def test_chronology_clustering_uses_metadata_themes_and_cache_keys():
    records = [
        _record(1, 10, 5, "School teacher praised progress."),
        _record(2, 10, 5, "Police returned young person from missing episode."),
    ]

    clusters = chronology_cluster_service.cluster_records(records, scope={"home_id": 5, "young_person_id": 10})
    themes = {cluster.theme for cluster in clusters}

    assert "education" in themes
    assert "missing_episodes" in themes
    assert all(cluster.cache_key.startswith("intel:chronology_cluster_summary:") for cluster in clusters)


def test_intelligence_cache_invalidation_is_scoped_to_event_and_child():
    intelligence_cache_service.clear()
    key = intelligence_cache_service.build_cache_key(
        cache_type="child_daily_summary",
        provider_id=1,
        home_id=2,
        young_person_id=3,
        record_version="v1",
    )
    other_key = intelligence_cache_service.build_cache_key(
        cache_type="child_daily_summary",
        provider_id=1,
        home_id=2,
        young_person_id=4,
        record_version="v1",
    )
    intelligence_cache_service.set(key=key, value={"summary": "x"}, cache_type="child_daily_summary", provider_id=1, home_id=2, young_person_id=3)
    intelligence_cache_service.set(key=other_key, value={"summary": "y"}, cache_type="child_daily_summary", provider_id=1, home_id=2, young_person_id=4)

    result = intelligence_cache_service.invalidate_for_event(
        "daily_note_saved",
        scope={"provider_id": 1, "home_id": 2, "young_person_id": 3},
    )

    assert key in result["invalidated_keys"]
    assert intelligence_cache_service.get(key) is None
    assert intelligence_cache_service.get(other_key) is not None


def test_care_hub_live_cache_invalidates_with_daily_note_saved() -> None:
    intelligence_cache_service.clear()
    key = intelligence_cache_service.build_cache_key(
        cache_type="care_hub_live",
        provider_id=1,
        home_id=2,
        young_person_id=3,
    )
    intelligence_cache_service.set(
        key=key,
        value={"ok": True},
        cache_type="care_hub_live",
        provider_id=1,
        home_id=2,
        young_person_id=3,
    )
    result = intelligence_cache_service.invalidate_for_event(
        "daily_note_saved",
        scope={"provider_id": 1, "home_id": 2, "young_person_id": 3},
    )
    assert "care_hub_live" in result["affected_cache_types"]
    assert key in result["invalidated_keys"]


def test_ai_cost_controls_prefer_cache_rules_and_block_external_ai_by_default():
    assert provider_data_intelligence_settings_service.defaults().external_ai_enabled is False
    cached = ai_cost_control_service.plan_request(feature="reg45_narrative", cache_hit=True)
    disabled = ai_cost_control_service.plan_request(feature="reg45_narrative", settings={"external_ai_enabled": False})
    voice = ai_cost_control_service.plan_request(
        feature="realtime_voice",
        active_voice_session=False,
        settings={"external_ai_enabled": True, "realtime_voice_enabled": True},
    )

    assert cached.should_call_external_ai is False
    assert cached.reason == "cache_hit"
    assert disabled.should_call_external_ai is False
    assert disabled.reason == "external_ai_disabled"
    assert voice.should_call_external_ai is False
    assert voice.reason == "realtime_only_when_user_is_speaking"


def test_privacy_redaction_labels_entities_and_external_ai_disabled_sends_no_records():
    redacted, mapping = AIRedactionService().redact_records(
        [
            {"record_type": "young_person", "young_person_name": "John Smith", "summary": "John Smith spoke to Staff Jones."},
            {"record_type": "staff_adult", "staff_name": "Sarah Jones"},
            {"record_type": "home", "home_name": "River House"},
        ],
        mode="strict",
    )
    policy = AIProviderPolicy(
        external_processing_enabled=False,
        redaction_mode="strict",
        allow_identifiable_data=False,
        no_training_required=True,
        audit_prompts=False,
        store_prompts=False,
        store_transcripts=False,
    )
    payload = AIPrivacyService(policy).prepare_payload(
        prompt="Summarise John Smith",
        records=[{"young_person_name": "John Smith"}],
        current_user={"permissions": ["assistant:access"]},
        classifications=[DataClassification.CONFIDENTIAL_CHILD],
    )

    assert redacted[0]["young_person_name"] == "Young person A"
    assert redacted[1]["staff_name"] == "Staff member B"
    assert redacted[2]["home_name"] == "Home C"
    assert "John Smith" not in str(redacted)
    assert mapping
    assert payload["ok"] is False
    assert payload["records"] == []


def test_orb_retrieval_builds_minimal_pack_and_general_navigation_has_no_care_context():
    records = [
        _record(1, 10, 5, "Young person said school was better and teacher praised progress."),
        _record(2, 11, 5, "Unrelated child safeguarding note."),
    ]

    navigation_pack = orb_cost_optimised_retrieval_service.build_evidence_pack(
        question="Where is the settings page?",
        records=records,
        context={"home_id": 5, "young_person_id": 10},
    )
    care_pack = orb_cost_optimised_retrieval_service.build_evidence_pack(
        question="Build a Reg 45 evidence pack",
        records=records,
        context={"provider_id": 9, "home_id": 5, "young_person_id": 10},
        settings={"external_ai_enabled": False},
    )

    assert navigation_pack.citations == []
    assert navigation_pack.ai_required is False
    assert [citation.record_id for citation in care_pack.citations] == [1]
    assert care_pack.relevant_metadata["retrieval_strategy"][0] == "intent_route"
    assert "full_child_record" in care_pack.relevant_metadata["excluded"]
    assert care_pack.external_ai_allowed is False


def test_report_generation_strategy_is_metadata_graph_first():
    skeleton = regulatory_graph_service.build_report_skeleton("reg45")

    assert skeleton["generation_strategy"] == "metadata_graph_first"
    assert skeleton["ai_role"] == "narrative_polishing_only"
    assert "safeguarding" in skeleton["sections"]
