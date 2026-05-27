from __future__ import annotations

from services.indicare_intelligence_surface_router import standalone_guidance_boundary_prefix
from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service
from services.orb_institutional_depth_frame_service import orb_institutional_depth_frame_service
from services.orb_professional_curiosity_service import orb_professional_curiosity_service
from services.orb_standalone_sources import filter_display_sources
from services.shared_institutional_cognition_runtime import shared_institutional_cognition_runtime

MEDICATION_PROMPT = "Medication was missed this morning — what should the manager review?"
MISSING_PROMPT = "A young person went missing overnight — what should we record on return?"
THERAPEUTIC_PROMPT = "Family time was cancelled and the child smashed a cup — help me think therapeutically"


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
    assert "medication decisions" in cleaned.lower() or "pharmacy" in cleaned.lower()


def test_medication_curiosity_includes_mar_and_time_critical():
    lenses = orb_professional_curiosity_service.lenses_for(MEDICATION_PROMPT)
    joined = " ".join(lenses).lower()
    assert "mar" in joined
    assert "time-critical" in joined or "time critical" in joined
    assert "manager" in joined
    assert "pharmacy" in joined or "gp" in joined or "111" in joined
    assert "handover" in joined
    assert "competenc" in joined or "training" in joined
    assert "backfill" in joined or "transparent" in joined
    assert "audit" in joined


def test_medication_depth_frame_has_rm_structure():
    frame = orb_institutional_depth_frame_service.build_frame(message=MEDICATION_PROMPT)
    structure = frame.get("response_structure") or []
    assert "## Immediate safety" in structure
    assert "## Professional boundary" in structure
    lenses = " ".join(frame.get("required_lenses") or []).lower()
    assert "prn" in lenses or "controlled" in lenses or "psychotropic" in lenses
    assert "reg 12" in lenses or "reg 13" in lenses


def test_missing_curiosity_includes_exploitation_and_return():
    lenses = orb_professional_curiosity_service.lenses_for(MISSING_PROMPT)
    joined = " ".join(lenses).lower()
    assert "exploitation" in joined or "contextual" in joined
    assert "return" in joined
    assert "push" in joined and "pull" in joined
    assert "unknown adult" in joined
    assert "social media" in joined or "phone" in joined
    assert "route" in joined or "location" in joined


def test_missing_depth_frame_includes_ofsted_learning_lens():
    frame = orb_institutional_depth_frame_service.build_frame(message=MISSING_PROMPT)
    ofsted = " ".join(frame.get("ofsted_lens") or []).lower()
    assert "learning" in ofsted or "prevention" in ofsted
    assert "why children go missing" in " ".join(frame.get("required_lenses") or []).lower()


def test_therapeutic_curiosity_includes_attachment_and_repair():
    lenses = orb_professional_curiosity_service.lenses_for(THERAPEUTIC_PROMPT)
    joined = " ".join(lenses).lower()
    assert "attachment" in joined or "rejection" in joined or "loss" in joined
    assert "shame" in joined or "disappointment" in joined
    assert "co-regulat" in joined
    assert "repair" in joined
    assert "settle" in joined or "without blame" in joined


def test_therapeutic_depth_frame_closing_guidance():
    frame = orb_institutional_depth_frame_service.build_frame(message=THERAPEUTIC_PROMPT)
    closing = (frame.get("closing_guidance") or "").lower()
    assert "without blame" in closing
    assert "safe, heard and supported" in closing


def test_boundary_prefix_not_repeated_when_history_already_has_boundary():
    history = [
        {
            "role": "assistant",
            "content": "I cannot see the actual live child record in IndiCare OS, but generally — here is guidance.",
        }
    ]
    assert standalone_guidance_boundary_prefix(MEDICATION_PROMPT, history=history) is None


def test_boundary_prefix_uses_shorter_opener_for_practice_questions():
    prefix = standalone_guidance_boundary_prefix(MEDICATION_PROMPT)
    assert prefix is not None
    assert "five layers" in prefix.lower() or "live child record" in prefix.lower()


def test_shared_runtime_omits_boundary_prefix_on_follow_up_turn():
    history = [{"role": "assistant", "content": "Generally, I would think about this in five layers — prior answer."}]
    context = shared_institutional_cognition_runtime.build_context(
        surface="standalone_orb",
        message="And what about the MAR entry specifically?",
        mode="Ask ORB",
        history=history,
    )
    assert context.get("guidance_boundary_prefix") is None


def test_therapeutic_sanitize_uses_therapeutic_closer_not_threshold_boundary():
    raw = (
        "## How to record it\n"
        "Record without blame.\n\n"
        "What specific follow-up actions do you think would be most beneficial in your setting?"
    )
    cleaned = orb_grounded_answer_style_service.sanitize_high_attention_closer(
        raw,
        message="Family time was cancelled and the child smashed a cup — help me think therapeutically",
        mode="Ask ORB",
    )
    assert "What specific follow-up actions" not in cleaned
    assert "without blame" in cleaned.lower()
    assert "threshold decision" not in cleaned.lower()


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
