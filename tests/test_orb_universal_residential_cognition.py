from __future__ import annotations

from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service
from services.orb_institutional_depth_frame_service import orb_institutional_depth_frame_service
from services.orb_knowledge_grounding_service import orb_knowledge_grounding_service
from services.orb_professional_curiosity_service import orb_professional_curiosity_service
from services.orb_residential_cognition_router import orb_residential_cognition_router
from services.orb_standalone_sources import filter_display_sources
from services.shared_institutional_cognition_runtime import shared_institutional_cognition_runtime


def _route(message: str, mode: str = "Ask ORB") -> dict:
    return orb_residential_cognition_router.route(message=message, mode=mode)


def _labels(message: str, mode: str = "Ask ORB") -> list[str]:
    return _route(message, mode).get("cognition_display_labels") or []


MEDICATION_PROMPT = "Medication was missed this morning — what should the manager review?"
MISSING_PROMPT = "A young person went missing overnight — what should we record on return?"
THERAPEUTIC_PROMPT = "Family time was cancelled and the child smashed a cup — help me think therapeutically"


def test_missing_from_home_receives_deep_missing_cognition():
    labels = _labels(MISSING_PROMPT)
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
    labels = _labels(MEDICATION_PROMPT)
    assert labels == ["Medication / health", "Recording quality", "Leadership oversight"]


def test_ask_orb_medication_does_not_display_ofsted_lens():
    labels = _labels(MEDICATION_PROMPT, mode="Ask ORB")
    assert "Ofsted Lens" not in labels
    assert "Medication / health" in labels
    assert "Safeguarding" not in labels


def test_ask_orb_missing_displays_missing_and_safeguarding():
    labels = _labels(MISSING_PROMPT, mode="Ask ORB")
    assert labels == ["Missing from home", "Safeguarding", "Recording quality", "Ofsted evidence"]


def test_ask_orb_therapeutic_displays_therapeutic_and_recording():
    labels = _labels(THERAPEUTIC_PROMPT, mode="Ask ORB")
    assert labels == ["Therapeutic reflection", "Recording quality", "Child experience"]
    assert "Ofsted Lens" not in labels


def test_manual_ofsted_lens_still_shows_ofsted():
    labels = _labels("What evidence would Ofsted expect for child voice?", mode="Ofsted Lens")
    assert "Ofsted Lens" in labels


def test_recording_rewrite_receives_recording_cognition():
    labels = _labels("Please rewrite this poor restraint record wording", mode="Record This Properly")
    assert "Recording quality" in labels
    frame = orb_institutional_depth_frame_service.build_frame(
        message="rewrite this poor daily note", mode="Record This Properly"
    )
    assert frame.get("response_structure")


def test_therapeutic_family_time_cup_scenario():
    labels = _labels(THERAPEUTIC_PROMPT)
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
    assert labels == [
        "Safeguarding",
        "Professional curiosity",
        "Leadership oversight",
        "Ofsted evidence",
    ]
    context = shared_institutional_cognition_runtime.build_context(
        surface="standalone_orb", message=prompt, mode="Safeguarding Thinking"
    )
    assert context.get("cognition_display_labels")
    assert context.get("routing")
    assert context.get("knowledge_grounding")


def test_ask_orb_cumulative_displays_expected_pill_labels():
    prompt = (
        "Three allegations, two missing episodes, four restraints same staff — nothing looks serious alone "
        "but something is not right"
    )
    labels = _labels(prompt, mode="Ask ORB")
    assert "Safeguarding" in labels
    assert "Professional curiosity" in labels
    assert "Ofsted evidence" in labels


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
    assert "[Working Together]" in labels
    assert len(labels) <= 6
    generic = {"IndiCare product context", "Standalone ORB product boundary"}
    assert generic.isdisjoint(labels)


def test_medication_citations_are_topic_specific():
    citations = orb_knowledge_grounding_service.citation_payload(message=MEDICATION_PROMPT, mode="Ask ORB")
    labels = {item["label"] for item in citations}
    assert "[Medication / health]" in labels
    assert "[Reg 12]" in labels
    assert "[Therapeutic practice]" not in labels
    med = next(c for c in citations if c["label"] == "[Medication / health]")
    assert "pharmacy" in med.get("basis", "").lower() or "medical" in med.get("basis", "").lower()


def test_therapeutic_citations_exclude_reg12_unless_safeguarding():
    citations = orb_knowledge_grounding_service.citation_payload(message=THERAPEUTIC_PROMPT, mode="Ask ORB")
    labels = {item["label"] for item in citations}
    assert "[Therapeutic practice]" in labels
    assert "[Reg 12]" not in labels


def test_standalone_conversation_response_includes_cognition_display_labels(fake_state, monkeypatch):
    import asyncio

    from routers import orb_standalone_routes

    async def stub_answer(*_args, **_kwargs):
        return {
            "answer": "Check MAR and notify the manager.",
            "sources": [],
            "citations": [],
            "context_used": {"surface": "standalone_orb_ai"},
            "tools_used": ["standalone_orb_general_assistant"],
        }

    monkeypatch.setattr(orb_standalone_routes.orb_general_assistant_service, "answer", stub_answer)

    response = asyncio.run(
        orb_standalone_routes.standalone_orb_conversation(
            orb_standalone_routes.OrbStandaloneConversationRequest(message=MEDICATION_PROMPT),
            current_user=fake_state["user"],
        )
    )
    labels = response.get("cognition_display_labels") or []
    ctx = response.get("context_used") or {}
    assert labels == ["Medication / health", "Recording quality", "Leadership oversight"]
    assert ctx.get("cognition_display_labels") == labels
    assert (ctx.get("explainability") or {}).get("cognition_display_labels") == labels


