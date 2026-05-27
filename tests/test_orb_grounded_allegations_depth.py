from __future__ import annotations

from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service


def test_allegations_prompt_includes_reg12_lado_and_depth():
    block = orb_grounded_answer_style_service.prompt_block("tell me about allegations", mode="Ask ORB")
    lower = block.lower()
    assert "[reg 12]" in lower
    assert "[lado]" in lower
    assert "allegations / safeguarding depth" in lower
    assert "do not predict ofsted outcomes" in lower


def test_allegations_citation_payload_includes_lado_anchor():
    citations = orb_grounded_answer_style_service.citation_payload("allegations against staff", mode="Ask ORB")
    labels = {item["label"] for item in citations}
    assert "[LADO]" in labels
    assert "[Reg 12]" in labels
