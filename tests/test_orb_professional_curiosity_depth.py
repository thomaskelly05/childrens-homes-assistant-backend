from __future__ import annotations

from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service
from services.orb_institutional_depth_frame_service import orb_institutional_depth_frame_service
from services.orb_professional_curiosity_service import orb_professional_curiosity_service
from services.orb_standalone_sources import filter_display_sources
from services.shared_institutional_cognition_runtime import shared_institutional_cognition_runtime


CUMULATIVE_PROMPT = (
    "A young person has made three allegations in two months, two missing episodes, "
    "and there have been four restraints involving the same staff member. "
    "Nothing appears individually serious, but I feel something is not right…"
)


def test_professional_curiosity_detects_cumulative_concern():
    topic = orb_professional_curiosity_service.detect_topic(CUMULATIVE_PROMPT)
    assert topic == "cumulative_concern"
    lenses = orb_professional_curiosity_service.lenses_for(CUMULATIVE_PROMPT)
    assert any("same staff" in lens.lower() or "pattern" in lens.lower() for lens in lenses)


def test_cumulative_depth_frame_has_required_structure():
    frame = orb_institutional_depth_frame_service.build_frame(message=CUMULATIVE_PROMPT)
    assert "cumulative" in frame["topic"].lower()
    assert frame.get("response_structure")
    assert len(frame["response_structure"]) >= 9
    assert frame.get("patterns_to_explore")
    assert frame.get("rm_questions")
    assert frame.get("ri_questions")
    assert frame.get("immediate_safe_next_steps")


def test_shared_runtime_includes_curiosity_for_high_attention():
    context = shared_institutional_cognition_runtime.build_context(
        surface="standalone_orb",
        message=CUMULATIVE_PROMPT,
        mode="Safeguarding Thinking",
    )
    curiosity = context.get("professional_curiosity") or {}
    assert curiosity.get("high_attention") is True
    assert any("Professional Curiosity Engine" in block for block in context.get("prompt_blocks") or [])


def test_high_attention_answer_strips_generic_coaching_closer():
    raw = (
        "## Immediate safe next steps\n"
        "Check safety and record rationale.\n\n"
        "What specific follow-up actions do you think would be most beneficial in your setting?"
    )
    cleaned = orb_grounded_answer_style_service.sanitize_high_attention_closer(
        raw,
        message="Medication was missed this morning — what should the manager review?",
        mode="Ask ORB",
    )
    assert "What specific follow-up actions" not in cleaned
    assert "human-led" in cleaned.lower()


def test_medication_sources_filter_out_therapeutic_practice_pack():
    sources = [
        {"label": "Therapeutic practice", "type": "therapeutic_practice", "basis": "Emotionally containing language"},
        {"label": "[Reg 12]", "type": "regulatory_framework", "basis": "Protection standard"},
    ]
    filtered = filter_display_sources(
        sources,
        message="Medication was missed this morning",
        mode="Ask ORB",
    )
    labels = {item["label"] for item in filtered}
    assert "[Reg 12]" in labels
    assert "Therapeutic practice" not in labels


def test_allegation_curiosity_includes_lado_and_contact_clarity():
    message = "A child said a staff member grabbed their arm. What should we think about?"
    lenses = orb_professional_curiosity_service.lenses_for(message)
    joined = " ".join(lenses).lower()
    assert "grabbed" in joined or "lado" in joined
    assert "fair" in joined or "assum" in joined
