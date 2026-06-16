"""Safety and data validation for ORB Residential Quality Lab scenarios."""

from __future__ import annotations

import re
from typing import Any

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

NON_NAME_CAPITALISED_WORDS: frozenset[str] = frozenset(
    {
        "synthetic", "possible", "high", "risk", "context", "later", "refused", "said",
        "young", "person", "staff", "manager", "review", "prompt", "meeting", "handover",
        "observed", "timeline", "unclear", "earlier", "urgent", "brief", "evidence",
        "supervision", "reflection", "mobile", "recorded", "rewrite", "child", "centred",
        "dsl", "pathway", "required", "check", "safeguarding", "escalation", "needed",
        "stated", "perspective", "consultation", "consider", "actions", "attended",
        "joined", "bedtime", "school", "return", "upset", "reg", "note", "chair",
        "family", "declined", "returned", "needs", "email", "strengths", "education",
        "sharp", "night", "action", "chronology", "homework", "advice", "police",
        "development", "contact", "record", "daily", "incident", "behaviour",
    }
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


def _user_facing_blob(scenario: dict[str, Any]) -> str:
    """Title and input only — avoids false positives from static metadata (e.g. 'Synthetic residential…')."""
    return " ".join(
        [
            str(scenario.get("title") or ""),
            str(scenario.get("input") or ""),
        ]
    )


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
    if phrase in allowed_pairs:
        return True
    words = phrase.split()
    if len(words) == 2 and any(w in NON_NAME_CAPITALISED_WORDS for w in words):
        return True
    return False


def validate_scenario_safety(scenario: dict[str, Any]) -> list[str]:
    """Return safety violations for a scenario. Empty list means safe."""
    violations: list[str] = []
    sid = str(scenario.get("scenario_id") or scenario.get("id") or "?")
    text = _blob(scenario)
    name_text = _user_facing_blob(scenario)

    if scenario.get("synthetic_data_confirmation") is not True:
        violations.append(f"{sid}: synthetic_data_confirmation must be true")

    for pattern in BLOCKED_NAME_PATTERNS:
        for match in pattern.finditer(name_text):
            if not _is_allowed_name_match(match, name_text):
                violations.append(f"{sid}: possible real-looking name: {match.group(0)!r}")
                break

    for label, pattern in BLOCKED_DATA_PATTERNS:
        if pattern.search(name_text):
            violations.append(f"{sid}: blocked pattern ({label})")

    for pattern in BLOCKED_PROVIDER_PATTERNS:
        if pattern.search(name_text):
            violations.append(f"{sid}: possible real provider name")

    for pattern in BLOCKED_LA_PATTERNS:
        if pattern.search(name_text):
            violations.append(f"{sid}: possible real local authority name")

    for pattern in BLOCKED_SCHOOL_PATTERNS:
        if pattern.search(name_text):
            violations.append(f"{sid}: possible real school name")

    return violations


def validate_scenarios_batch(scenarios: list[dict[str, Any]]) -> list[str]:
    """Validate a list of scenarios; return all violations."""
    all_violations: list[str] = []
    for scenario in scenarios:
        all_violations.extend(validate_scenario_safety(scenario))
    return all_violations


def validate_variant_bank_integrity(
    variants: list[dict[str, Any]],
    *,
    expected_count: int,
    core_ids: set[str],
) -> list[str]:
    """Validate 10,000 variant bank structure and safety."""
    issues: list[str] = []
    if len(variants) != expected_count:
        issues.append(f"expected {expected_count} variants, found {len(variants)}")

    ids = [str(v.get("scenario_id") or "") for v in variants]
    if len(set(ids)) != len(ids):
        issues.append("duplicate scenario_id values detected")

    parents = {str(v.get("parent_scenario_id") or "") for v in variants}
    if parents != core_ids:
        missing = core_ids - parents
        extra = parents - core_ids
        if missing:
            issues.append(f"core scenarios missing from variant parents: {sorted(missing)[:5]}")
        if extra:
            issues.append(f"unexpected parent ids: {sorted(extra)[:5]}")

    issues.extend(validate_scenarios_batch(variants))

    feature_targets = {str(v.get("feature_target") or "") for v in variants}
    if len(feature_targets) < 3:
        issues.append("insufficient feature_target coverage")

    families = {str(v.get("scenario_family") or "") for v in variants}
    if len(families) < 5:
        issues.append("insufficient scenario_family coverage")

    difficulties = {str(v.get("difficulty") or "") for v in variants}
    if len(difficulties) < 2:
        issues.append("insufficient difficulty coverage")

    high_risk = [v for v in variants if str(v.get("difficulty") or "") == "high-risk"]
    routine = [v for v in variants if str(v.get("difficulty") or "") in {"basic", "moderate"}]
    if high_risk and all(
        "urgent" in str(v.get("input") or "").lower() and "pathway" not in str(v.get("input") or "").lower()
        for v in high_risk[:20]
    ):
        issues.append("high-risk variants may be alarmist without pathway context")

    over_escalated_routine = 0
    for v in routine[:500]:
        inp = str(v.get("input") or "").lower()
        if "dsl pathway required" in inp and "safeguarding" not in str(v.get("scenario_family") or ""):
            over_escalated_routine += 1
    if over_escalated_routine > len(routine) * 0.1:
        issues.append("routine variants appear over-escalated")

    return issues
