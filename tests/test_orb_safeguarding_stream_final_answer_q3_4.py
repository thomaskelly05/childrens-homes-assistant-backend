"""Q3.4 — safeguarding guarded-stream final answer persistence."""

from __future__ import annotations

from services.orb_critical_practice_answer_service import detect_critical_practice_family
from services.orb_execution_policy_service import (
    deterministic_answer_for_missing_contract,
    is_active_missing_from_care_prompt,
)
from services.orb_instant_first_lines_service import (
    _GUARDED_SAFE_ESCALATION_LINES,
    guarded_instant_lines_for_message,
    merge_instant_lines_with_answer,
    should_skip_instant_lines,
)
from services.orb_recording_output_contract_service import (
    has_recording_contract_sections,
    try_build_recording_contract_answer,
)
from services.orb_safeguarding_stream_fallback_service import (
    apply_safeguarding_stream_fallback,
    build_safeguarding_stream_fallback,
    is_guarded_prelude_or_support_only_answer,
    persist_safeguarding_stream_final_answer,
)

C1 = (
    "A young person said they wanted to die and tried to harm themselves using a ligature. "
    "Staff removed the ligature, stayed with them, called the manager and followed the "
    "home's safeguarding procedure. Help me write an incident reflection with escalation."
)
C2 = (
    "A young person disclosed that an adult hurt them during contact. "
    "Help me write a safe incident reflection and what staff should do next."
)
C3 = "A young person is missing from care right now. What should staff do?"
A1 = (
    "A young person became upset after contact and refused to join the evening meal. "
    "Staff gave them space, checked in calmly, and later supported them to talk about what had happened. "
    "Help me write this as a therapeutic, child-centred daily record."
)
A2 = (
    "A young person shouted at staff, pushed a chair over and went to their bedroom after being told "
    "they could not have extra screen time. Staff gave them space, checked they were safe, and later "
    "completed a restorative conversation. Help me write this as a safe, factual, therapeutic incident reflection."
)

GUARDED_PRELUDE = "\n".join(_GUARDED_SAFE_ESCALATION_LINES)
SUBSTANTIVE_C1 = build_safeguarding_stream_fallback(C1)
SUBSTANTIVE_C2 = build_safeguarding_stream_fallback(C2)

THIN_SUPPORT_TAIL = (
    "In reflecting on the incident where a young person expressed a desire to die and attempted to "
    "harm themselves using a ligature, I can also help turn your notes into an incident record, "
    "safeguarding reflection or handover note if useful."
)


def _assert_c1_markers(answer: str) -> None:
    lower = answer.lower()
    assert "ligature" in lower or "made safe" in lower
    assert "manager" in lower or "on-call" in lower
    assert "safeguarding" in lower
    assert "exact words" in lower
    assert "draft record" not in lower
    assert "prepare the full response" not in lower
    assert "turn your notes into" not in lower


def test_c1_guarded_prelude_streams_but_does_not_merge_into_final_answer():
    prelude = guarded_instant_lines_for_message(C1).text
    assert should_skip_instant_lines(
        expert_depth="safeguarding_critical",
        guarded_stream_delivery=True,
        message=C1,
    )
    merged = merge_instant_lines_with_answer(instant_lines=prelude, full_answer=SUBSTANTIVE_C1)
    assert merged.count("prepare the full response") == 1
    final, meta = persist_safeguarding_stream_final_answer(
        merged,
        message=C1,
        stream_prelude_text=prelude,
    )
    assert "prepare the full response" not in final.lower()
    _assert_c1_markers(final)
    assert meta.get("safeguarding_stream_final_persist_checked") is True


