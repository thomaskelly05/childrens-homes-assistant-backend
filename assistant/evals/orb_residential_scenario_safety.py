"""Safety and data validation for ORB Residential Quality Lab scenarios."""

from __future__ import annotations

import re
from typing import Any

# Generic labels allowed in synthetic scenarios.
ALLOWED_GENERIC_LABELS: frozenset[str] = frozenset(
    {
        "child a",
        "young person",
        "staff member",
        "registered manager",
        "social worker",
        "school",
        "family member",
        "placing authority",
        "the home",
        "guardian",
        "dsl",
        "manager",
        "camhs",
        "pep",
        "mash",
        "yp",
    }
)

# Common real-looking personal names (not exhaustive — catches frequent test leaks).
BLOCKED_NAME_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\b(Jay|Smith|Jones|Williams|Taylor|Brown|Davies|Evans|Thomas|Johnson|Wilson|Roberts)\b"),
    re.compile(r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\b"),  # Full name pattern e.g. "John Smith"
)

BLOCKED_DATA_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("postcode", re.compile(r"\b[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}\b")),
    ("phone_number", re.compile(r"\b(?:\+44|0)\d{10,11}\b|\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b")),
    ("email", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")),
    ("date_of_birth", re.compile(r"\b(?:DOB|date of birth)\s*[:=]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", re.I)),
    ("nhs_number", re.compile(r"\bNHS\s+number\s*[:=]?\s*\d{3}\s?\d{3}\s?\d{4}\b", re.I)),
    ("national_insurance", re.compile(r"\b[A-Z]{2}\d{6}[A-D]\b")),
    ("case_id", re.compile(r"\b(?:case|child)\s+id\s*[:=]\s*\d+\b", re.I)),
    ("exact_address", re.compile(r"\b\d{1,4}\s+[A-Z][a-z]+\s+(?:Street|Road|Avenue|Lane|Close|Drive)\b")),
)

BLOCKED_PROVIDER_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\b(Barnardo|Action for Children|NHS Foundation Trust|Ofsted registered as)\b", re.I),
)

BLOCKED_LA_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"\b(?:Birmingham|Manchester|Leeds|Liverpool|Sheffield|Bristol|"
        r"Newcastle|Nottingham|Leicester|Coventry)\s+(?:City\s+)?Council\b",
        re.I,
    ),
)

BLOCKED_SCHOOL_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\b(?:St\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Academy|High School|Primary School)\b"),
)


def _blob(scenario: dict[str, Any]) -> str:
    parts = [
        str(scenario.get("title") or ""),
        str(scenario.get("input") or ""),
        str(scenario.get("scoring_notes") or ""),
    ]
    for key in ("expected_strengths", "required_elements", "ideal_output_traits"):
        parts.extend(str(x) for x in (scenario.get(key) or []))
    return " ".join(parts)


def _is_allowed_name_match(match: re.Match[str], text: str) -> bool:
    """Allow generic two-word labels like 'Young Person'."""
    phrase = match.group(0).lower()
    if phrase in ALLOWED_GENERIC_LABELS:
        return True
    allowed_pairs = {
        "young person",
        "family member",
        "staff member",
        "registered manager",
        "social worker",
        "placing authority",
        "the home",
    }
    return phrase in allowed_pairs


def validate_scenario_safety(scenario: dict[str, Any]) -> list[str]:
    """Return safety violations for a scenario. Empty list means safe."""
    violations: list[str] = []
    sid = str(scenario.get("scenario_id") or scenario.get("id") or "?")
    text = _blob(scenario)

    if scenario.get("synthetic_data_confirmation") is not True:
        violations.append(f"{sid}: synthetic_data_confirmation must be true")

    for pattern in BLOCKED_NAME_PATTERNS:
        for match in pattern.finditer(text):
            if not _is_allowed_name_match(match, text):
                violations.append(f"{sid}: possible real-looking name: {match.group(0)!r}")
                break

    for label, pattern in BLOCKED_DATA_PATTERNS:
        if pattern.search(text):
            violations.append(f"{sid}: blocked pattern ({label})")

    for pattern in BLOCKED_PROVIDER_PATTERNS:
        if pattern.search(text):
            violations.append(f"{sid}: possible real provider name")

    for pattern in BLOCKED_LA_PATTERNS:
        if pattern.search(text):
            violations.append(f"{sid}: possible real local authority name")

    for pattern in BLOCKED_SCHOOL_PATTERNS:
        if pattern.search(text):
            violations.append(f"{sid}: possible real school name")

    return violations


def validate_scenarios_batch(scenarios: list[dict[str, Any]]) -> list[str]:
    """Validate a list of scenarios; return all violations."""
    all_violations: list[str] = []
    for scenario in scenarios:
        all_violations.extend(validate_scenario_safety(scenario))
    return all_violations
