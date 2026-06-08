"""Safe, practical fast openings for ORB streaming (perceived speed without shallow answers)."""

from __future__ import annotations

import re
from typing import Pattern

# Conservative openings — full answer still streams with full depth after this.
_SCENARIO_OPENINGS: list[tuple[Pattern[str], str]] = [
    (
        re.compile(
            r"(help me (to )?write|draft|write).*(incident report|incident record)",
            re.I,
        ),
        "I can help you structure this incident report. I'll only use what you've provided "
        "and I'll flag what needs adding before it is finalised — checking immediate safety first.",
    ),
    (
        re.compile(
            r"\b(kicked off|kicking off|played up)\b.*(family time|family contact|contact)|"
            r"(family time|family contact).*\b(kicked off|kicking off|played up)\b",
            re.I,
        ),
        "I can help you record this safely. I'll treat shorthand behaviour wording as something to clarify "
        "into observable facts — and I'll only use what you've provided.",
    ),
    (
        re.compile(
            r"(don'?t|doesn'?t|do not)\s+care|i don'?t care|says she doesn'?t care|keeps saying",
            re.I,
        ),
        "Treat this as communication, not attitude. Start by checking what has changed around them "
        "and use a calm one-to-one moment.",
    ),
    (
        re.compile(
            r"missing.*(cannabis|smell|drugs|substance)|cannabis.*missing|returned after missing",
            re.I,
        ),
        "First, make sure they are physically safe and approach them calmly. "
        "Do not start with blame or interrogation.",
    ),
    (
        re.compile(r"\ballegation\b|disclosed abuse|told me that.*hurt", re.I),
        "Listen calmly, reassure them they have done the right thing, and do not promise secrecy.",
    ),
    (
        re.compile(r"self[- ]?harm|cutting|overdose|suicidal", re.I),
        "First, check immediate physical safety and whether medical help is needed.",
    ),
    (
        re.compile(r"\brestraint\b|physical intervention|hold\b", re.I),
        "First, check everyone is safe and record why the intervention was necessary and proportionate.",
    ),
    (
        re.compile(r"missing from care|absent|awol|late return|whereabouts", re.I),
        "First, confirm they are safe and follow your missing-from-care procedure. "
        "Approach calmly when they return.",
    ),
]

_SAFEGUARDING_DEFAULT_OPENING = (
    "First, check immediate safety and follow your local safeguarding procedure. "
    "I'm preparing the full steps now."
)

_RESIDENTIAL_DEEP_DEFAULT_OPENING = (
    "Start with what is safest and most practical right now — the full guidance is on the way."
)

_ALL_PLACEHOLDER_OPENINGS: frozenset[str] = frozenset(
    {
        _SAFEGUARDING_DEFAULT_OPENING,
        _RESIDENTIAL_DEEP_DEFAULT_OPENING,
        *(opening for _, opening in _SCENARIO_OPENINGS),
    }
)

STREAM_INCOMPLETE_FALLBACK_MESSAGE = (
    "ORB could not finish generating the full answer after the opening preview. "
    "Your question is still here — please try again, or ask ORB to draft the incident report step by step."
)


def fast_opening_for_message(
    message: str,
    *,
    expert_depth: str,
    mode: str | None = None,
) -> str | None:
    """Return a safe fast opening for streaming, or None for general/light paths."""
    depth = (expert_depth or "general_light").strip().lower()
    if depth == "general_light":
        return None

    text = (message or "").strip()
    mode_name = (mode or "").strip().lower()

    for pattern, opening in _SCENARIO_OPENINGS:
        if pattern.search(text):
            return opening

    if depth == "safeguarding_critical" or "safeguarding" in mode_name:
        return _SAFEGUARDING_DEFAULT_OPENING

    if depth in {"residential_deep", "residential_standard", "residential_light"}:
        return _RESIDENTIAL_DEEP_DEFAULT_OPENING

    return None


def is_fast_opening_placeholder(text: str) -> bool:
    """True when visible answer text is only a fast-opening placeholder."""
    cleaned = (text or "").strip()
    if not cleaned:
        return False
    if cleaned in _ALL_PLACEHOLDER_OPENINGS:
        return True
    for placeholder in _ALL_PLACEHOLDER_OPENINGS:
        if not cleaned.startswith(placeholder):
            continue
        remainder = cleaned[len(placeholder) :].strip(" \n\t-—")
        if not remainder or len(remainder) < 40:
            return True
    return False


def merge_stream_answer(
    *,
    fast_opening: str | None,
    model_answer: str,
    streamed_text: str,
) -> str:
    """Merge fast opening with the authoritative model answer without dropping either."""
    model = (model_answer or "").strip()
    streamed = (streamed_text or "").strip()
    opening = (fast_opening or "").strip()

    if not opening:
        return model or streamed

    if model:
        if model.startswith(opening):
            return model
        if streamed and len(streamed) > len(model) and streamed.startswith(opening):
            return streamed
        return f"{opening}\n\n{model}"

    if streamed:
        return streamed

    return opening


def is_fast_opening_only_answer(
    *,
    fast_opening: str | None,
    final_answer: str,
    model_token_count: int,
) -> bool:
    """Detect completion where only the fast opening reached the client."""
    if not (fast_opening or "").strip():
        return False
    if model_token_count > 0:
        return False
    return is_fast_opening_placeholder(final_answer)


def safeguarding_opening_token() -> str | None:
    """Backward-compatible alias for safeguarding-critical default opening."""
    return _SAFEGUARDING_DEFAULT_OPENING
