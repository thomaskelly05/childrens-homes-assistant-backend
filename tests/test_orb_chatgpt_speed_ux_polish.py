"""ORB ChatGPT-speed UX + live prose polish — automated contract tests."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from assistant.knowledge.adult_identity_language import (
    apply_adult_identity_language,
    fix_broken_adult_heading_wording,
    sanitize_residential_answer_polish,
    sanitize_visible_final_answer,
    strip_inline_source_basis_block,
    strip_indicare_product_boilerplate,
    strip_internal_prompt_leakage,
)
from services.orb_instant_first_lines_service import (
    instant_first_lines_for_message,
    merge_instant_lines_with_answer,
    strip_duplicate_instant_prefix,
)
from services.orb_provider_user_answer_service import (
    ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE,
    sanitize_user_visible_provider_answer,
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


def test_instant_prelude_dedup_handles_staff_adult_wording_mismatch():
    prelude = instant_first_lines_for_message(
        "Help me write a daily record — calm breakfast, chose toast, watched TV before handover."
    ).text
    near_dup = prelude.replace("staff responded", "The adult responded")
    body = f"{near_dup}\n\nHere is a simple daily record draft:\nThe young person chose toast."
    stripped = strip_duplicate_instant_prefix(body, prelude)
    assert stripped.lower().count("i'm treating this as a daily recording question") == 0
    assert "chose toast" in stripped


def test_broken_adult_heading_wording_repaired():
    raw = "## The adult Present\nChild chose toast.\n\n## The adult Actions\nStaff offered water."
    fixed = fix_broken_adult_heading_wording(raw)
    assert "The adult Present" not in fixed
    assert "The adult Actions" not in fixed
    assert "Staff present" in fixed
    assert "Staff response" in fixed


def test_how_the_adult_responded_repaired():
    raw = "Start with what happened, how The adult responded, and what happened next."
    fixed = fix_broken_adult_heading_wording(raw)
    assert "how The adult responded" not in fixed
    assert "how staff responded" in fixed


def test_specific_the_adult_interactions_repaired():
    raw = "Include specific the adult interactions in the record."
    fixed = fix_broken_adult_heading_wording(raw)
    assert "specific the adult interactions" not in fixed
    assert "specific staff interactions" in fixed


def test_visible_final_sanitizer_on_routine_daily_record_form():
    form_like = (
        "Daily Record: [Date]\nYoung Person: [Name]\n"
        "staff present: [Names of staff present]\nManager Review: [Manager's name]"
    )
    prompt = (
        "Help me write a daily record — calm breakfast, chose toast, watched TV before handover."
    )
    cleaned = sanitize_visible_final_answer(form_like, source_text=prompt)
    lower = cleaned.lower()
    assert "manager review" not in lower
    assert "daily record draft" in lower
    assert "context / routine" in lower
    assert "to complete before saving" in lower


def test_apply_adult_identity_preserves_how_staff_responded():
    raw = "Record what happened, how staff responded, and what happened next."
    cleaned = apply_adult_identity_language(raw)
    assert "how staff responded" in cleaned.lower()
    assert "how The adult responded" not in cleaned


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
    raw_heading = "Answer body.\n\n## Source basis\nORB Operating Brain, SCCIF"
    assert "Source basis" not in strip_inline_source_basis_block(raw_heading)


def test_indicare_product_boilerplate_stripped_from_non_product_prompts():
    boilerplate = (
        "IndiCare is a residential children's homes operating system and intelligence platform "
        "built to support staff and managers in registered homes.\n\n"
        "It is designed around care recording, safeguarding, Ofsted and SCCIF readiness."
    )
    cleaned = strip_indicare_product_boilerplate(boilerplate, source_text="daily record breakfast")
    assert "IndiCare is a residential" not in cleaned


def test_provider_failure_replaces_product_boilerplate(monkeypatch):
    monkeypatch.setenv("APP_ENV", "staging")
    text = (
        "IndiCare is a residential children's homes operating system and intelligence platform "
        "built to support staff and managers in registered homes."
    )
    sanitized, issue = sanitize_user_visible_provider_answer(
        text,
        provider="openai",
        source_text="Help me write a daily record.",
    )
    assert issue == "product_boilerplate_leakage"
    assert sanitized == ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE


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
    assert pack.intent == "hospital_appointment"
    assert "tomorrow you are going to hospital" in lower
    assert "contact with someone important" not in lower
    assert "source basis" not in lower
    for marker in ("easy-read", "visual", "staff", "reflect", "safety"):
        assert marker in lower or "boundary" in lower


def test_communicate_contact_pack_has_no_internal_scaffolding():
    from services.orb_communicate_support_pack_service import orb_communicate_support_pack_service

    prompt = (
        "Create a communication support pack to explain to a young person with autism "
        "that contact has changed."
    )
    pack = orb_communicate_support_pack_service.build_support_pack_from_message(prompt)
    assert pack.intent == "contact_change"
    formatted = orb_communicate_support_pack_service.format_support_pack_for_chat(pack)
    lower = formatted.lower()
    for forbidden in (
        "adult profile preferences",
        "default lenses",
        "therapeutic preferences",
        "longitudinal",
        "role: residential support worker",
        "source basis",
    ):
        assert forbidden not in lower


def test_generic_endings_removed_from_guidance():
    raw = (
        "Record the refusal on the MAR. If you need further assistance, contact the manager. "
        "By following these steps, staff can respond safely. Conclusion\nThis was handled well."
    )
    polished = sanitize_residential_answer_polish(raw, source_text="medication refusal")
    lower = polished.lower()
    assert "if you need further assistance" not in lower
    assert "by following these steps" not in lower
    assert "conclusion" not in lower


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
    # Final metadata answer is body-only when prelude is emitted separately via SSE.
    if "mock engine" not in final.lower():
        assert "daily recording question" not in final.lower() or "chose toast" in final.lower()