def test_c1_full_answer_not_overwritten_by_guarded_prelude_and_support_closer():
    bug_answer = f"{GUARDED_PRELUDE}\n\n{THIN_SUPPORT_TAIL}"
    assert is_guarded_prelude_or_support_only_answer(
        bug_answer,
        message=C1,
        stream_prelude_text=GUARDED_PRELUDE,
    )
    final, meta = persist_safeguarding_stream_final_answer(
        bug_answer,
        message=C1,
        stream_prelude_text=GUARDED_PRELUDE,
    )
    assert meta.get("safeguarding_stream_fallback_applied") is True
    _assert_c1_markers(final)
    assert "turn your notes into" not in final.lower()


def test_c1_thin_provider_output_falls_back_to_deterministic_answer():
    final, meta = persist_safeguarding_stream_final_answer(
        GUARDED_PRELUDE,
        message=C1,
        stream_prelude_text=GUARDED_PRELUDE,
    )
    assert meta.get("safeguarding_stream_fallback_applied") is True
    _assert_c1_markers(final)


def test_c1_good_provider_answer_is_preserved():
    good = (
        "Maintain constant supervision and keep the young person safe. The ligature was removed and made safe. "
        "Notify the manager/on-call and follow the home safeguarding procedure. Seek medical advice or 999/111 "
        "according to presentation and local policy. Record the young person's exact words where known. "
        "Write a factual chronology separating observation from interpretation. Review the risk/support plan."
    )
    final, meta = persist_safeguarding_stream_final_answer(
        good,
        message=C1,
        stream_prelude_text=GUARDED_PRELUDE,
    )
    assert meta.get("safeguarding_stream_fallback_applied") is not True
    assert "ligature" in final.lower()
    assert len(final) > 200


def test_c2_final_answer_persistence():
    bug_answer = (
        f"{GUARDED_PRELUDE}\n\n"
        "A young person disclosed harm during contact. "
        "I can also help turn your notes into an incident record if useful."
    )
    final, meta = persist_safeguarding_stream_final_answer(
        bug_answer,
        message=C2,
        stream_prelude_text=GUARDED_PRELUDE,
    )
    assert meta.get("safeguarding_stream_fallback_applied") is True
    lower = final.lower()
    assert "exact words" in lower
    assert "lado" in lower
    assert "draft record" not in lower
    assert "turn your notes into" not in lower


def test_q1_daily_and_incident_recording_unaffected():
    a1 = try_build_recording_contract_answer(A1)
    a2 = try_build_recording_contract_answer(A2)
    assert a1 and has_recording_contract_sections(a1)
    assert a2 and has_recording_contract_sections(a2)
    out1, meta1 = apply_safeguarding_stream_fallback(a1 or "", message=A1)
    out2, meta2 = apply_safeguarding_stream_fallback(a2 or "", message=A2)
    assert out1 == a1
    assert out2 == a2
    assert meta1.get("safeguarding_stream_fallback_checked") is False
    assert meta2.get("safeguarding_stream_fallback_checked") is False


def test_q2_natural_routing_unaffected():
    assert detect_critical_practice_family(
        "This is the fourth time this month staff have physically held the young person during distress."
    ) == "repeated_restraint_trend"
    assert detect_critical_practice_family(
        "A medication dose was given late this morning and the MAR shows the wrong timing."
    ) == "medication_error"
    assert detect_critical_practice_family(
        "Two staff gave different accounts of what happened during the incident."
    ) == "conflicting_staff_accounts"


def test_active_missing_unaffected_by_safeguarding_persist():
    assert is_active_missing_from_care_prompt(C3)
    missing_answer = deterministic_answer_for_missing_contract(C3)
    assert missing_answer
    lower = missing_answer.lower()
    assert "missing from care" in lower
    final, meta = persist_safeguarding_stream_final_answer(missing_answer, message=C3)
    assert meta.get("safeguarding_stream_final_persist_applied") is not True
    assert "self-harm" not in final.lower()[:300]


def test_stream_route_wires_final_persist_guard():
    from pathlib import Path

    source = Path("routers/orb_standalone_routes.py").read_text(encoding="utf-8")
    assert "persist_safeguarding_stream_final_answer" in source
    assert "stream_prelude_text" in source
    assert "skip_guarded_prelude_merge" in source
