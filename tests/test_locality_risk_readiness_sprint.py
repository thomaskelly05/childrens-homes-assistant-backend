from __future__ import annotations

from services.dynamic_child_risk_assessment_service import dynamic_child_risk_assessment_service
from services.exploitation_risk_intelligence_service import exploitation_risk_intelligence_service
from services.home_document_catalogue_service import CHILD_DOCUMENTS, HOME_REGULATORY_DOCUMENTS, STAFF_DOCUMENTS
from services.location_context_cache_service import location_context_cache_service
from services.location_lookup_service import location_lookup_service
from services.locality_data_provider_service import locality_data_provider_service
from services.locality_risk_assessment_generator import locality_risk_assessment_generator
from services.missing_pattern_intelligence_service import missing_pattern_intelligence_service
from services.ofsted_document_readiness_service import ofsted_document_readiness_service
from services.orb_risk_intelligence_service import orb_risk_intelligence_service
from services.plan_flow_service import plan_flow_service
from services.risk_intelligence_language import contains_unsafe_language


def _records():
    return [
        {
            "id": "m1",
            "young_person_id": "yp-1",
            "home_id": "home-1",
            "record_type": "missing_episode",
            "started_at": "2026-05-12T21:30:00Z",
            "summary": "Missing episode after family contact. Found at Riverside Park and returned with familiar staff.",
            "location": "Riverside Park",
            "trigger": "family contact",
            "route": "bus route",
            "return_presentation": "anxious but settled after reassurance",
            "debrief_completed": False,
            "return_home_interview_completed": False,
            "risk_review_completed": False,
        },
        {
            "id": "s1",
            "young_person_id": "yp-1",
            "home_id": "home-1",
            "record_type": "safeguarding_concern",
            "date": "2026-05-12",
            "summary": "Records mention unknown adult, new phone and peer group near train station.",
            "location": "North Street Train Station",
            "actionTaken": "Manager review booked and social worker updated.",
        },
        {
            "id": "k1",
            "young_person_id": "yp-1",
            "home_id": "home-1",
            "record_type": "keywork",
            "date": "2026-05-13",
            "summary": "Young person said key worker support and school routine help them feel settled.",
            "youngPersonVoice": "I like football and familiar staff checking in.",
        },
        {
            "id": "other",
            "young_person_id": "yp-2",
            "home_id": "home-1",
            "record_type": "missing_episode",
            "summary": "Other child record should not leak.",
            "location": "Other Park",
        },
    ]


def _assert_safe(payload):
    assert contains_unsafe_language(payload) == []


def test_locality_generation_uses_evidence_and_cache():
    location_context_cache_service.clear()

    first = locality_risk_assessment_generator.child_locality_overlay(
        young_person_id="yp-1",
        home_id="home-1",
        records=_records(),
    )
    second = locality_risk_assessment_generator.child_locality_overlay(
        young_person_id="yp-1",
        home_id="home-1",
        records=_records(),
    )

    assert first["known_child_specific_locations"]
    assert first["cache"]["cache_hit"] is False
    assert second["cache"]["cache_hit"] is True
    assert "Other Park" not in str(first)
    _assert_safe(first)


def test_missing_pattern_detection_flags_gaps_and_orb_prompts():
    result = missing_pattern_intelligence_service.analyse(
        missing_episodes=_records(),
        records=_records(),
        young_person_id="yp-1",
        home_id="home-1",
    )

    assert result["repeated_locations"]
    assert result["return_home_interview_gaps"]
    assert any("records" in prompt or "review recommended" in prompt for prompt in result["orb_prompts"])
    assert "Other Park" not in str(result)
    _assert_safe(result)


def test_exploitation_support_never_concludes_and_includes_protection():
    result = exploitation_risk_intelligence_service.analyse(
        records=_records(),
        young_person_id="yp-1",
        home_id="home-1",
    )

    assert result["concern_summary"]
    assert result["protective_factors"]
    assert "possible indicator" in str(result)
    assert "definitely" not in str(result).lower()
    _assert_safe(result)


def test_dynamic_risk_and_plan_flow_create_draft_suggestions_only():
    dynamic = dynamic_child_risk_assessment_service.suggest_updates(
        records=_records(),
        young_person_id="yp-1",
        home_id="home-1",
    )
    flow = plan_flow_service.after_record_saved(
        record=_records()[0],
        visible_records=_records()[1:3],
        young_person_id="yp-1",
        home_id="home-1",
    )

    assert dynamic["suggested_updates"]
    assert all(item["draft_only"] for item in dynamic["suggested_updates"])
    assert flow["draft_suggestions_only"] is True
    assert flow["auto_finalised"] is False
    _assert_safe(dynamic)
    _assert_safe(flow)


def test_location_lookup_privacy_and_no_raw_provider_errors():
    location_context_cache_service.clear()
    payload = locality_data_provider_service.build_external_payload(
        provider="openstreetmap_nominatim",
        query="nearest park",
        postcode="AB12 3CD",
        locality="North locality",
        child_name="Jamie",
        safeguarding_details="sensitive details",
    )
    lookup = location_lookup_service.suggest(
        feature="nearest park",
        postcode="AB12 3CD",
        locality="North locality",
        offline_results=[{"name": "Riverside Park", "category": "park"}],
    )

    assert payload["postcode_area"] == "AB12"
    assert payload["contains_child_name"] is False
    assert payload["contains_safeguarding_details"] is False
    assert lookup["privacy"]["child_names_sent"] is False
    assert lookup["privacy"]["safeguarding_details_sent"] is False
    assert "raw_provider_error" not in str(lookup)
    _assert_safe(lookup)


def test_document_catalogue_and_readiness_cover_required_documents():
    readiness = ofsted_document_readiness_service.readiness(
        home_id="home-1",
        child_ids=["yp-1"],
        staff_ids=["staff-1"],
        existing_documents=[
            {
                "document_type": "Care Plan",
                "reviewDate": "2026-05-13",
                "evidence_sufficiency": "visible",
                "qa_state": "checked",
                "signoff_state": "signed",
            }
        ],
    )

    expected_total = len(CHILD_DOCUMENTS) + len(HOME_REGULATORY_DOCUMENTS) + len(STAFF_DOCUMENTS)
    assert readiness["catalogue_counts"]["total"] == expected_total
    assert readiness["inspection_readiness_intelligence"]
    assert any("overdue" in item["summary"].lower() or "weak" in item["summary"].lower() for item in readiness["inspection_readiness_intelligence"])
    _assert_safe(readiness)


def test_orb_risk_answers_are_active_child_only():
    result = orb_risk_intelligence_service.answer(
        question="Any exploitation indicators?",
        active_young_person_id="yp-1",
        home_id="home-1",
        records=_records(),
    )

    assert result["cross_child_records_excluded"] == 1
    assert "Other Park" not in str(result)
    assert result["answer"]
    _assert_safe(result)
