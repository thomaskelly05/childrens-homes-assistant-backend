from __future__ import annotations

from services.orb_institutional_depth_frame_service import orb_institutional_depth_frame_service
from services.orb_knowledge_grounding_service import orb_knowledge_grounding_service
from services.orb_residential_cognition_router import orb_residential_cognition_router
from services.shared_institutional_cognition_runtime import shared_institutional_cognition_runtime


def _route(message: str, mode: str = "Ask ORB") -> dict:
    return orb_residential_cognition_router.route(message=message, mode=mode)


def _labels(message: str, mode: str = "Ask ORB") -> list[str]:
    return _route(message, mode).get("cognition_display_labels") or []


def test_missing_from_home_receives_deep_missing_cognition():
    labels = _labels("A young person went missing overnight — what should we record on return?")
    assert "Missing from home" in labels
    assert "Safeguarding" in labels
    frame = orb_institutional_depth_frame_service.build_frame(message="child went missing from the home")
    assert "missing" in frame.get("topic", "").lower()
    assert frame.get("response_structure")


def test_restraint_receives_restrictive_practice_cognition():
    labels = _labels("Help me think through a physical intervention on shift")
    assert "Restrictive practice" in labels
    assert "Recording quality" in labels


def test_medication_error_receives_health_medication_cognition():
    labels = _labels("Medication was missed this morning — what should the manager review?")
    assert "Health / medication" in labels
    assert "Safeguarding" in labels


def test_recording_rewrite_receives_recording_cognition():
    labels = _labels("Please rewrite this poor restraint record wording", mode="Record This Properly")
    assert "Recording quality" in labels
    frame = orb_institutional_depth_frame_service.build_frame(
        message="rewrite this poor daily note", mode="Record This Properly"
    )
    assert frame.get("response_structure")


def test_therapeutic_family_time_cup_scenario():
    labels = _labels("Family time was cancelled and the child smashed a cup — help me think therapeutically")
    assert "Therapeutic reflection" in labels


def test_rm_daily_brief_receives_leadership_cognition():
    labels = _labels("Help me prepare my registered manager daily brief for shift handover")
    assert "Leadership oversight" in labels


def test_ri_prompt_receives_governance_cognition():
    labels = _labels("As the responsible individual, what should I challenge about Reg 44 and Reg 45 evidence?")
    assert "Leadership oversight" in labels or "Ofsted Lens" in labels


def test_staff_supervision_receives_workforce_cognition():
    labels = _labels("A staff member was sharp with a child on shift — supervision prompts?")
    assert "Workforce supervision" in labels


def test_education_refusal_receives_education_cognition():
    labels = _labels("School refusal is increasing — what should we record and review?")
    assert "Education" in labels


def test_complaint_receives_complaints_advocacy_cognition():
    labels = _labels("A parent has made a complaint about staff communication")
    frame = orb_institutional_depth_frame_service.build_frame(message="parent complaint about staff")
    assert "complaint" in frame.get("topic", "").lower()


def test_cumulative_concern_receives_highest_depth():
    prompt = (
        "Three allegations, two missing episodes, four restraints same staff — nothing looks serious alone "
        "but something is not right"
    )
    routing = _route(prompt, mode="Safeguarding Thinking")
    assert routing.get("high_attention") is True
    assert routing.get("depth_level") == "high"
    labels = routing.get("cognition_display_labels") or []
    assert "Safeguarding" in labels
    assert "Professional curiosity" in labels
    context = shared_institutional_cognition_runtime.build_context(
        surface="standalone_orb", message=prompt, mode="Safeguarding Thinking"
    )
    assert context.get("cognition_display_labels")


def test_generic_non_care_question_not_forced_care_framing():
    routing = _route("Explain quantum entanglement in simple terms")
    assert routing.get("topic") is None
    assert routing.get("residential") is False
    assert routing.get("depth_level") == "concise"
    frame = orb_institutional_depth_frame_service.build_frame(message="Explain quantum entanglement")
    assert frame.get("topic") == "general intelligence"


def test_knowledge_grounding_returns_topic_specific_citations_not_generic_spam():
    citations = orb_knowledge_grounding_service.citation_payload(
        message="young person went missing overnight",
        mode="Ask ORB",
    )
    labels = {item["label"] for item in citations}
    assert "[Reg 12]" in labels
    assert len(labels) <= 6
    generic = {"IndiCare product context", "Standalone ORB product boundary"}
    assert generic.isdisjoint(labels)


def test_shared_runtime_includes_auto_routing_metadata():
    context = shared_institutional_cognition_runtime.build_context(
        surface="standalone_orb",
        message="child went missing and returned upset",
        mode="Ask ORB",
    )
    assert context.get("cognition_display_labels")
    assert context.get("routing")
    assert context.get("knowledge_grounding")