def test_therapeutic_conversation_response_has_no_threshold_closer(fake_state, monkeypatch):
    import asyncio

    from routers import orb_standalone_routes

    async def stub_answer(*_args, **_kwargs):
        answer = (
            "## How to record it\n"
            "Record without blame.\n\n"
            "ORB can support your thinking, but the threshold decision should remain human-led and "
            "local-procedure-led."
        )
        return {
            "answer": answer,
            "sources": [],
            "citations": [],
            "context_used": {"surface": "standalone_orb_ai"},
            "tools_used": ["standalone_orb_general_assistant"],
        }

    monkeypatch.setattr(orb_standalone_routes.orb_general_assistant_service, "answer", stub_answer)

    response = asyncio.run(
        orb_standalone_routes.standalone_orb_conversation(
            orb_standalone_routes.OrbStandaloneConversationRequest(message=THERAPEUTIC_PROMPT),
            current_user=fake_state["user"],
        )
    )
    assert "threshold decision" not in response["answer"].lower()


def test_shared_runtime_includes_auto_routing_metadata():
    context = shared_institutional_cognition_runtime.build_context(
        surface="standalone_orb",
        message="child went missing and returned upset",
        mode="Ask ORB",
    )
    assert context.get("cognition_display_labels")
    assert context.get("routing")
    assert context.get("knowledge_grounding")


def test_medication_depth_prompt_block_covers_rm_incident_layers():
    block = orb_institutional_depth_frame_service.prompt_block(message=MEDICATION_PROMPT)
    lower = block.lower()
    assert "immediate safety" in lower
    assert "mar" in lower
    assert "handover" in lower
    assert "pharmacy" in lower or "111" in lower
    assert "professional boundary" in lower


def test_missing_depth_prompt_block_covers_return_and_patterns():
    block = orb_institutional_depth_frame_service.prompt_block(message=MISSING_PROMPT)
    lower = block.lower()
    assert "return conversation" in lower
    assert "push" in lower and "pull" in lower
    assert "unknown adult" in lower
    assert "ofsted" in lower


def test_therapeutic_depth_prompt_block_covers_repair_and_recording():
    block = orb_institutional_depth_frame_service.prompt_block(message=THERAPEUTIC_PROMPT)
    lower = block.lower()
    assert "co-regulat" in lower
    assert "without blame" in lower
    assert "attachment" in lower or "rejection" in lower


def test_grounded_style_medication_depth_block_present():
    block = orb_grounded_answer_style_service.prompt_block(message=MEDICATION_PROMPT, mode="Ask ORB")
    lower = block.lower()
    assert "registered-manager" in lower or "registered manager" in lower
    assert "nhs 111" in lower or "111" in lower
    assert "backfill" in lower


def test_cumulative_user_prompt_exact_pill_labels():
    prompt = (
        "A young person has made three allegations in two months, two missing episodes, "
        "and there have been four restraints involving the same staff member. "
        "Nothing appears individually serious, but I feel something is not right…"
    )
    labels = _labels(prompt, mode="Ask ORB")
    assert labels == [
        "Safeguarding",
        "Professional curiosity",
        "Leadership oversight",
        "Ofsted evidence",
    ]
    assert "Missing from home" not in labels


def test_topic_openers_vary_by_detected_topic():
    from services.indicare_intelligence_surface_router import topic_practice_opener

    med = (topic_practice_opener(MEDICATION_PROMPT) or "").lower()
    missing = (topic_practice_opener(MISSING_PROMPT) or "").lower()
    therapeutic = (topic_practice_opener(THERAPEUTIC_PROMPT) or "").lower()
    assert "safety-first" in med
    assert "immediate safety picture" in missing
    assert "visible behaviour" in therapeutic
    assert med != missing != therapeutic


def test_medication_depth_frame_has_topic_opener():
    frame = orb_institutional_depth_frame_service.build_frame(message=MEDICATION_PROMPT)
    assert "safety-first" in (frame.get("opening_anchor") or "").lower()


def test_cumulative_depth_frame_has_convergence_opener():
    prompt = (
        "A young person has made three allegations in two months, two missing episodes, "
        "and there have been four restraints involving the same staff member."
    )
    frame = orb_institutional_depth_frame_service.build_frame(message=prompt)
    assert "convergence" in (frame.get("opening_anchor") or "").lower()


def test_exploitation_and_self_harm_frames_available():
    exploit = orb_institutional_depth_frame_service.build_frame(
        message="We are worried about county lines and unknown adults near the home"
    )
    assert "exploitation" in exploit.get("topic", "").lower()
    harm = orb_institutional_depth_frame_service.build_frame(message="The young person self-harmed last night")
    assert "self-harm" in harm.get("topic", "").lower() or "self" in harm.get("topic", "").lower()
