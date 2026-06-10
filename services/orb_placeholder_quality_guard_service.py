"""Universal placeholder quality guard for ORB final answers."""

from __future__ import annotations

import re
from typing import Any

# Bracketed placeholders ending with ellipsis (broken/truncated).
BROKEN_PLACEHOLDER_RE = re.compile(
    r"\[[^\]]*(?:…|\.\.\.)[^\]]*\]",
    re.IGNORECASE,
)

BRACKETED_PLACEHOLDER_RE = re.compile(r"\[([^\]]{3,200})\]", re.IGNORECASE)

# Generic AI intro lines to strip from final answers.
GENERIC_INTRO_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"^creating a child[- ]friendly support plan[^\n]*(?:\n+|(?=\s*\[))", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^here['']s a structured template[^\n]*(?:\n+|(?=\s*\[))", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^here is a structured template[^\n]*(?:\n+|(?=\s*\[))", re.IGNORECASE | re.MULTILINE),
    re.compile(
        r"^this (?:template|plan) (?:is|has been) (?:designed|tailored)[^\n]*(?:\n+|(?=\s*\[))",
        re.IGNORECASE | re.MULTILINE,
    ),
    re.compile(
        r"^tailored to (?:their|the young person['']s) individual needs[^\n]*(?:\n+|(?=\s*\[))",
        re.IGNORECASE | re.MULTILINE,
    ),
)

# Hint-based replacement for broken placeholders.
_PLACEHOLDER_HINTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"name|preferred", re.I), "[Add the young person's preferred name]"),
    (re.compile(r"intro|about|know about", re.I), "[Add what the young person wants adults to know]"),
    (re.compile(r"widget|symbol|aac|photo|communicat", re.I), "[Add the widget/symbol/photo the young person uses for this]"),
    (re.compile(r"dream|aspir", re.I), "[Add a dream or aspiration using my widget, symbol, photo or words]"),
    (re.compile(r"goal|future|learn|independ", re.I), "[Add what the young person is working towards]"),
    (re.compile(r"yes|no|stop|help|pain|worried|happy|upset|calm", re.I), "[Add how the young person shows this using their communication method]"),
    (re.compile(r"trigger|hard|difficult", re.I), "[Add what makes things hard for the young person]"),
    (re.compile(r"calm|safe|helps", re.I), "[Add what helps the young person feel calm and safe]"),
    (re.compile(r"review|date", re.I), "[Add review date]"),
    (re.compile(r"interest|like|sensory", re.I), "[Add my interests, favourite people, places, activities and sensory likes]"),
    (re.compile(r"dream|aspir", re.I), "[Add a dream or aspiration using my widget, symbol, photo or words]"),
    (re.compile(r"pain|discomfort|unwell|dis\b", re.I), "[Add how I show pain, discomfort or feeling unwell]"),
)

_DEFAULT_CLEAN_PLACEHOLDER = "[Add detail here]"


def clean_broken_placeholder(match: re.Match[str]) -> str:
    """Replace a broken/truncated bracketed placeholder with a clean one."""
    inner = match.group(0)
    for pattern, replacement in _PLACEHOLDER_HINTS:
        if pattern.search(inner):
            return replacement
    return _DEFAULT_CLEAN_PLACEHOLDER


def clean_placeholders(answer: str) -> tuple[str, list[str]]:
    """Remove broken ellipsis placeholders; return cleaned text and issues found."""
    text = answer or ""
    issues: list[str] = []
    for match in BROKEN_PLACEHOLDER_RE.finditer(text):
        issues.append(f"broken_placeholder:{match.group(0)[:60]}")
    cleaned = BROKEN_PLACEHOLDER_RE.sub(clean_broken_placeholder, text)
    return cleaned, issues


def strip_generic_intros(answer: str) -> str:
    """Remove generic AI opening lines from final answers."""
    cleaned = answer or ""
    for pattern in GENERIC_INTRO_PATTERNS:
        cleaned = pattern.sub("", cleaned)
    return cleaned.lstrip()


def sanitize_placeholders_in_answer(answer: str) -> tuple[str, list[str]]:
    """Full placeholder sanitisation: intros, broken placeholders, whitespace."""
    issues: list[str] = []
    cleaned = strip_generic_intros(answer)
    cleaned, placeholder_issues = clean_placeholders(cleaned)
    issues.extend(placeholder_issues)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned, issues


def find_placeholder_issues(answer: str) -> list[str]:
    """Return placeholder quality issues without mutating the answer."""
    _, issues = sanitize_placeholders_in_answer(answer)
    return issues


def has_broken_placeholders(answer: str) -> bool:
    return bool(BROKEN_PLACEHOLDER_RE.search(answer or ""))


orb_placeholder_quality_guard_service = type(
    "OrbPlaceholderQualityGuardService",
    (),
    {
        "BROKEN_PLACEHOLDER_RE": BROKEN_PLACEHOLDER_RE,
        "clean_placeholders": staticmethod(clean_placeholders),
        "strip_generic_intros": staticmethod(strip_generic_intros),
        "sanitize_placeholders_in_answer": staticmethod(sanitize_placeholders_in_answer),
        "find_placeholder_issues": staticmethod(find_placeholder_issues),
        "has_broken_placeholders": staticmethod(has_broken_placeholders),
    },
)()
