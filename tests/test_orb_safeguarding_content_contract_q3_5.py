"""Q3.5 — C1/C2 safeguarding content contract for live stream outputs."""

from __future__ import annotations

from services.orb_instant_first_lines_service import _GUARDED_SAFE_ESCALATION_LINES
from services.orb_recording_output_contract_service import (
    has_recording_contract_sections,
    try_build_recording_contract_answer,
)
from services.orb_safeguarding_content_contract_service import (
    detect_safeguarding_content_contract_issues,
    enforce_safeguarding_content_contract,
    violates_safeguarding_content_contract,
)
from services.orb_safeguarding_stream_fallback_service import (
    build_safeguarding_stream_fallback,
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
GUARDED_PRELUDE = "\n".join(_GUARDED_SAFE_ESCALATION_LINES)


def _assert_c1_contract(answer: str) -> None:
    lower = answer.lower()
    assert "supervision" in lower or "immediate safety" in lower
    assert "ligature" in lower or "made safe" in lower
    assert "welfare" in lower
    assert "manager" in lower or "on-call" in lower
    assert "safeguarding" in lower
    assert "medical" in lower or "999" in lower or "111" in lower
    assert "exact words" in lower
    assert "chronology" in lower or "factual" in lower
    assert "observation" in lower and "interpretation" in lower
    assert "draft record" not in lower
    assert "prepare the full response" not in lower


def _assert_c2_contract(answer: str) -> None:
    lower = answer.lower()
    assert "listen" in lower or "reassure" in lower
    assert "exact words" in lower
    assert "manager" in lower or "safeguarding lead" in lower
    assert "lado" in lower
    assert "do not investigate beyond" in lower
    assert "draft record" not in lower


def test_c1_broken_quote_fragment_is_replaced():
    unsafe = (
        "Staff stayed with the young person after removing a ligature, "
        'using a ligature, " This captures their voice and highlights the seriousness of their feelings.'
    )
    assert violates_safeguarding_content_contract(unsafe, message=C1)
    final, meta = persist_safeguarding_stream_final_answer(unsafe, message=C1)
    assert meta.get("safeguarding_content_contract_applied") or meta.get(
        "safeguarding_stream_fallback_applied"
    )
    assert ', " This captures' not in final
    _assert_c1_contract(final)


def test_c1_guarded_prelude_without_medical_markers_is_replaced():
    unsafe = (
        f"{GUARDED_PRELUDE}\n\n"
        "Staff removed the ligature and stayed with the young person. "
        "The manager was informed and safeguarding procedure followed. "
        "Record what happened in chronological order."
    )
    issues = detect_safeguarding_content_contract_issues(unsafe, message=C1)
    assert "guarded_prelude_in_final_body" in issues or "missing_c1_contract_markers" in issues
    final, meta = persist_safeguarding_stream_final_answer(
        unsafe, message=C1, stream_prelude_text=GUARDED_PRELUDE
    )
    assert meta.get("safeguarding_stream_fallback_applied") or meta.get(
        "safeguarding_content_contract_applied"
    )
    assert "prepare the full response" not in final.lower()
    _assert_c1_contract(final)


def test_c1_overclaiming_safety_is_replaced():
    unsafe = (
        "The young person is safe now after staff removed the ligature. "
        "Manager was called and safeguarding procedure followed. "
        "Record a chronology and notify partners according to local policy."
    )
    assert "overclaiming_safety" in detect_safeguarding_content_contract_issues(unsafe, message=C1)
    final, _ = enforce_safeguarding_content_contract(unsafe, message=C1)
    assert "safe now" not in final.lower()
    _assert_c1_contract(final)


def test_c2_invented_example_quote_is_replaced():
    unsafe = (
        'For example, if the young person says, "I felt scared when they touched me," document this accurately. '
        "Notify the manager and follow safeguarding procedure."
    )
    issues = detect_safeguarding_content_contract_issues(unsafe, message=C2)
    assert "invented_example_child_quote" in issues
    final, meta = persist_safeguarding_stream_final_answer(unsafe, message=C2)
    assert meta.get("safeguarding_stream_fallback_applied") or meta.get(
        "safeguarding_content_contract_applied"
    )
    assert "I felt scared" not in final
    assert "for example, if the young person says" not in final.lower()
    _assert_c2_contract(final)


def test_c2_unsafe_investigation_wording_is_replaced():
    unsafe = (
        "Listen calmly and record what was said. Notify the manager and safeguarding lead, "
        "including any necessary investigations, and preserve records."
    )
    assert "unsafe_investigation_wording" in detect_safeguarding_content_contract_issues(
        unsafe, message=C2
    )
    final, _ = enforce_safeguarding_content_contract(unsafe, message=C2)
    assert "any necessary investigations" not in final.lower()
    assert "do not investigate beyond" in final.lower()


def test_c2_overclaiming_safety_is_replaced():
    unsafe = (
        "They are safe now after the disclosure. Record exact words and notify the manager."
    )
    final, meta = enforce_safeguarding_content_contract(unsafe, message=C2)
    assert meta.get("safeguarding_content_contract_applied")
    assert "they are safe now" not in final.lower()
    _assert_c2_contract(final)


def test_c1_good_provider_answer_still_preserved():
    good = build_safeguarding_stream_fallback(C1)
    final, meta = persist_safeguarding_stream_final_answer(good, message=C1)
    assert not meta.get("safeguarding_content_contract_applied")
    assert not meta.get("safeguarding_stream_fallback_applied")
    _assert_c1_contract(final)


def test_q1_daily_record_unaffected_by_content_contract():
    a1 = try_build_recording_contract_answer(A1)
    assert a1 and has_recording_contract_sections(a1)
    issues = detect_safeguarding_content_contract_issues(a1 or "", message=A1)
    assert issues == []
    final, meta = persist_safeguarding_stream_final_answer(a1 or "", message=A1)
    assert final == a1
    assert meta.get("safeguarding_content_contract_checked") is not True


def test_active_missing_unaffected_by_content_contract():
    from services.orb_execution_policy_service import deterministic_answer_for_missing_contract

    missing = deterministic_answer_for_missing_contract(C3) or ""
    issues = detect_safeguarding_content_contract_issues(missing, message=C3)
    assert issues == []
