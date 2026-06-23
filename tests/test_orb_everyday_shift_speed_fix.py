"""ORB everyday shift speed fix — routing, scaffold false positives, prompt caps."""

from __future__ import annotations

from routers.orb_standalone_routes import OrbStandaloneConversationRequest, _build_standalone_request_context
from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.orb_brain_convergence_orchestrator_service import orb_brain_convergence_orchestrator_service
from services.orb_expert_answer_engine_service import orb_expert_answer_engine_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.orb_safety_scaffold_service import orb_safety_scaffold_service
from services.orb_universal_answer_contract_map_service import (
    CONTACT_DISTRESS_PROMPT_CHAR_CAP,
    EVERYDAY_SHIFT_PROMPT_CHAR_CAP,
    MEDICATION_REFUSAL_PROMPT_CHAR_CAP,
    build_contract_prompt_block,
    detect_contract_family,
    get_family_prompt_char_cap,
)

REFUSED_SCHOOL_PROMPT = (
    "A young person refused school today. How should staff record this?"
)
UPSET_AFTER_CONTACT_PROMPT = (
    "A young person was upset after contact. How should staff record this?"
)
REFUSED_MEDICATION_PROMPT = (
    "A young person refused medication. What should we consider?"
)
PLACEMENT_DISTRESS_PROMPT = (
    "A young person said they do not want to be here anymore."
)
ALLEGATION_GRABBED_PROMPT = (
    "A young person alleged a member of staff grabbed them."
)
OVERDOSE_PROMPT = "A young person may have taken an overdose of medication"
VEHICLE_PROMPT = "A car pulled up outside with an unknown adult waiting for the young person"
SELF_HARM_PROMPT = "Young person disclosed self-harm and said they want to die"
ALLEGATION_PROMPT = "A child made an allegation against a staff member who hurt them"

SHIFT_BENCHMARK_PROMPTS = (
    ("refused_school", REFUSED_SCHOOL_PROMPT, "school_refusal_recording", EVERYDAY_SHIFT_PROMPT_CHAR_CAP),
    ("upset_after_contact", UPSET_AFTER_CONTACT_PROMPT, "contact_distress_recording", CONTACT_DISTRESS_PROMPT_CHAR_CAP),
    ("refused_medication", REFUSED_MEDICATION_PROMPT, "medication_refusal_guidance", MEDICATION_REFUSAL_PROMPT_CHAR_CAP),
    ("placement_distress", PLACEMENT_DISTRESS_PROMPT, "suicidal_self_harm", None),
    ("allegation_grabbed", ALLEGATION_GRABBED_PROMPT, "allegation_lado", None),
)


def test_refused_school_stays_residential_light():
    bundle = orb_knowledge_retrieval_service.prepare_request_bundle(REFUSED_SCHOOL_PROMPT)
    depth = indicare_intelligence_core_service.estimate_expert_depth(REFUSED_SCHOOL_PROMPT)
    scaffold = orb_safety_scaffold_service.build_from_message(REFUSED_SCHOOL_PROMPT)

    assert bundle["prompt_tier"] == "residential"
    assert bundle["simple_standard_contract"] is True
    assert detect_contract_family(REFUSED_SCHOOL_PROMPT) == "school_refusal_recording"
    assert depth in {"residential_light", "residential_standard"}
    assert depth != "safeguarding_critical"
    assert not scaffold.guardrail_active
    assert not orb_safety_scaffold_service.requires_deep_routing(
        scaffold,
        message=REFUSED_SCHOOL_PROMPT,
        simple_standard_contract=True,
    )


def test_upset_after_contact_routes_contact_distress_recording():
    bundle = orb_knowledge_retrieval_service.prepare_request_bundle(UPSET_AFTER_CONTACT_PROMPT)
    depth = indicare_intelligence_core_service.estimate_expert_depth(UPSET_AFTER_CONTACT_PROMPT)

    assert detect_contract_family(UPSET_AFTER_CONTACT_PROMPT) == "contact_distress_recording"
    assert bundle["simple_standard_contract"] is True
    assert bundle["prompt_tier"] == "residential"
    assert depth in {"residential_light", "residential_standard"}


def test_refused_medication_not_safeguarding_critical():
    bundle = orb_knowledge_retrieval_service.prepare_request_bundle(REFUSED_MEDICATION_PROMPT)
    depth = indicare_intelligence_core_service.estimate_expert_depth(REFUSED_MEDICATION_PROMPT)
    scaffold = orb_safety_scaffold_service.build_from_message(REFUSED_MEDICATION_PROMPT)

    assert detect_contract_family(REFUSED_MEDICATION_PROMPT) == "medication_refusal_guidance"
    assert bundle["simple_standard_contract"] is True
    assert bundle["prompt_tier"] == "residential"
    assert depth in {"residential_light", "residential_standard"}
    assert depth != "safeguarding_critical"
    assert not orb_safety_scaffold_service.requires_deep_routing(
        scaffold,
        message=REFUSED_MEDICATION_PROMPT,
        simple_standard_contract=True,
    )


def test_overdose_remains_safeguarding_critical():
    depth = indicare_intelligence_core_service.estimate_expert_depth(OVERDOSE_PROMPT)
    bundle = orb_knowledge_retrieval_service.prepare_request_bundle(OVERDOSE_PROMPT)

    assert depth == "safeguarding_critical"
    assert bundle["expert_depth"] == "safeguarding_critical"
    assert detect_contract_family(OVERDOSE_PROMPT) == "suicidal_self_harm"


