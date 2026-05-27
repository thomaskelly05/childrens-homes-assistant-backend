from __future__ import annotations

from services.orb_institutional_depth_frame_service import orb_institutional_depth_frame_service
from services.orb_professional_curiosity_service import orb_professional_curiosity_service
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


def test_shared_runtime_includes_curiosity_for_high_attention():
    context = shared_institutional_cognition_runtime.build_context(
        surface="standalone_orb",
        message=CUMULATIVE_PROMPT,
        mode="Safeguarding Thinking",
    )
    curiosity = context.get("professional_curiosity") or {}
    assert curiosity.get("high_attention") is True
    assert any("Professional Curiosity Engine" in block for block in context.get("prompt_blocks") or [])


def test_allegation_curiosity_includes_lado_and_contact_clarity():
    message = "A child said a staff member grabbed their arm. What should we think about?"
    lenses = orb_professional_curiosity_service.lenses_for(message)
    joined = " ".join(lenses).lower()
    assert "grabbed" in joined or "lado" in joined
    assert "fair" in joined or "assum" in joined
