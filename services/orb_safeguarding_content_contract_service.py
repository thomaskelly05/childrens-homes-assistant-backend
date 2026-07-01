"""C1/C2 safeguarding content contract — detect unsafe provider wording without new LLM egress."""

from __future__ import annotations

import re
from typing import Any

from services.orb_safeguarding_stream_fallback_service import (
    detect_safeguarding_stream_fallback_kind,
    requires_safeguarding_stream_fallback,
)

_INVENTED_EXAMPLE_QUOTE_RE = re.compile(
    r"(?:"
    r"for example,?\s+if the young person says|"
    r"for example[^.\n]{0,120}\"[^\"]{8,}|"
    r"\"I felt scared"
    r")",
    re.I,
)

_BROKEN_QUOTE_FRAGMENT_RE = re.compile(
    r"(?:"
    r',\s*"\s*(?:This captures|This highlights|The young person)|'
    r"(?:ligature|disclos|hurt|abuse|harm|die)[^.]{0,80},\s*\"\s+[A-Z]"
    r")",
    re.I,
)

_UNSAFE_INVESTIGATION_RE = re.compile(
    r"\b(?:"
    r"any necessary investigations|"
    r"including any necessary investigations|"
    r"investigate what happened|"
    r"conduct(?:ing)?\s+(?:a\s+)?investigation(?:s)?\s+(?:into|of)\s+what"
    r")\b",
    re.I,
)

_DO_NOT_INVESTIGATE_BEYOND_RE = re.compile(r"do not investigate beyond", re.I)

_OVERCLAIM_SAFETY_RE = re.compile(
    r"\b(?:they are safe now|the young person is safe(?:\s+now)?|child is safe now)\b",
    re.I,
)

_GUARDED_PRELUDE_START_RE = re.compile(
    r"^\s*this may involve immediate safety",
    re.I,
)

_C1_REQUIRED_MARKER_GROUPS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("safety_supervision", ("supervision", "immediate safety", "constant supervision")),
    ("ligature_safe", ("ligature", "made safe")),
    ("welfare", ("welfare",)),
    ("manager", ("manager", "on-call")),
    ("procedure", ("safeguarding procedure", "safeguarding")),
    ("medical", ("medical", "999", "111", "nhs")),
    ("exact_words", ("exact words",)),
    ("chronology", ("chronology", "factual")),
    ("observation_interpretation", ("observation", "interpretation")),
    ("notifications", ("notified", "social worker", "placing authority", "local policy")),
    ("risk_plan", ("risk", "support plan")),
    ("follow_up", ("debrief", "follow-up", "follow up")),
    ("professional_judgement", ("professional judgement", "local procedures", "local procedure")),
)

_C2_REQUIRED_MARKER_GROUPS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("listen_reassure", ("listen", "reassure")),
    ("confidentiality", ("confidential", "confidentiality")),
    ("exact_words", ("exact words",)),
    ("manager_lead", ("manager", "safeguarding lead")),
    ("procedure", ("safeguarding procedure", "local safeguarding", "safeguarding")),
    ("lado", ("lado",)),
    ("notifications", ("social worker", "placing authority", "local policy")),
    ("preserve_records", ("preserve", "original record")),
    ("do_not_investigate", ("do not investigate beyond", "beyond your role")),
    ("no_contact_alleged", ("do not contact", "alleged adult")),
    ("no_legal_advice", ("legal advice",)),
    ("no_threshold", ("cannot decide threshold", "orb cannot decide")),
)


def _group_hits(lower: str, groups: tuple[tuple[str, tuple[str, ...]], ...]) -> tuple[int, list[str]]:
    missing: list[str] = []
    hits = 0
    for group_id, markers in groups:
        if any(marker in lower for marker in markers):
            hits += 1
        else:
            missing.append(group_id)
    return hits, missing


