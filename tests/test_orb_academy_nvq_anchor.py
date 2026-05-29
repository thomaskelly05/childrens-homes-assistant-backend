from __future__ import annotations

import pytest

from services.orb_academy_nvq_anchor_service import (
    LEVEL_3_AUTHENTICITY_NOTE,
    NVQ_AUTHENTICITY_CLOSER,
    orb_academy_nvq_anchor_service,
)
from services.orb_action_engine_service import orb_action_engine_service
from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service

INCIDENT_MESSAGE = (
    "Young person missing nearly 3 hours, returned from dark car with vape and £20, "
    "quiet and tearful, said not grassing anyone, medication refused after family call, "
    "autism/GDD, physical intervention and possible arm pain, no body map, poor staff language, "
    "no debriefs, manager not involved, risk assessment not reviewed."
)

LEVEL_3_FOLLOW_UP = (
    "I'm doing my Level 3 diploma. How could this incident support my reflective account "
    "without making anything up?"
)


def test_level_3_reflective_question_detected():
    assert orb_academy_nvq_anchor_service.is_level_3_reflective_account_question(LEVEL_3_FOLLOW_UP)


def test_combine_source_includes_chat_history():
    combined = orb_academy_nvq_anchor_service.combine_source_material(
        source_message=LEVEL_3_FOLLOW_UP,
        chat_history=[{"role": "user", "content": INCIDENT_MESSAGE}],
    )
    assert "missing" in combined.lower()
    assert "restraint" in combined.lower() or "physical intervention" in combined.lower()
    assert LEVEL_3_FOLLOW_UP in combined


def test_level_3_prompt_includes_structure():
    block = orb_academy_nvq_anchor_service.level_3_conversation_prompt_block(
        message=LEVEL_3_FOLLOW_UP,
        history=[{"role": "user", "content": INCIDENT_MESSAGE}],
    )
    assert "Possible evidence themes" in block
    assert "What not to write" in block
    assert "Child A" in block or "generic example" in block.lower()


def test_nvq_sanitize_removes_threshold_closer():
    raw = (
        "Reflective themes from your scenario.\n\n"
        "ORB can support your thinking, but the threshold decision should remain human-led."
    )
    cleaned = orb_academy_nvq_anchor_service.sanitize_nvq_answer(raw, message=LEVEL_3_FOLLOW_UP)
    assert "threshold decision" not in cleaned.lower()
    assert "assessor" in cleaned.lower()


def test_nvq_sanitize_adds_authenticity_boundary():
    cleaned = orb_academy_nvq_anchor_service.sanitize_nvq_answer(
        "Possible evidence themes only.",
        message=LEVEL_3_FOLLOW_UP,
    )
    assert NVQ_AUTHENTICITY_CLOSER.split(".")[0].lower() in cleaned.lower()
    assert LEVEL_3_AUTHENTICITY_NOTE.split(".")[0].lower() in cleaned.lower()


def test_grounded_style_skips_threshold_for_diploma_question():
    raw = (
        "## Themes\nMissing from care.\n\n"
        "ORB can support your thinking, but the threshold decision should remain human-led."
    )
    cleaned = orb_grounded_answer_style_service.sanitize_high_attention_closer(
        raw,
        message=LEVEL_3_FOLLOW_UP,
        mode="Staff Coach",
    )
    assert "threshold decision" not in cleaned.lower()


def test_safeguarding_disclosure_keeps_boundary():
    disclosure = "A young person has disclosed abuse and we need to know if to refer."
    cleaned = orb_grounded_answer_style_service.sanitize_high_attention_closer(
        "Seek immediate manager review.",
        message=disclosure,
        mode="Safeguarding Thinking",
    )
    assert "abuse" in cleaned.lower() or "review" in cleaned.lower()


@pytest.mark.asyncio
async def test_map_to_nvq_action_prompt_requires_anchoring(monkeypatch):
    captured: dict = {}

    async def stub_llm(*, user_prompt: str, system_prompt: str, history=None, **_kwargs):
        captured["user"] = user_prompt
        captured["system"] = system_prompt
        captured["history"] = history or []
        return "Based only on what you have provided…\n\n## Possible evidence themes\nMissing from care."

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    await orb_action_engine_service.run_action(
        action="map_to_nvq_evidence",
        source_message=LEVEL_3_FOLLOW_UP,
        source_answer=INCIDENT_MESSAGE,
        mode="Staff Coach",
        context={
            "profile_role": "diploma_learner",
            "chat_history": [{"role": "user", "content": INCIDENT_MESSAGE}],
        },
    )
    assert "do not invent" in captured["user"].lower()
    assert "child a" in captured["user"].lower() or "generic" in captured["user"].lower()
    assert INCIDENT_MESSAGE[:40] in captured["user"]


@pytest.mark.asyncio
async def test_professional_discussion_includes_assessor_prompts(monkeypatch):
    captured: dict = {}

    async def stub_llm(*, user_prompt: str, **_kwargs):
        captured["user"] = user_prompt
        return "Based only on what you have provided…\n\n## Assessor quality notes"

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    await orb_action_engine_service.run_action(
        action="create_professional_discussion_prompts",
        source_answer=INCIDENT_MESSAGE,
        mode="Staff Coach",
    )
    prompt = captured["user"].lower()
    assert "do not lead" in prompt
    assert "witness" in prompt
    assert "exploitation" in prompt or "contextual safeguarding" in prompt


@pytest.mark.asyncio
async def test_follow_up_action_uses_chat_history_in_source(monkeypatch):
    captured: dict = {}

    async def stub_llm(*, user_prompt: str, **_kwargs):
        captured["user"] = user_prompt
        return "Based only on what you have provided…\n\n## Short answer\nThemes only."

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    await orb_action_engine_service.run_action(
        action="incident_to_reflective_learning",
        source_message=LEVEL_3_FOLLOW_UP,
        context={
            "chat_history": [
                {"role": "user", "content": INCIDENT_MESSAGE},
                {"role": "assistant", "content": "Summary of concerns."},
            ],
        },
    )
    assert "missing" in captured["user"].lower()
    assert "prior conversation" in captured["user"].lower()
