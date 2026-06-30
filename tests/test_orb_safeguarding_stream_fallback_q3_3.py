"""Q3.3 — safeguarding live-stream fallback and duplicate instant-line prevention."""

from __future__ import annotations

import re

import pytest

from services.orb_instant_first_lines_service import (
    detect_playbook_category,
    instant_first_lines_for_message,
    merge_instant_lines_with_answer,
    should_skip_instant_lines,
    strip_duplicate_instant_prefix,
)
from services.orb_recording_output_contract_service import has_recording_contract_sections
from services.orb_safeguarding_stream_fallback_service import (
    apply_safeguarding_stream_fallback,
    build_safeguarding_stream_fallback,
    collapse_repeated_instant_blocks,
    detect_safeguarding_stream_fallback_kind,
    is_safeguarding_answer_too_thin,
)

C1_SELF_HARM_LIGATURE_PROMPT = (
    "A young person said they wanted to die and tried to harm themselves using a ligature. "
    "Staff removed the ligature, stayed with them, called the manager and followed the "
    "home's safeguarding procedure. Help me write an incident reflection with escalation."
)

C2_DISCLOSURE_PROMPT = (
    "A young person disclosed that an adult hurt them during contact. "
    "Help me write a safe incident reflection and what staff should do next."
)

INCIDENT_INSTANT = (
    "I'm treating this as incident recording.\n"
    "Start with immediate safety, factual chronology, child voice, staff response, and notifications."
)


def _assert_no_q1_template(answer: str) -> None:
    assert not has_recording_contract_sections(answer)
    assert "draft record" not in answer.lower()


def test_c1_detects_self_harm_category_before_incident_recording():
    category = detect_playbook_category(C1_SELF_HARM_LIGATURE_PROMPT)
    assert category == "self_harm_suicide"


def test_c1_skips_instant_lines_for_safeguarding_prompt():
    result = instant_first_lines_for_message(C1_SELF_HARM_LIGATURE_PROMPT)
    assert result.category_id == "self_harm_suicide"
    assert should_skip_instant_lines(
        expert_depth="safeguarding_critical",
        guarded_stream_delivery=False,
        category_id=result.category_id,
        message=C1_SELF_HARM_LIGATURE_PROMPT,
    )


def test_c1_stream_fallback_is_substantive():
    fallback = build_safeguarding_stream_fallback(C1_SELF_HARM_LIGATURE_PROMPT)
    lower = fallback.lower()
    _assert_no_q1_template(fallback)
    assert detect_safeguarding_stream_fallback_kind(C1_SELF_HARM_LIGATURE_PROMPT) == "c1_self_harm_ligature"
    assert "supervision" in lower or "stay" in lower
    assert "ligature" in lower or "made safe" in lower
    assert "manager" in lower or "on-call" in lower
    assert "safeguarding" in lower
    assert "procedure" in lower
    assert "medical" in lower or "999" in lower or "111" in lower
    assert "exact words" in lower
    assert "chronology" in lower or "factual" in lower
    assert "risk" in lower and "plan" in lower
    assert "local policy" in lower or "professional judgement" in lower
    assert "diagnos" not in lower or "cannot" in lower
    assert "young person is safe" not in lower
    assert "minimise" not in lower


def test_c1_applies_fallback_when_only_instant_line():
    duplicated = f"{INCIDENT_INSTANT}\n\n{INCIDENT_INSTANT}"
    answer, meta = apply_safeguarding_stream_fallback(
        duplicated,
        message=C1_SELF_HARM_LIGATURE_PROMPT,
        instant_lines_text=INCIDENT_INSTANT,
    )
    assert meta["safeguarding_stream_fallback_applied"] is True
    _assert_no_q1_template(answer)
    assert answer.lower().count("i'm treating this as incident recording") == 0
    assert "safeguarding" in answer.lower()
    assert len(answer) > 400


def test_c1_applies_fallback_when_provider_output_empty():
    answer, meta = apply_safeguarding_stream_fallback(
        "",
        message=C1_SELF_HARM_LIGATURE_PROMPT,
        instant_lines_text="",
    )
    assert meta["safeguarding_stream_fallback_applied"] is True
    assert "ligature" in answer.lower() or "self-harm" in answer.lower()


def test_c2_disclosure_fallback_is_substantive():
    fallback = build_safeguarding_stream_fallback(C2_DISCLOSURE_PROMPT)
    lower = fallback.lower()
    _assert_no_q1_template(fallback)
    assert detect_safeguarding_stream_fallback_kind(C2_DISCLOSURE_PROMPT) == "c2_disclosure"
    assert "exact words" in lower
    assert "manager" in lower or "safeguarding lead" in lower
    assert "safeguarding" in lower and "procedure" in lower
    assert "lado" in lower
    assert "placing authority" in lower or "social worker" in lower
    assert "preserve" in lower and "record" in lower
    assert "do not investigate" in lower or "beyond your role" in lower
    assert "legal advice" in lower
    assert "threshold" in lower or "cannot decide" in lower


def test_c2_applies_fallback_when_answer_thin():
    thin = "Start with immediate safety and notify the manager."
    assert is_safeguarding_answer_too_thin(thin, message=C2_DISCLOSURE_PROMPT)
    answer, meta = apply_safeguarding_stream_fallback(thin, message=C2_DISCLOSURE_PROMPT)
    assert meta["safeguarding_stream_fallback_applied"] is True
    _assert_no_q1_template(answer)
    assert "exact words" in answer.lower()


def test_duplicate_instant_line_collapse_and_merge():
    duplicated = f"{INCIDENT_INSTANT}\n\n{INCIDENT_INSTANT}"
    collapsed = collapse_repeated_instant_blocks(duplicated, INCIDENT_INSTANT)
    assert collapsed == ""
    stripped = strip_duplicate_instant_prefix(duplicated, INCIDENT_INSTANT)
    merged = merge_instant_lines_with_answer(instant_lines=INCIDENT_INSTANT, full_answer=stripped)
    assert merged.lower().count("i'm treating this as incident recording") == 1


def test_stream_route_wires_safeguarding_fallback():
    from pathlib import Path

    source = Path("routers/orb_standalone_routes.py").read_text(encoding="utf-8")
    assert "apply_safeguarding_stream_fallback" in source
    assert "collapse_repeated_instant_blocks" in source
