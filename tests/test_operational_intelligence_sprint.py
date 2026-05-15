from __future__ import annotations

from services.ai_cost_control_service import ai_cost_control_service
from services.annex_a_readiness_service import annex_a_readiness_service
from services.automation_opportunity_service import automation_opportunity_service
from services.document_gap_analysis_service import document_gap_analysis_service
from services.inspection_pack_service import inspection_pack_service
from services.metadata_extraction_service import metadata_extraction_service
from services.narrative_continuity_service import narrative_continuity_service
from services.neurodiversity_support_service import neurodiversity_support_service
from services.operational_state_engine import operational_state_engine
from services.orb_context_retrieval_service import orb_context_retrieval_service
from services.orb_role_definition_service import orb_role_definition_service
from services.regulatory_ontology_service import regulatory_ontology_service
from services.risk_intelligence_language import contains_unsafe_language
from services.trauma_informed_practice_service import trauma_informed_practice_service


def _records():
    return [
        {
            "id": 1,
            "provider_id": 9,
            "home_id": 5,
            "young_person_id": 10,
            "record_type": "missing_episode",
            "summary": "Missing episode after family contact. Police informed. Returned safely and seemed anxious.",
            "actions_required": "Follow up return home interview and missing risk review.",
        },
        {
            "id": 2,
            "provider_id": 9,
            "home_id": 5,
            "young_person_id": 11,
            "record_type": "daily_note",
            "summary": "Other child record should not appear.",
        },
    ]


def test_regulatory_ontology_covers_quality_standards_regulations_and_sccif():
    summary = regulatory_ontology_service.summary()
    node = regulatory_ontology_service.get_node("protection_of_children")

    assert summary.node_count >= 30
    assert "quality_and_purpose_of_care" in summary.quality_standard_ids
    assert "reg_44" in summary.regulation_ids
    assert "reg_45" in summary.regulation_ids
    assert "sccif_help_and_protection" in summary.sccif_area_ids
    assert node is not None
    assert "manager oversight" in " ".join(node.manager_oversight_triggers).lower()
    assert "No safeguarding decision" in " ".join(summary.guardrails)


def test_operational_state_missing_episode_prompts_reviews_without_decisions():
    assessment = operational_state_engine.assess(
        event_type="missing_episode_saved",
        record=_records()[0],
        records=_records(),
    )

    assert assessment.active_state.state_id == "missing_episode"
    assert "Missing From Care Protocol" in assessment.active_state.suggested_documents
    assert any("return home interview" in action for action in assessment.suggested_next_actions)
    assert assessment.manager_review_required is True
    assert assessment.draft_only is True


def test_trauma_and_neurodiversity_services_prompt_without_labels_or_diagnosis():
    trauma = trauma_informed_practice_service.analyse(
        text="Jamie was defiant after an incident. Staff monitored him.",
        record={"record_type": "incident"},
    )
    neuro = neurodiversity_support_service.analyse(
        text="The room was noisy and bright after a routine change.",
    )

    assert any(flag["key"] == "punitive_wording" for flag in trauma["flags"])
    assert any(flag["key"] == "missing_recovery_or_debrief" for flag in trauma["flags"])
    assert trauma["diagnosis_or_decision_made"] is False
    assert any(flag["key"] in {"adjustment_not_visible", "transition_support_not_visible"} for flag in neuro["flags"])
    assert neuro["diagnosis_made"] is False
    assert neuro["labels_applied"] is False


def test_metadata_extraction_adds_trauma_neurodiversity_and_review_markers():
    metadata = metadata_extraction_service.extract_for_daily_note(
        {
            "provider_id": 9,
            "home_id": 5,
            "summary": "Young person said noise was overwhelming after family contact. Staff gave processing time and quiet space.",
            "actions_required": "Risk review and handover for next shift.",
        },
        young_person_id=10,
        home_id=5,
        staff_id=7,
        source_record_id=22,
    )

    assert metadata.care.child_voice_present is True
    assert metadata.care.sensory_factor is True
    assert metadata.care.neurodiversity_adjustment is True
    assert metadata.care.handover_relevance is True
    assert "health_and_wellbeing" in metadata.regulatory.quality_standard_ids


def test_orb_role_enforces_safe_language_and_active_child_retrieval():
    shaped = orb_role_definition_service.enforce(
        "As an AI assistant, the system has determined that this is definitely exploitation and the child is high risk.",
        active_child_id=10,
        cited_child_ids=[10],
    )
    retrieval = orb_context_retrieval_service.retrieve(
        question="Check inspection readiness for this child",
        active_child_id=10,
        home_id=5,
        provider_id=9,
        records=_records(),
        standalone_memory={"unsafe": "must not be used"},
    )

    assert shaped["violations"]
    assert "definitely exploitation" not in shaped["text"].lower()
    assert "high risk" not in shaped["text"].lower()
    assert retrieval["standalone_memory_used"] is False
    assert retrieval["cross_child_records_excluded"] == 1
    assert retrieval["active_child_only"] is True


def test_annex_a_document_gap_and_inspection_pack_are_manager_review_drafts():
    documents = [
        {"id": "doc-1", "document_type": "Care Plan", "status": "present", "last_reviewed": "2026-05-01"},
        {"id": "doc-2", "document_type": "Reg 44 Reports", "status": "overdue", "next_review": "2020-01-01"},
    ]
    annex = annex_a_readiness_service.build(
        home_profile={"id": 5, "registered_manager_name": "Manager", "responsible_individual_name": "RI"},
        staff=[{"id": "staff-1", "training": "safeguarding"}],
        children=[{"id": 10, "name": "Jamie"}],
        records=_records(),
        documents=documents,
    )
    gaps = document_gap_analysis_service.analyse(home_id=5, existing_documents=documents, child_ids=[10], staff_ids=["staff-1"])
    pack = inspection_pack_service.build_pack(
        home_id=5,
        home_profile={"id": 5, "registered_manager_name": "Manager"},
        staff=[{"id": "staff-1"}],
        children=[{"id": 10}],
        records=_records(),
        documents=documents,
    )

    assert annex["never_submit_automatically"] is True
    assert annex["rm_review_required"] is True
    assert gaps["manager_oversight_required"] is True
    assert pack["auto_submit"] is False
    assert pack["signoff_required"] is True
    assert contains_unsafe_language(pack) == []


def test_automation_and_low_cost_retrieval_block_human_decisions():
    opportunities = automation_opportunity_service.opportunities(context={"inspection": True})
    controls = ai_cost_control_service.retrieval_controls()
    plan = ai_cost_control_service.plan_request(feature="annex_a_draft")

    assert any(item["name"] == "safeguarding decisions" for item in opportunities["must_not_automate"])
    assert all(item["requires_review"] for item in opportunities["safe_to_automate"])
    assert "full records to AI" in controls["blocked"]
    assert plan.should_call_external_ai is False


def test_narrative_continuity_includes_trauma_neurodiversity_and_no_cross_child():
    result = narrative_continuity_service.summarise(
        records=[
            {
                "id": 1,
                "home_id": 5,
                "young_person_id": 10,
                "summary": "Jamie said the noisy room made him anxious. Quiet space and trusted staff helped him regulate.",
                "status": "open",
            },
            {"id": 2, "home_id": 5, "young_person_id": 11, "summary": "Other child should not leak."},
        ],
        child={"preferred_name": "Jamie"},
        young_person_id=10,
        home_id=5,
    )

    assert result["record_count"] == 1
    assert result["trauma_informed_continuity"]["prompts"]
    assert result["neurodiversity_aware_continuity"]["prompts"]
    assert "Other child" not in str(result)
