"""Safe, practical fast openings for ORB streaming (perceived speed without shallow answers)."""

from __future__ import annotations

import re
from typing import Pattern

# Conservative openings — full answer still streams with full depth after this.
_SCENARIO_OPENINGS: list[tuple[Pattern[str], str]] = [
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

    if depth in {"residential_deep", "residential_standard"}:
        return _RESIDENTIAL_DEEP_DEFAULT_OPENING

    return None


def safeguarding_opening_token() -> str | None:
    """Backward-compatible alias for safeguarding-critical default opening."""
    return _SAFEGUARDING_DEFAULT_OPENING
