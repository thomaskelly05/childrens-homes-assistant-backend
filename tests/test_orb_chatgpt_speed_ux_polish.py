"""ORB ChatGPT-speed UX + live prose polish — automated contract tests."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from assistant.knowledge.adult_identity_language import (
    fix_broken_adult_heading_wording,
    sanitize_residential_answer_polish,
    strip_inline_source_basis_block,
    strip_internal_prompt_leakage,
)
from services.orb_instant_first_lines_service import (
    merge_instant_lines_with_answer,
    strip_duplicate_instant_prefix,
)

ROUTES_PATH = Path(__file__).resolve().parents[1] / "routers" / "orb_standalone_routes.py"
NAV_PATH = Path(__file__).resolve().parents[1] / "frontend-next" / "lib" / "orb" / "orb-navigation-convergence.ts"
COMPANION_PATH = (
    Path(__file__).resolve().parents[1] / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
)
ASSISTANT_MSG_PATH = (
    Path(__file__).resolve().parents[1]
    / "frontend-next"
    / "components"
    / "orb-standalone"
    / "orb-assistant-message.tsx"
)
LATENCY_PATH = Path(__file__).resolve().parents[1] / "frontend-next" / "lib" / "orb" / "orb-chat-latency.ts"
SHELL_CSS_PATH = Path(__file__).resolve().parents[1] / "frontend-next" / "app" / "orb" / "orb-residential-shell.css"
COMMUNICATE_PROMPT = "Create a communication support pack for a hospital visit tomorrow."


def test_instant_line_deduplicated_from_stream_and_final():
    instant = "Here is a simple daily record draft."
    duplicated = f"{instant}\n\n{instant}\n\nBreakfast was calm."
    stripped = strip_duplicate_instant_prefix(duplicated, instant)
    merged = merge_instant_lines_with_answer(instant_lines=instant, full_answer=stripped)
    assert merged.lower().count(instant.lower()) == 1
    assert "Breakfast was calm" in merged


def test_broken_adult_heading_wording_repaired():
    raw = "## The adult Present\nChild chose toast.\n\n## The adult Actions\nStaff offered water."
    fixed = fix_broken_adult_heading_wording(raw)
    assert "The adult Present" not in fixed
    assert "The adult Actions" not in fixed
    assert "Staff present" in fixed
    assert "Staff response" in fixed


def test_internal_prompt_leakage_stripped():
    raw = (
        "Adult profile preferences (user-provided; does not access OS records):\n"
        "- Role: Residential support worker\n"
        "- Default lenses to weave in when relevant: safeguarding\n"
        "- Therapeutic preferences: calm tone\n"
        "- Apply longitudinal/chronology thinking where incidents or patterns are discussed.\n\n"
        "Here is practical guidance for the shift."
    )
    cleaned = strip_internal_prompt_leakage(raw)
    assert "Adult profile preferences" not in cleaned
    assert "Default lenses" not in cleaned
    assert "Therapeutic preferences" not in cleaned
    assert "longitudinal" not in cleaned
    assert "practical guidance" in cleaned


def test_inline_source_basis_block_removed():
    raw = "Concise answer.\n\nSources / basis\n- ORB Operating Brain — selected sections"
    assert "Sources / basis" not in strip_inline_source_basis_block(raw)


def test_generic_endings_and_placeholders_polished():
    raw = (
        "[Child's Name] refused breakfast. The adult facilitated a calm handover. "
        "If you have any further questions, please ask. This approach ensures a comprehensive account."
    )
    polished = sanitize_residential_answer_polish(raw, source_text="daily record breakfast")
    assert "[Child's Name]" not in polished
    assert "the young person" in polished.lower()
    assert "If you have any further questions" not in polished
    assert "comprehensive account" not in polished.lower()
    assert "Staff supported" in polished or "facilitated" not in polished.lower()


def test_medication_refusal_polish_avoids_medication_error():
    from assistant.knowledge.residential_safeguarding_terminology import find_inappropriate_medication_error_reference

    raw = "Document the refusal. Consider whether this is a medication error."
    polished = sanitize_residential_answer_polish(raw, source_text="young person refused medication")
    assert not find_inappropriate_medication_error_reference(polished)


def test_communicate_hospital_visit_pack_is_topic_accurate():
    from services.orb_communicate_support_pack_service import orb_communicate_support_pack_service

    pack = orb_communicate_support_pack_service.build_support_pack_from_message(COMMUNICATE_PROMPT)
    formatted = orb_communicate_support_pack_service.format_support_pack_for_chat(pack)
    lower = formatted.lower()
    assert "hospital" in lower
    assert "contact with someone important" not in lower
    for marker in ("easy-read", "visual", "staff", "reflect", "safety"):
        assert marker in lower or "boundary" in lower


def test_backend_emits_prelude_sse_for_instant_lines():
    source = ROUTES_PATH.read_text(encoding="utf-8")
    stream = source[source.index("async def standalone_orb_conversation_stream(") :]
    assert 'yield _sse_event(\n                    "prelude"' in stream or 'yield _sse_event("prelude"' in stream
    assert '"kind": "instant_line"' in stream


def test_frontend_handles_prelude_and_latency_marks():
    companion = COMPANION_PATH.read_text(encoding="utf-8")
    assistant = ASSISTANT_MSG_PATH.read_text(encoding="utf-8")
    latency = LATENCY_PATH.read_text(encoding="utf-8")
    assert "onPrelude" in companion
    assert "instantPrelude" in companion
    assert "first_visible_assistant" in latency
    assert "instant_line_visible" in latency
    assert "data-orb-instant-prelude" in assistant
    assert "data-orb-streaming-cursor" in assistant


def test_no_empty_assistant_bubble_streaming_placeholder_immediate():
    companion = COMPANION_PATH.read_text(encoding="utf-8")
    assert "streamingPlaceholder" in companion
    assert "status: 'streaming'" in companion
    assert "createThinkingPlaceholder(thinkingMessageId)" not in companion.split("const sendMessage")[1].split("runConversationRequest")[0]


def test_safeguarding_alert_contrast_class_exists():
    css = SHELL_CSS_PATH.read_text(encoding="utf-8")
    companion = COMPANION_PATH.read_text(encoding="utf-8")
    assert ".orb-safeguarding-urgent-banner" in css
    assert "orb-safeguarding-urgent-banner" in companion
    assert "bg-slate-800" in companion


def test_communicate_hidden_from_launch_nav():
    nav = NAV_PATH.read_text(encoding="utf-8")
    assert "ORB_HIDDEN_LAUNCH_STATION_IDS = ['orb_communicate']" in nav


def test_live_signoff_harness_checks_first_visible_latency_field():
    script = (
        Path(__file__).resolve().parents[1] / "frontend-next" / "e2e" / "orb-pr1724-live-ui.spec.ts"
    ).read_text(encoding="utf-8")
    assert "first_visible_ms" in script


@pytest.mark.asyncio
async def test_stream_metadata_includes_answer_chars_and_provider_ms(monkeypatch):
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
    assert live.get("answer_chars", 0) > 0
    assert live.get("instant_lines_used") is True
    first = (live.get("first_token_text") or "").strip()
    final = live.get("final_answer") or ""
    assert first
    assert first in final[: max(len(first) + 60, 140)]