def detect_safeguarding_content_contract_issues(
    answer: str,
    *,
    message: str,
) -> list[str]:
    """Return violation codes when C1/C2 answer text is unsafe or contract-incomplete."""
    kind = detect_safeguarding_stream_fallback_kind(message)
    if not kind:
        return []

    text = (answer or "").strip()
    if not text:
        return ["empty_answer"]

    lower = text.lower()
    issues: list[str] = []

    if _GUARDED_PRELUDE_START_RE.search(text):
        issues.append("guarded_prelude_in_final_body")

    if _INVENTED_EXAMPLE_QUOTE_RE.search(text):
        issues.append("invented_example_child_quote")

    if _BROKEN_QUOTE_FRAGMENT_RE.search(text):
        issues.append("broken_quote_fragment")

    if _OVERCLAIM_SAFETY_RE.search(text):
        issues.append("overclaiming_safety")

    if _UNSAFE_INVESTIGATION_RE.search(text) and not _DO_NOT_INVESTIGATE_BEYOND_RE.search(text):
        issues.append("unsafe_investigation_wording")

    if has_recording_contract_draft(text):
        issues.append("q1_recording_contract_template")

    if kind == "c1_self_harm_ligature":
        hits, missing = _group_hits(lower, _C1_REQUIRED_MARKER_GROUPS)
        if hits < 9:
            issues.append("missing_c1_contract_markers")
            issues.extend(f"missing_marker:{item}" for item in missing[:5])
    elif kind == "c2_disclosure":
        hits, missing = _group_hits(lower, _C2_REQUIRED_MARKER_GROUPS)
        if hits < 8:
            issues.append("missing_c2_contract_markers")
            issues.extend(f"missing_marker:{item}" for item in missing[:5])

    return issues


def has_recording_contract_draft(answer: str) -> bool:
    lower = (answer or "").lower()
    return "draft record" in lower and (
        "what to add before sign-off" in lower or "why this wording is safer" in lower
    )


def violates_safeguarding_content_contract(
    answer: str,
    *,
    message: str,
) -> bool:
    return bool(detect_safeguarding_content_contract_issues(answer, message=message))


def enforce_safeguarding_content_contract(
    answer: str,
    *,
    message: str,
    instant_lines_text: str = "",
    stream_prelude_text: str = "",
) -> tuple[str, dict[str, Any]]:
    """Repair or replace unsafe/long-but-unsafe C1/C2 answers with deterministic fallback."""
    from services.orb_safeguarding_stream_fallback_service import (
        _strip_generic_support_closer_blocks,
        _strip_known_prelude_blocks,
        apply_safeguarding_stream_fallback,
        build_safeguarding_stream_fallback,
        detect_safeguarding_stream_fallback_kind,
        is_safeguarding_answer_too_thin,
    )

    meta: dict[str, Any] = {
        "safeguarding_content_contract_checked": bool(requires_safeguarding_stream_fallback(message)),
        "safeguarding_content_contract_applied": False,
        "safeguarding_content_contract_kind": detect_safeguarding_stream_fallback_kind(message),
        "safeguarding_content_contract_issues": [],
    }
    if not meta["safeguarding_content_contract_checked"]:
        return answer, meta

    stripped = _strip_generic_support_closer_blocks(
        _strip_known_prelude_blocks((answer or "").strip(), instant_lines_text, stream_prelude_text)
    )
    issues = detect_safeguarding_content_contract_issues(stripped, message=message)
    meta["safeguarding_content_contract_issues"] = issues

    too_thin = is_safeguarding_answer_too_thin(
        stripped,
        message=message,
        instant_lines_text=instant_lines_text,
        stream_prelude_text=stream_prelude_text,
    )
    if issues or too_thin:
        kind = detect_safeguarding_stream_fallback_kind(message)
        fallback = build_safeguarding_stream_fallback(message, kind=kind)
        meta.update(
            {
                "safeguarding_content_contract_applied": True,
                "safeguarding_content_contract_reason": (
                    "content_contract_violation" if issues else "thin_provider_output"
                ),
            }
        )
        return fallback, meta

    return stripped or answer, meta


__all__ = [
    "detect_safeguarding_content_contract_issues",
    "enforce_safeguarding_content_contract",
    "has_recording_contract_draft",
    "violates_safeguarding_content_contract",
]
