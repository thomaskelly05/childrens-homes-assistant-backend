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
            r"missing.*(cannabis|smell|drugs|substance)|cannabis.*missing|"
            r"returned\s+(?:from|after)\s+missing",
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
    (
        re.compile(
            r"(support\s+plan|child[- ]friendly\s+plan).*(template|widgets?|aac|gdd|"
            r"dreams?|aspirations?)|"
            r"(template|give\s+me).*(support\s+plan|child[- ]friendly)",
            re.I,
        ),
        "I'll draft a child-friendly support plan you can adapt — with communication widgets/AAC at the centre.",
    ),
    (
        re.compile(
            r"\btemplate\b.*(handover|daily|incident|keywork|record)|"
            r"give\s+me\s+a\s+template",
            re.I,
        ),
        "I'll build a clear template with editable sections you can complete straight away.",
    ),
]

_SAFEGUARDING_DEFAULT_OPENING = (
    "First, check immediate safety and follow your local safeguarding procedure. "
    "I'm preparing the full steps now."
)

# Deprecated generic residential opener — must never appear in final answers.
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

# Generic openings that must be stripped from final answers once model content arrives.
_REPLACEABLE_GENERIC_OPENINGS: frozenset[str] = frozenset(
    {
        _SAFEGUARDING_DEFAULT_OPENING,
        _RESIDENTIAL_DEEP_DEFAULT_OPENING,
    }
)

# Task-specific openings that should be removed once the authoritative model answer arrives.
_TASK_SPECIFIC_REPLACEABLE_OPENINGS: frozenset[str] = frozenset(
    {opening for _, opening in _SCENARIO_OPENINGS}
)

# Known bad joins when streamed tokens concatenate opening to the next heading.
_JOINED_OPENING_BUG_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"(on the way\.)(Immediate)", re.I),
    re.compile(r"(provided\.)(Immediate)", re.I),
    re.compile(r"(on the way\.)(###)", re.I),
    re.compile(r"(provided\.)(###)", re.I),
    re.compile(r"(on the way\.)(First,)", re.I),
    re.compile(r"(provided\.)(First,)", re.I),
    re.compile(r"(centre\.)(#)", re.I),
    re.compile(r"(away\.)(#)", re.I),
)

_MIN_SUBSTANTIAL_MODEL_LEN = 40

_STREAMING_ARTIFACT_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(re.escape(_RESIDENTIAL_DEEP_DEFAULT_OPENING), re.I),
    re.compile(r"the full guidance is on the way\.?", re.I),
    re.compile(r"start with what is safest and most practical right now\.?", re.I),
    re.compile(r"i'm preparing the full steps now\.?", re.I),
)


def ensure_fast_opening_spacing(text: str, *, fast_opening: str | None = None) -> str:
    """Ensure paragraph break between fast opening and the rest of the answer."""
    cleaned = (text or "").strip()
    if not cleaned:
        return cleaned

    for pattern in _JOINED_OPENING_BUG_PATTERNS:
        cleaned = pattern.sub(r"\1\n\n\2", cleaned)

    opening = (fast_opening or "").strip()
    if opening and cleaned.startswith(opening) and len(cleaned) > len(opening):
        remainder = cleaned[len(opening) :]
        if remainder and not remainder[0].isspace():
            cleaned = f"{opening}\n\n{remainder.lstrip()}"

    return cleaned


def _is_non_risk_prompt(message: str) -> bool:
    """True when the prompt is a template/plan/recording task without safeguarding risk."""
    lower = (message or "").lower()
    risk_markers = (
        "suicid",
        "self-harm",
        "self harm",
        "abuse",
        "allegation",
        "missing from",
        "returned after missing",
        "exploitation",
        "weapon",
        "lado",
        "forced removal",
        "hurt myself",
        "blade",
        "overdose",
    )
    if any(marker in lower for marker in risk_markers):
        return False
    plan_template_markers = (
        "template",
        "support plan",
        "child-friendly plan",
        "give me a plan",
        "widgets",
        "aac",
        "dreams",
        "aspirations",
        "handover note",
        "daily record",
    )
    return any(marker in lower for marker in plan_template_markers)


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

    # Non-risk template/plan prompts must not receive generic safety-biased fast openings.
    if _is_non_risk_prompt(text):
        return None

    # Generic residential deep opening removed — no safety-biased filler for ordinary residential depth.
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


def _strip_opening_prefix(text: str, opening: str) -> str:
    cleaned = (text or "").strip()
    if not opening or not cleaned:
        return cleaned
    if cleaned.startswith(opening):
        return cleaned[len(opening) :].lstrip(" \n\t-—")
    return cleaned


def strip_streaming_artifacts_from_answer(
    answer: str,
    *,
    fast_opening: str | None = None,
) -> str:
    """Remove status/fast-opening leakage and duplicate generic openers from final answers."""
    cleaned = ensure_fast_opening_spacing((answer or "").strip(), fast_opening=fast_opening)
    opening = (fast_opening or "").strip()

    if opening and cleaned.startswith(opening):
        remainder = _strip_opening_prefix(cleaned, opening)
        if len(remainder) >= _MIN_SUBSTANTIAL_MODEL_LEN:
            cleaned = remainder

    for pattern in _STREAMING_ARTIFACT_PATTERNS:
        cleaned = pattern.sub("", cleaned).strip()

    for generic in _REPLACEABLE_GENERIC_OPENINGS:
        if generic in cleaned:
            without = cleaned.replace(generic, "").strip(" \n\t-—")
            if len(without) >= _MIN_SUBSTANTIAL_MODEL_LEN:
                cleaned = without

    if opening in _TASK_SPECIFIC_REPLACEABLE_OPENINGS and opening in cleaned:
        without = _strip_opening_prefix(cleaned, opening)
        if len(without) >= _MIN_SUBSTANTIAL_MODEL_LEN:
            cleaned = without

    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned


def merge_stream_answer(
    *,
    fast_opening: str | None,
    model_answer: str,
    streamed_text: str,
) -> str:
    """Merge fast opening with the authoritative model answer without leaking status text."""
    model = ensure_fast_opening_spacing((model_answer or "").strip(), fast_opening=fast_opening)
    streamed = ensure_fast_opening_spacing((streamed_text or "").strip(), fast_opening=fast_opening)
    opening = (fast_opening or "").strip()

    if not opening:
        return strip_streaming_artifacts_from_answer(model or streamed)

    if model:
        if model.startswith(opening):
            merged = ensure_fast_opening_spacing(model, fast_opening=opening)
        elif opening in _REPLACEABLE_GENERIC_OPENINGS or opening in _TASK_SPECIFIC_REPLACEABLE_OPENINGS:
            merged = model if len(model) >= _MIN_SUBSTANTIAL_MODEL_LEN else ensure_fast_opening_spacing(
                f"{opening}\n\n{model}", fast_opening=opening
            )
        elif streamed and len(streamed) > len(model) and streamed.startswith(opening):
            merged = ensure_fast_opening_spacing(streamed, fast_opening=opening)
        else:
            merged = ensure_fast_opening_spacing(f"{opening}\n\n{model}", fast_opening=opening)
        return strip_streaming_artifacts_from_answer(merged, fast_opening=opening)

    if streamed:
        return strip_streaming_artifacts_from_answer(
            ensure_fast_opening_spacing(streamed, fast_opening=opening),
            fast_opening=opening,
        )

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