def test_placement_distress_routes_self_harm_safeguarding():
    depth = indicare_intelligence_core_service.estimate_expert_depth(PLACEMENT_DISTRESS_PROMPT)
    bundle = orb_knowledge_retrieval_service.prepare_request_bundle(PLACEMENT_DISTRESS_PROMPT)

    assert detect_contract_family(PLACEMENT_DISTRESS_PROMPT) == "suicidal_self_harm"
    assert depth == "safeguarding_critical"
    assert bundle["prompt_tier"] == "deep"


def test_alleged_staff_grabbed_routes_allegation_lado():
    depth = indicare_intelligence_core_service.estimate_expert_depth(ALLEGATION_GRABBED_PROMPT)
    bundle = orb_knowledge_retrieval_service.prepare_request_bundle(ALLEGATION_GRABBED_PROMPT)

    assert detect_contract_family(ALLEGATION_GRABBED_PROMPT) == "allegation_lado"
    assert depth == "safeguarding_critical"
    assert bundle["prompt_tier"] == "deep"


def test_no_safeguard_critical_false_positive_from_scenario_or_indicare():
    for message in (
        "scenario",
        "IndiCare",
        "This is a training scenario for new staff",
    ):
        scaffold = orb_safety_scaffold_service.build_from_message(message)
        expert = orb_expert_answer_engine_service.classify_scenario(message)
        depth = indicare_intelligence_core_service.estimate_expert_depth(message)

        assert expert.get("primary_family") != "unknown_adult_vehicle", message
        assert expert.get("primary_family") != "ri_governance_drift", message
        assert depth != "safeguarding_critical", message
        assert not orb_safety_scaffold_service.requires_deep_routing(scaffold, message=message)


def test_real_vehicle_concern_triggers_unknown_adult_vehicle():
    expert = orb_expert_answer_engine_service.classify_scenario(VEHICLE_PROMPT)
    scaffold = orb_safety_scaffold_service.build_from_message(VEHICLE_PROMPT)

    assert expert.get("primary_family") == "unknown_adult_vehicle"
    assert expert.get("risk_level") == "critical"
    assert scaffold.guardrail_active
    assert orb_safety_scaffold_service.requires_deep_routing(scaffold, message=VEHICLE_PROMPT)


def test_explicit_self_harm_routes_safeguarding_critical():
    depth = indicare_intelligence_core_service.estimate_expert_depth(SELF_HARM_PROMPT)
    bundle = orb_knowledge_retrieval_service.prepare_request_bundle(SELF_HARM_PROMPT)

    assert depth == "safeguarding_critical"
    assert bundle["expert_depth"] == "safeguarding_critical"
    assert bundle["prompt_tier"] == "deep"


def test_explicit_allegation_routes_safeguarding_critical():
    depth = indicare_intelligence_core_service.estimate_expert_depth(ALLEGATION_PROMPT)
    bundle = orb_knowledge_retrieval_service.prepare_request_bundle(ALLEGATION_PROMPT)

    assert depth == "safeguarding_critical"
    assert bundle["prompt_tier"] == "deep"
    assert detect_contract_family(ALLEGATION_PROMPT) == "allegation_lado"


def test_simple_daily_record_framed_prompt_under_char_cap():
    ctx = _build_standalone_request_context(
        OrbStandaloneConversationRequest(message=REFUSED_SCHOOL_PROMPT)
    )
    framed = ctx["framed_message"]
    telemetry = ctx["routing_telemetry"]

    assert len(framed) <= EVERYDAY_SHIFT_PROMPT_CHAR_CAP
    assert telemetry["simple_standard_contract"] is True
    assert telemetry["final_prompt_tier"] == "residential"
    assert telemetry["expert_depth_after_scaffold"] in {"residential_light", "residential_standard"}
    assert telemetry["per_layer_prompt_chars"]["institutional_cognition"] == 0
    assert telemetry["per_layer_prompt_chars"]["brain_block"] <= 2003


def test_shift_benchmark_prompt_caps():
    for _name, message, family_id, cap in SHIFT_BENCHMARK_PROMPTS:
        if cap is None:
            continue
        ctx = _build_standalone_request_context(OrbStandaloneConversationRequest(message=message))
        assert detect_contract_family(message) == family_id
        assert len(ctx["framed_message"]) <= cap
        assert get_family_prompt_char_cap(family_id) == cap


def test_recording_contracts_put_guidance_before_follow_up_questions():
    for family_id in (
        "school_refusal_recording",
        "contact_distress_recording",
        "medication_refusal_guidance",
    ):
        block = build_contract_prompt_block(family_id).lower()
        assert "direct recording structure" in block or "direct practical steps" in block
        assert "follow-up questions only after" in block
        assert "tell me more" in block


def test_source_chips_still_present_for_refused_school():
    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(
        REFUSED_SCHOOL_PROMPT,
        mode="Ask ORB",
    )
    chips = orb_brain_convergence_orchestrator_service.convergence_source_chips_as_sources(decision)

    assert decision.public_source_chips
    assert chips


def test_source_chips_present_for_safeguarding_benchmarks():
    for message in (PLACEMENT_DISTRESS_PROMPT, ALLEGATION_GRABBED_PROMPT):
        decision = orb_brain_convergence_orchestrator_service.build_brain_decision(
            message,
            mode="Ask ORB",
        )
        chips = orb_brain_convergence_orchestrator_service.convergence_source_chips_as_sources(decision)
        assert decision.public_source_chips
        assert chips


def test_car_word_boundary_does_not_match_indicare():
    expert = orb_expert_answer_engine_service.classify_scenario("IndiCare")
    assert expert.get("primary_family") is None


def test_ri_word_boundary_does_not_match_scenario():
    expert = orb_expert_answer_engine_service.classify_scenario("scenario")
    assert expert.get("primary_family") is None
