"""Tests for ORB universal therapeutic language contract and phrase guard."""

from __future__ import annotations

from services.orb_therapeutic_language_contract_service import (
    THERAPEUTIC_QA_PROMPTS,
    UNIVERSAL_THERAPEUTIC_PRINCIPLES,
    apply_deterministic_therapeutic_repairs,
    build_universal_therapeutic_language_contract_block,
    find_judgemental_phrases,
    find_missing_therapeutic_markers,
    score_therapeutic_readiness,
)


def test_universal_therapeutic_principles_defined():
    assert len(UNIVERSAL_THERAPEUTIC_PRINCIPLES) >= 15
    joined = " ".join(UNIVERSAL_THERAPEUTIC_PRINCIPLES).lower()
    assert "shame" in joined
    assert "child's voice" in joined
    assert "professional curiosity" in joined


def test_universal_contract_block_includes_forbidden_phrases():
    block = build_universal_therapeutic_language_contract_block()
    lowered = block.lower()
    assert "attention seeking" in lowered
    assert "manipulative" in lowered
    assert "appeared distressed" in lowered


def test_judgemental_phrases_detected():
    phrases = find_judgemental_phrases("He was attention seeking and manipulative all evening.")
    assert "attention_seeking" in phrases
    assert "manipulative" in phrases


def test_deterministic_replacement_for_attention_seeking():
    repaired, applied = apply_deterministic_therapeutic_repairs(
        "Staff said he was attention seeking after contact."
    )
    assert "attention seeking" not in repaired.lower()
    assert "communicating distress" in repaired.lower()
    assert applied


def test_deterministic_replacement_for_kicked_off():
    repaired, _ = apply_deterministic_therapeutic_repairs("Jamie kicked off after family time.")
    assert "kicked off" not in repaired.lower()
    assert "distressed" in repaired.lower()


def test_daily_record_therapeutic_markers():
    answer = """
Daily record — today

The young person said she felt worried about school. She appeared distressed at breakfast.
Staff offered toast and supported her to regulate. A positive moment: she chose cereal later.
Follow-up: key-worker to explore school worries.
""".strip()
    missing = find_missing_therapeutic_markers(answer, family_id="daily_record")
    assert "child_voice" not in missing
    assert "staff_support" not in missing


def test_therapeutic_scoring_includes_scales():
    answer = (
        "The young person appeared distressed. Staff supported regulation through calm presence "
        "and repair was supported by a later conversation. Staff should remain curious about "
        "what the behaviour may have been communicating."
    )
    score = score_therapeutic_readiness(answer, family_id="incident_record")
    assert 0 <= score["therapeutic_language"] <= 5
    assert 0 <= score["trauma_informed"] <= 5
    assert score["non_shaming_language"] == "pass"
    assert score["therapeutic_readiness_score"] > 0


def test_therapeutic_qa_prompt_pack_has_fifteen_prompts():
    assert len(THERAPEUTIC_QA_PROMPTS) >= 15
    prompt_ids = {item["prompt_id"] for item in THERAPEUTIC_QA_PROMPTS}
    assert "therapeutic_daily_note_rewrite" in prompt_ids
    assert "therapeutic_self_harm_disclosure" in prompt_ids
    assert "therapeutic_reg44_relational" in prompt_ids
