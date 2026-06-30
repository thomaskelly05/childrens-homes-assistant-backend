"""Deterministic safeguarding fallbacks for ORB live-stream final answers — no new LLM egress."""

from __future__ import annotations

import re
from typing import Any

from services.orb_instant_first_lines_service import (
    _normalize_instant_prefix,
    is_answer_only_instant_lines,
    strip_duplicate_instant_prefix,
)
from services.orb_provider_user_answer_service import (
    ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE,
    is_mock_provider_leakage,
)
from services.orb_recording_output_contract_service import (
    has_recording_contract_sections,
    recording_contract_blocked_by_safeguarding,
)

C1_SELF_HARM_LIGATURE_RE = re.compile(
    r"\b(?:"
    r"wanted to die|want to die|self[- ]?harm|suicidal|suicide|ligature|tried to harm"
    r")\b",
    re.I,
)

C2_DISCLOSURE_RE = re.compile(
    r"\b(?:"
    r"disclosed|disclosure|hurt them|hurt me|abused|abuse|allegation"
    r")\b",
    re.I,
)

_MIN_SUBSTANTIVE_SAFEGUARDING_LEN = 220

_GUARDED_STREAM_PRELUDE_MARKERS: tuple[str, ...] = (
    "this may involve immediate safety",
    "prepare the full response",
    "keep a clear record while i prepare",
    "inform the manager/on-call, and keep a clear record",
)

_GENERIC_SUPPORT_CLOSER_RE = re.compile(
    r"(?:"
    r"before you use this:|"
    r"i can also help turn your notes into|"
    r"turn your notes into an incident record|"
    r"turn your notes into a factual"
    r")",
    re.I,
)

_SUBSTANTIVE_SAFEGUARDING_MARKERS: tuple[str, ...] = (
    "manager",
    "on-call",
    "safeguarding",
    "procedure",
    "record",
    "chronology",
    "notified",
    "local policy",
    "professional judgement",
    "exact words",
    "child voice",
    "medical",
    "999",
    "111",
    "welfare",
    "supervision",
    "lado",
    "social worker",
    "placing authority",
)


def detect_safeguarding_stream_fallback_kind(message: str) -> str | None:
    """Return C1/C2 fallback kind when a deterministic safeguarding answer is required."""
    text = str(message or "").strip()
    if not text or not recording_contract_blocked_by_safeguarding(text):
        return None
    if C1_SELF_HARM_LIGATURE_RE.search(text):
        return "c1_self_harm_ligature"
    if C2_DISCLOSURE_RE.search(text):
        return "c2_disclosure"
    return "generic_safeguarding"


def requires_safeguarding_stream_fallback(message: str) -> bool:
    return detect_safeguarding_stream_fallback_kind(message) is not None


def collapse_repeated_instant_blocks(answer: str, instant_lines_text: str) -> str:
    """Remove consecutive repeated instant-line blocks from a streamed answer."""
    instant = (instant_lines_text or "").strip()
    result = (answer or "").strip()
    if not result or not instant:
        return result
    instant_norm = _normalize_instant_prefix(instant)
    previous = ""
    while result != previous:
        previous = result
        result = strip_duplicate_instant_prefix(result, instant)
        if is_answer_only_instant_lines(result, instant):
            return ""
        lines = result.splitlines()
        if not lines:
            break
        instant_line_count = max(1, len(instant.splitlines()))
        if len(lines) >= instant_line_count * 2:
            first_block = "\n".join(lines[:instant_line_count]).strip()
            second_block = "\n".join(lines[instant_line_count : instant_line_count * 2]).strip()
            if (
                _normalize_instant_prefix(first_block) == instant_norm
                and _normalize_instant_prefix(second_block) == instant_norm
            ):
                result = "\n".join(lines[instant_line_count * 2 :]).strip()
                continue
        break
    return result


def _marker_hits(answer_lower: str) -> int:
    return sum(1 for marker in _SUBSTANTIVE_SAFEGUARDING_MARKERS if marker in answer_lower)


def _strip_known_prelude_blocks(answer: str, *prelude_texts: str) -> str:
    """Remove guarded/instant prelude blocks from a final answer body."""
    result = (answer or "").strip()
    for prelude in prelude_texts:
        instant = (prelude or "").strip()
        if not instant:
            continue
        result = strip_duplicate_instant_prefix(result, instant)
        result = collapse_repeated_instant_blocks(result, instant)
    return result.strip()


