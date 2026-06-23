"""ORB staging live UI readiness — guarded instant lines, category labels, mock concision."""

from __future__ import annotations

import asyncio
import re
from pathlib import Path

import pytest

from services.orb_instant_first_lines_service import (
    detect_playbook_category,
    guarded_instant_lines_for_message,
    instant_first_lines_for_message,
    should_skip_instant_lines,
)
from services.orb_standalone_sources import append_sources_basis_section

ROUTES_PATH = Path(__file__).resolve().parents[1] / "routers" / "orb_standalone_routes.py"
NAV_PATH = Path(__file__).resolve().parents[1] / "frontend-next" / "lib" / "orb" / "orb-navigation-convergence.ts"


REG_45_PROMPT = "What should a Reg 45 review cover this quarter?"
REG_44_PROMPT = "What should a Reg 44 visitor note cover this month?"
PHYSICAL_INTERVENTION_PROMPT = (
    "Help me record a physical intervention used to guide a young person away from danger."
)
SELF_HARM_PROMPT = "Young person disclosed self-harm and said they want to die."
MISSING_PROMPT = "A young person is missing from care right now. What should staff do?"
MEDICATION_REFUSAL_PROMPT = "A young person refused medication. What should we consider?"
COMMUNICATE_PROMPT = "Create a communication support pack for a hospital visit tomorrow."


def test_reg_45_category_label_precise():
    category = detect_playbook_category(REG_45_PROMPT)
    assert category in {"regulation_45", "reg_45_review"}
    result = instant_first_lines_for_message(REG_45_PROMPT)
    assert result.category_id in {"regulation_45", "reg_45_review"}
    assert "regulation 45" in result.text.lower() or "quality of care" in result.text.lower()


def test_reg_44_category_label_precise():
    category = detect_playbook_category(REG_44_PROMPT)
    assert category == "regulation_44"
    result = instant_first_lines_for_message(REG_44_PROMPT)
    assert result.category_id == "regulation_44"


def test_physical_intervention_category_label_precise():
    category = detect_playbook_category(PHYSICAL_INTERVENTION_PROMPT)
    assert category == "physical_intervention_restraint"
    result = instant_first_lines_for_message(PHYSICAL_INTERVENTION_PROMPT)
    assert result.category_id == "physical_intervention_restraint"
    assert "physical intervention" in result.text.lower()
    assert "incident recording" not in result.text.lower()


def test_medication_refusal_category_unchanged():
    result = instant_first_lines_for_message(MEDICATION_REFUSAL_PROMPT)
    assert result.category_id == "medication_refusal_support"


def test_allegations_lado_category_unchanged():
    result = instant_first_lines_for_message("A young person alleged a member of staff grabbed them.")
    assert result.category_id == "allegations_lado"


def test_missing_from_care_category_unchanged():
    result = instant_first_lines_for_message(MISSING_PROMPT)
    assert result.category_id == "missing_from_care"


def test_orb_communicate_category_unchanged():
    result = instant_first_lines_for_message(COMMUNICATE_PROMPT)
    assert result.category_id == "orb_communicate"


def test_guarded_instant_lines_use_safe_escalation_wording():
    result = guarded_instant_lines_for_message(SELF_HARM_PROMPT)
    assert "immediate safety" in result.text.lower()
    assert "manager/on-call" in result.text.lower()
    assert "prepare the full response" in result.text.lower()
    assert "openai" not in result.text.lower()


def test_guarded_instant_lines_not_skipped_for_guarded_delivery():
    assert should_skip_instant_lines(expert_depth="safeguarding_critical", guarded_stream_delivery=True) is False


def test_playbook_category_keeps_instant_lines_on_general_light():
    assert should_skip_instant_lines(
        expert_depth="general_light",
        guarded_stream_delivery=False,
        category_id="daily_recording",
    ) is False
    assert should_skip_instant_lines(
        expert_depth="general_light",
        guarded_stream_delivery=False,
        category_id="general",
    ) is True


def test_mock_leakage_sanitized_for_user_visible_answer(monkeypatch):
    from services.orb_provider_user_answer_service import (
        ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE,
        sanitize_user_visible_provider_answer,
    )

    monkeypatch.setenv("APP_ENV", "staging")
    leaked = "ORB mock engine response. Configure OPENAI_API_KEY for live answers."
    sanitized, issue = sanitize_user_visible_provider_answer(leaked, provider="mock")
    assert issue == "mock_provider"
    assert sanitized == ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE


