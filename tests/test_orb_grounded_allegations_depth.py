from __future__ import annotations

from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service
from services.orb_institutional_depth_frame_service import orb_institutional_depth_frame_service


def test_allegations_prompt_includes_reg12_lado_and_depth():
    block = orb_grounded_answer_style_service.prompt_block("tell me about allegations", mode="Ask ORB")
    lower = block.lower()
    assert "[reg 12]" in lower
    assert "[lado]" in lower
    assert "allegations / safeguarding depth" in lower
    assert "do not predict ofsted outcomes" in lower
    assert "lying" in lower or "falsehood" in lower or "without process" in lower


def test_allegations_citation_payload_includes_lado_anchor():
    citations = orb_grounded_answer_style_service.citation_payload("allegations against staff", mode="Ask ORB")
    labels = {item["label"] for item in citations}
    assert "[LADO]" in labels
    assert "[Reg 12]" in labels


def test_allegations_depth_frame_includes_reg12_reg13_recording_fairness():
    frame = orb_institutional_depth_frame_service.build_frame(
        message="A child alleged a staff member grabbed them during handover"
    )
    lenses = " ".join(frame.get("required_lenses") or []).lower()
    assert "reg 12" in lenses
    assert "reg 13" in lenses
    assert "lado" in lenses
    assert "recording" in lenses or "chronology" in lenses
    assert "fair" in lenses or "lying" in lenses


def test_recording_rewrite_includes_placeholders_and_gaps():
    block = orb_grounded_answer_style_service.prompt_block(
        "Please rewrite this poor restraint record wording",
        mode="Record This Properly",
    )
    lower = block.lower()
    assert "placeholder" in lower or "bracket" in lower or "[insert" in lower
    assert "what was wrong" in lower or "still missing" in lower


def test_missing_depth_in_prompt():
    block = orb_grounded_answer_style_service.prompt_block(
        "A young person went missing overnight — what should we record?",
        mode="Safeguarding Thinking",
    )
    lower = block.lower()
    assert "push" in lower or "pull" in lower
    assert "exploitation" in lower or "contextual" in lower


def test_restraint_depth_in_prompt():
    block = orb_grounded_answer_style_service.prompt_block(
        "Help me think through a physical intervention that happened on shift",
        mode="Ask ORB",
    )
    lower = block.lower()
    assert "proportion" in lower or "necessity" in lower
    assert "debrief" in lower
    assert "repair" in lower or "manager review" in lower


def test_ri_leadership_depth_frame():
    frame = orb_institutional_depth_frame_service.build_frame(
        message="As the responsible individual, what should I challenge about Reg 44 and Reg 45 evidence?"
    )
    lenses = " ".join(frame.get("required_lenses") or []).lower()
    assert "reg 44" in lenses or "reg 45" in lenses
    assert "drift" in lenses or "triangul" in lenses
    assert "impact" in lenses


def test_cumulative_concern_depth_in_runtime_style():
    prompt = (
        "Three allegations, two missing episodes, four restraints same staff — nothing looks serious alone "
        "but something is not right"
    )
    block = orb_grounded_answer_style_service.prompt_block(prompt, mode="Safeguarding Thinking")
    lower = block.lower()
    assert "cumulative" in lower or "pattern" in lower
    assert "ri" in lower or "registered manager" in lower or "rm questions" in lower
    assert "convergence" in lower or "not one isolated" in lower
    assert "[reg 12]" in lower
    assert "never" in lower and "explore further" in lower


def test_cumulative_frame_includes_rm_ri_and_ofsted_sections():
    from services.orb_institutional_depth_frame_service import orb_institutional_depth_frame_service

    prompt = (
        "Three allegations, two missing episodes, four restraints same staff — nothing looks serious alone "
        "but something is not right"
    )
    frame = orb_institutional_depth_frame_service.build_frame(message=prompt)
    assert frame.get("rm_questions")
    assert frame.get("ri_questions")
    assert frame.get("ofsted_lens")
    assert frame.get("patterns_to_explore")
    prompt_block = orb_institutional_depth_frame_service.prompt_block(message=prompt)
    assert "registered manager" in prompt_block.lower()
    assert "responsible individual" in prompt_block.lower()


def test_filter_display_sources_drops_generic_product_boundary():
    from services.orb_standalone_sources import filter_display_sources

    sources = [
        {"label": "Standalone ORB product boundary", "type": "safety_boundary"},
        {"label": "[Reg 12]", "type": "regulatory_framework"},
    ]
    prompt = "Three allegations, two missing, four restraints same staff — pattern not right"
    filtered = filter_display_sources(sources, message=prompt, mode="Safeguarding Thinking")
    labels = {s["label"] for s in filtered}
    assert "Standalone ORB product boundary" not in labels
    assert "[Reg 12]" in labels