def _strip_generic_support_closer_blocks(answer: str) -> str:
    """Remove frontend-style support chip wording from a safeguarding answer body."""
    text = (answer or "").strip()
    if not text:
        return text
    parts = _GENERIC_SUPPORT_CLOSER_RE.split(text, maxsplit=1)
    if len(parts) > 1:
        return parts[0].rstrip(" -\n")
    lines = [line for line in text.splitlines() if not _GENERIC_SUPPORT_CLOSER_RE.search(line)]
    return "\n".join(lines).strip()


def is_guarded_prelude_or_support_only_answer(
    answer: str,
    *,
    message: str,
    instant_lines_text: str = "",
    stream_prelude_text: str = "",
) -> bool:
    """True when visible content is only guarded prelude and/or generic support wording."""
    if not requires_safeguarding_stream_fallback(message):
        return False
    cleaned = _strip_generic_support_closer_blocks(
        _strip_known_prelude_blocks(answer, instant_lines_text, stream_prelude_text)
    )
    if not cleaned:
        return True
    lower = cleaned.lower()
    if len(cleaned) < 120:
        return _marker_hits(lower) < 2
    prelude_hits = sum(1 for marker in _GUARDED_STREAM_PRELUDE_MARKERS if marker in lower)
    if prelude_hits >= 2 and _marker_hits(lower) < 3:
        return True
    if _GENERIC_SUPPORT_CLOSER_RE.search(answer or "") and _marker_hits(lower) < 3:
        return True
    return False


def is_safeguarding_answer_too_thin(
    answer: str,
    *,
    message: str,
    instant_lines_text: str = "",
    stream_prelude_text: str = "",
) -> bool:
    """True when a high-risk prompt must not ship with only prelude/thin provider text."""
    if not requires_safeguarding_stream_fallback(message):
        return False

    cleaned = _strip_generic_support_closer_blocks(
        _strip_known_prelude_blocks((answer or "").strip(), instant_lines_text, stream_prelude_text)
    )
    if not cleaned:
        return True
    if is_guarded_prelude_or_support_only_answer(
        answer,
        message=message,
        instant_lines_text=instant_lines_text,
        stream_prelude_text=stream_prelude_text,
    ):
        return True
    if is_answer_only_instant_lines(cleaned, instant_lines_text):
        return True
    if cleaned.strip() == ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE:
        return True
    if is_mock_provider_leakage(cleaned):
        return True
    if has_recording_contract_sections(cleaned):
        return False

    lower = cleaned.lower()
    if len(cleaned) < _MIN_SUBSTANTIVE_SAFEGUARDING_LEN:
        return _marker_hits(lower) < 3
    if _marker_hits(lower) < 2:
        return True
    return False


def _build_c1_self_harm_ligature_fallback(message: str) -> str:
    from services.orb_internal_brain_fallbacks import build_structured_fallback_answer

    deterministic = (
        "Immediate safety and constant supervision remain the priority. "
        "The ligature was removed and the area/object was made safe. "
        "Staff stayed with the young person, completed an immediate welfare check, "
        "and notified the manager/on-call while following the home's safeguarding procedure. "
        "Seek medical advice, NHS 111 or 999 according to presentation, injuries and local policy — "
        "ORB cannot decide clinical urgency. "
        "Offer calm adult presence and emotional support without blame or diagnosis. "
        "Record the young person's exact words where known, keep observation separate from interpretation, "
        "and write a factual chronology of immediate actions and notifications. "
        "Notify placing authority/social worker and other partners according to local policy. "
        "Review the risk/support plan, plan debrief and follow-up support for the young person and staff, "
        "and apply professional judgement alongside local procedures."
    )
    return build_structured_fallback_answer(
        category="self-harm",
        adversarial_flags=[],
        orb_mode="Safeguarding Thinking",
        deterministic_answer=deterministic,
        local_policy_caveats=[],
        regulatory_anchors=[],
        data_protection_warnings=[],
        extra_child_voice=[
            "Record the young person's exact words where known — do not invent quotes.",
            "Note presentation, supervision level and what reassurance helped.",
        ],
    )


def _build_c2_disclosure_fallback(message: str) -> str:
    from services.orb_internal_brain_fallbacks import build_structured_fallback_answer

    deterministic = (
        "Listen calmly and reassure the young person they did the right thing by telling someone. "
        "Do not promise confidentiality beyond what your safeguarding policy allows. "
        "Record the young person's exact words where possible and preserve original records. "
        "Notify the manager/safeguarding lead immediately and follow the home's local safeguarding procedure. "
        "Consider LADO referral only where the allegation pathway against staff or volunteers may apply — "
        "ORB cannot decide threshold. "
        "Notify placing authority/social worker according to local policy. "
        "Do not investigate beyond your role, do not contact the alleged adult inappropriately, "
        "and do not give legal advice. "
        "Use factual, non-judgemental language and keep observation separate from interpretation."
    )
    return build_structured_fallback_answer(
        category="do-not-report",
        adversarial_flags=[],
        orb_mode="Safeguarding Thinking",
        deterministic_answer=deterministic,
        local_policy_caveats=[],
        regulatory_anchors=[],
        data_protection_warnings=[],
        extra_child_voice=[
            "Record the young person's exact words where known — do not invent quotes.",
            "Capture wishes, feelings and what support they need now.",
        ],
    )