@pytest.mark.asyncio
async def test_strict_mode_signoff_fails_without_openai_key(monkeypatch):
    monkeypatch.setenv("ORB_LIVE_SIGN_OFF", "true")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("AI_PROVIDER_STRICT", "true")
    from services.orb_provider_user_answer_service import assert_live_provider_for_signoff

    with pytest.raises(RuntimeError):
        assert_live_provider_for_signoff()


@pytest.mark.asyncio
async def test_daily_recording_emits_instant_lines_on_general_light_depth(monkeypatch):
    from scripts.run_orb_live_ui_verification_pr1724 import _live_stream, _patch_access_for_local

    from tests.conftest import TEST_USER_ID

    user = {
        "id": TEST_USER_ID,
        "user_id": TEST_USER_ID,
        "email": "staging.orb@indicare.local",
        "role": "manager",
        "home_id": 1,
        "first_name": "Staging",
        "last_name": "ORB",
        "is_active": True,
    }
    _patch_access_for_local(user)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("AI_PROVIDER_STRICT", "false")

    live = await _live_stream(
        "Help me write a daily record — calm breakfast, chose toast, watched TV before handover.",
        user,
    )
    assert live.get("instant_lines_used") is True
    assert live.get("instant_category") == "daily_recording"
    assert (live.get("final_answer") or "").strip()
    assert (live.get("answer_chars") or 0) > 0
    first_line = (live.get("first_token_text") or "").strip()
    assert "daily recording" in first_line.lower()


@pytest.mark.asyncio
async def test_signoff_harness_fails_on_mock_provider(monkeypatch):
    from scripts.run_orb_live_ui_verification_pr1724 import _assess_prompt

    monkeypatch.setenv("ORB_LIVE_SIGN_OFF", "true")
    assessed = _assess_prompt(
        "daily_recording",
        "Daily recording",
        {
            "final_answer": "ORB mock engine response. Configure OPENAI_API_KEY for live answers.",
            "streamed_text": "",
            "provider": "mock",
            "answer_chars": 28,
            "instant_lines_used": False,
            "first_token_ms": 12,
            "total_ms": 400,
            "instant_category": "daily_recording",
        },
    )
    assert any("mock" in f.lower() for f in assessed["failures"])
    assert assessed["verdict"] == "fail"


def test_physical_intervention_guarded_keeps_category_specific_line():
    result = guarded_instant_lines_for_message(PHYSICAL_INTERVENTION_PROMPT)
    assert result.category_id == "physical_intervention_restraint"
    assert "physical intervention" in result.text.lower()


def test_mock_mode_suppresses_visible_sources_basis_dump():
    mock_answer = (
        "ORB mock engine response. Task received (120 chars). "
        "Configure OPENAI_API_KEY for live answers."
    )
    sources = [
        {"label": "ORB Operating Brain", "type": "product_context", "basis": "Selected sections"},
        {"label": "ORB Knowledge Spine", "type": "general_knowledge", "basis": "Selected modules"},
    ]
    visible = append_sources_basis_section(mock_answer, sources)
    assert "Sources / basis" not in visible
    assert len(visible) < 300


def test_mock_provider_suppresses_visible_sources_basis():
    answer = "Concise routine recording guidance for shift."
    sources = [{"label": "Recording quality", "type": "recording_quality", "basis": "Built-in"}]
    visible = append_sources_basis_section(answer, sources, provider="mock")
    assert visible == answer
    assert "Sources / basis" not in visible


def test_communicate_remains_hidden_from_launch_nav():
    nav = NAV_PATH.read_text(encoding="utf-8")
    assert "ORB_HIDDEN_LAUNCH_STATION_IDS = ['orb_communicate']" in nav
    visible_block = nav.split("ORB_VISIBLE_SIDEBAR_NAV_IDS")[1].split("]")[0]
    assert "'orb_communicate'" not in visible_block