def build_safeguarding_stream_fallback(
    message: str,
    *,
    kind: str | None = None,
) -> str:
    """Build a deterministic safeguarding answer for stream finalisation."""
    resolved = kind or detect_safeguarding_stream_fallback_kind(message)
    if resolved == "c1_self_harm_ligature":
        return _build_c1_self_harm_ligature_fallback(message)
    if resolved == "c2_disclosure":
        return _build_c2_disclosure_fallback(message)

    from services.orb_high_risk_required_safeguards import build_high_risk_deterministic_fallback

    generic = build_high_risk_deterministic_fallback("self-harm", scaffold=None)
    if generic:
        return generic
    return _build_c1_self_harm_ligature_fallback(message)


def apply_safeguarding_stream_fallback(
    answer: str,
    *,
    message: str,
    instant_lines_text: str = "",
    stream_prelude_text: str = "",
) -> tuple[str, dict[str, Any]]:
    """Replace thin/empty safeguarding stream answers with deterministic fallback text."""
    meta: dict[str, Any] = {
        "safeguarding_stream_fallback_checked": bool(requires_safeguarding_stream_fallback(message)),
        "safeguarding_stream_fallback_applied": False,
        "safeguarding_stream_fallback_kind": None,
    }
    if not meta["safeguarding_stream_fallback_checked"]:
        return answer, meta

    cleaned = _strip_generic_support_closer_blocks(
        _strip_known_prelude_blocks((answer or "").strip(), instant_lines_text, stream_prelude_text)
    )
    if not is_safeguarding_answer_too_thin(
        cleaned,
        message=message,
        instant_lines_text=instant_lines_text,
        stream_prelude_text=stream_prelude_text,
    ):
        return cleaned or answer, meta

    kind = detect_safeguarding_stream_fallback_kind(message)
    fallback = build_safeguarding_stream_fallback(message, kind=kind)
    meta.update(
        {
            "safeguarding_stream_fallback_applied": True,
            "safeguarding_stream_fallback_kind": kind,
            "safeguarding_stream_fallback_reason": "thin_or_instant_only_provider_output",
        }
    )
    return fallback, meta


def persist_safeguarding_stream_final_answer(
    answer: str,
    *,
    message: str,
    instant_lines_text: str = "",
    stream_prelude_text: str = "",
) -> tuple[str, dict[str, Any]]:
    """Final stream persistence guard — never ship guarded prelude/support-only as final answer."""
    if not requires_safeguarding_stream_fallback(message):
        return answer, {
            "safeguarding_stream_final_persist_checked": False,
            "safeguarding_stream_final_persist_applied": False,
        }

    body = _strip_generic_support_closer_blocks(
        _strip_known_prelude_blocks((answer or "").strip(), instant_lines_text, stream_prelude_text)
    )
    fallback_answer, fallback_meta = apply_safeguarding_stream_fallback(
        body,
        message=message,
        instant_lines_text=instant_lines_text,
        stream_prelude_text=stream_prelude_text,
    )
    meta = {
        "safeguarding_stream_final_persist_checked": True,
        "safeguarding_stream_final_persist_applied": bool(
            fallback_meta.get("safeguarding_stream_fallback_applied")
        ),
        "safeguarding_stream_final_persist_reason": (
            "guarded_prelude_or_support_only"
            if is_guarded_prelude_or_support_only_answer(
                answer,
                message=message,
                instant_lines_text=instant_lines_text,
                stream_prelude_text=stream_prelude_text,
            )
            else None
        ),
    }
    meta.update(fallback_meta)
    return fallback_answer, meta


__all__ = [
    "apply_safeguarding_stream_fallback",
    "build_safeguarding_stream_fallback",
    "collapse_repeated_instant_blocks",
    "detect_safeguarding_stream_fallback_kind",
    "is_guarded_prelude_or_support_only_answer",
    "is_safeguarding_answer_too_thin",
    "persist_safeguarding_stream_final_answer",
    "requires_safeguarding_stream_fallback",
]