def test_guarded_stream_route_preserves_instant_lines():
    source = ROUTES_PATH.read_text(encoding="utf-8")
    stream = source[source.index("async def standalone_orb_conversation_stream(") :]
    assert "guarded_instant_lines_for_message" in stream
    assert "if guarded_stream_delivery and instant_lines_emitted:" not in stream
    guarded_block = stream[stream.index("if guarded_stream_delivery:") :]
    assert "merge_instant_lines_with_answer" in guarded_block
    assert "await assistant_runtime.answer(" in guarded_block
    assert "finalize_orb_residential_answer" in stream


def test_guarded_stream_route_still_buffers_llm_before_tokens():
    source = ROUTES_PATH.read_text(encoding="utf-8")
    guarded_block = source[source.index("if guarded_stream_delivery:") :]
    answer_idx = guarded_block.index("await assistant_runtime.answer(")
    stream_yield_idx = guarded_block.index("yield_answer_text_as_stream")
    assert answer_idx < stream_yield_idx
    assert "assistant_runtime.stream_answer(" not in guarded_block.split("else:")[0]


@pytest.mark.asyncio
async def test_live_ui_verification_harness_runs(monkeypatch):
    from scripts.run_orb_live_ui_verification_pr1724 import REPRESENTATIVE_PROMPTS, _assess_prompt, _patch_access_for_local

    from tests.conftest import TEST_USER_ID

    user = {
        "id": TEST_USER_ID,
        "user_id": TEST_USER_ID,
        "email": "admin@indicare.co.uk",
        "role": "admin",
        "home_id": 1,
        "first_name": "Admin",
        "last_name": "User",
        "is_active": True,
    }
    _patch_access_for_local(user)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("AI_PROVIDER_STRICT", "false")

    from scripts.run_orb_live_ui_verification_pr1724 import _live_stream

    category_id, label, message = next(
        (row for row in REPRESENTATIVE_PROMPTS if row[0] == "regulation_45"),
        REPRESENTATIVE_PROMPTS[0],
    )
    live = await _live_stream(message, user)
    assessed = _assess_prompt(category_id, label, live)
    assert assessed["timing"].get("instant_category") in {"regulation_45", "reg_45_review"}
    assert "fail" != assessed["verdict"] or not assessed["failures"]


@pytest.mark.asyncio
async def test_guarded_high_risk_emits_instant_before_guarded_answer(monkeypatch):
    from scripts.run_orb_live_ui_verification_pr1724 import _live_stream, _patch_access_for_local

    from tests.conftest import TEST_USER_ID

    user = {
        "id": TEST_USER_ID,
        "user_id": TEST_USER_ID,
        "email": "admin@indicare.co.uk",
        "role": "admin",
        "home_id": 1,
        "first_name": "Admin",
        "last_name": "User",
        "is_active": True,
    }
    _patch_access_for_local(user)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("AI_PROVIDER_STRICT", "false")

    live = await _live_stream(SELF_HARM_PROMPT, user)
    first_line = (live.get("first_token_text") or "").strip()
    final_answer = live.get("final_answer") or ""
    assert first_line
    assert "immediate safety" in first_line.lower()
    assert live.get("instant_lines_used") is True
    # Prelude is emitted separately; final metadata answer is body-only.
    assert "daily recording question" not in first_line.lower()
    assert "safety fallback" in final_answer.lower() or "safeguarding" in final_answer.lower()
    assert not re.search(r"\b(dosage|prescribe|you should)\b", first_line.lower())


@pytest.mark.asyncio
async def test_routine_mock_answer_stays_concise_without_source_dump(monkeypatch):
    from scripts.run_orb_live_ui_verification_pr1724 import _live_stream, _patch_access_for_local

    from tests.conftest import TEST_USER_ID

    user = {
        "id": TEST_USER_ID,
        "user_id": TEST_USER_ID,
        "email": "admin@indicare.co.uk",
        "role": "admin",
        "home_id": 1,
        "first_name": "Admin",
        "last_name": "User",
        "is_active": True,
    }
    _patch_access_for_local(user)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("AI_PROVIDER_STRICT", "false")

    live = await _live_stream(
        "Help me write a daily record — calm breakfast, chose toast, watched TV before handover.",
        user,
    )
    final_answer = live.get("final_answer") or ""
    assert "Sources / basis" not in final_answer
    assert live.get("sources_count", 0) > 0
    assert len(final_answer) < 2500
