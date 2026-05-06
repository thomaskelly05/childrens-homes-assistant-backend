from __future__ import annotations

"""Pattern detection for IndiCare OS assistant.

This module looks across visible OS evidence and identifies repeated themes,
escalation signals, improvements and evidence gaps. It is deliberately
conservative: it highlights patterns for review rather than making final
professional judgements.
"""

from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any


THEME_KEYWORDS: dict[str, set[str]] = {
    "safeguarding": {
        "safeguarding",
        "risk",
        "harm",
        "exploitation",
        "allegation",
        "police",
        "missing",
        "abscond",
        "self-harm",
        "suicidal",
        "injury",
        "restraint",
    },
    "emotional_wellbeing": {
        "anxious",
        "anxiety",
        "low mood",
        "upset",
        "distressed",
        "tearful",
        "angry",
        "dysregulated",
        "emotional",
        "mental health",
    },
    "education": {
        "school",
        "education",
        "college",
        "attendance",
        "pep",
        "excluded",
        "learning",
        "tutor",
    },
    "family_contact": {
        "family",
        "contact",
        "mum",
        "mother",
        "dad",
        "father",
        "sibling",
        "phone call",
        "contact session",
    },
    "health": {
        "health",
        "appointment",
        "doctor",
        "gp",
        "dentist",
        "camhs",
        "medication",
        "hospital",
        "sleep",
    },
    "placement_stability": {
        "placement",
        "stability",
        "notice",
        "move",
        "disruption",
        "breakdown",
        "matching",
        "transition",
    },
    "staffing_or_leadership": {
        "staff",
        "manager",
        "supervision",
        "training",
        "handover",
        "oversight",
        "leadership",
        "rota",
    },
    "actions_and_follow_up": {
        "action",
        "follow up",
        "review",
        "due",
        "overdue",
        "manager to",
        "staff to",
        "task",
    },
    "positive_progress": {
        "positive",
        "progress",
        "settled",
        "achievement",
        "engaged",
        "improved",
        "strength",
        "proud",
        "enjoyed",
    },
}


@dataclass(frozen=True)
class PatternFinding:
    theme: str
    count: int
    citation_refs: list[str]
    examples: list[str]
    significance: str


@dataclass(frozen=True)
class PatternDetectionResult:
    findings: list[PatternFinding] = field(default_factory=list)
    evidence_count: int = 0
    top_record_types: dict[str, int] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _citation_ref(item: dict[str, Any]) -> str:
    citation = _safe_string(item.get("citation_ref"))
    if citation:
        return citation

    record_type = _safe_string(item.get("record_type") or item.get("type"))
    record_id = _safe_string(item.get("record_id") or item.get("id"))
    if record_type and record_id:
        return f"[{record_type}:{record_id}]"
    return ""


def _combined_text(item: dict[str, Any]) -> str:
    return " ".join(
        _safe_string(item.get(key))
        for key in ("label", "title", "excerpt", "summary", "description", "outcome", "notes", "section")
    ).lower()


def _example_text(item: dict[str, Any]) -> str:
    text = _safe_string(item.get("excerpt") or item.get("summary") or item.get("description") or item.get("label") or item.get("title"))
    return text[:240]


def _parse_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())

    text = _safe_string(value)
    if not text:
        return None

    for candidate in (text, text.replace("Z", "+00:00"), text[:10]):
        try:
            if len(candidate) == 10 and "-" in candidate:
                return datetime.combine(date.fromisoformat(candidate), datetime.min.time())
            return datetime.fromisoformat(candidate)
        except Exception:
            continue
    return None


def _significance(theme: str, count: int) -> str:
    if theme == "safeguarding" and count >= 2:
        return "high"
    if count >= 5:
        return "high"
    if count >= 3:
        return "moderate"
    return "emerging"


def detect_patterns(
    *,
    evidence_index: list[dict[str, Any]] | None,
    min_count: int = 2,
    limit: int = 12,
) -> PatternDetectionResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    if not evidence:
        return PatternDetectionResult(
            findings=[],
            evidence_count=0,
            top_record_types={},
            warnings=["no_visible_evidence_for_pattern_detection"],
        )

    theme_hits: dict[str, list[dict[str, Any]]] = defaultdict(list)
    record_type_counts: Counter[str] = Counter()

    for item in evidence:
        if not isinstance(item, dict):
            continue

        record_type = _safe_string(item.get("record_type") or item.get("type") or "record")
        if record_type:
            record_type_counts[record_type] += 1

        text = _combined_text(item)
        if not text:
            continue

        for theme, keywords in THEME_KEYWORDS.items():
            if any(keyword in text for keyword in keywords):
                theme_hits[theme].append(item)

    findings: list[PatternFinding] = []
    safe_min = max(1, int(min_count))

    for theme, items in theme_hits.items():
        citation_refs: list[str] = []
        examples: list[str] = []
        seen_refs: set[str] = set()
        seen_examples: set[str] = set()

        # Prefer dated/recent examples where dates are visible.
        sorted_items = sorted(
            items,
            key=lambda item: _parse_datetime(item.get("date") or item.get("event_at") or item.get("updated_at")) or datetime.min,
            reverse=True,
        )

        for item in sorted_items:
            ref = _citation_ref(item)
            if ref and ref.lower() not in seen_refs:
                seen_refs.add(ref.lower())
                citation_refs.append(ref)

            example = _example_text(item)
            if example and example.lower() not in seen_examples:
                seen_examples.add(example.lower())
                examples.append(example)

            if len(citation_refs) >= 6 and len(examples) >= 3:
                break

        count = len(items)
        if count < safe_min:
            continue

        findings.append(
            PatternFinding(
                theme=theme,
                count=count,
                citation_refs=citation_refs[:6],
                examples=examples[:3],
                significance=_significance(theme, count),
            )
        )

    severity_order = {"high": 3, "moderate": 2, "emerging": 1}
    findings = sorted(
        findings,
        key=lambda item: (severity_order.get(item.significance, 0), item.count, item.theme),
        reverse=True,
    )[: max(1, min(int(limit), 50))]

    warnings: list[str] = []
    if not findings:
        warnings.append("no_repeated_patterns_detected_in_visible_evidence")

    return PatternDetectionResult(
        findings=findings,
        evidence_count=len(evidence),
        top_record_types=dict(record_type_counts.most_common(8)),
        warnings=warnings,
    )


def serialise_pattern_detection(result: PatternDetectionResult) -> dict[str, Any]:
    return {
        "evidence_count": result.evidence_count,
        "top_record_types": result.top_record_types,
        "warnings": result.warnings,
        "findings": [
            {
                "theme": item.theme,
                "count": item.count,
                "citation_refs": item.citation_refs,
                "examples": item.examples,
                "significance": item.significance,
            }
            for item in result.findings
        ],
    }


def build_pattern_prompt_block(result: PatternDetectionResult) -> str:
    if not result.findings:
        return ""

    lines = [
        "PATTERN DETECTION CONTEXT",
        "Use these as patterns for professional review, not final conclusions.",
        "Cite the supporting refs when discussing a pattern.",
        "",
    ]

    for finding in result.findings:
        refs = " ".join(finding.citation_refs)
        lines.append(
            f"- {finding.significance.upper()}: {finding.theme.replace('_', ' ')} appears {finding.count} time(s). {refs}".strip()
        )
        for example in finding.examples[:2]:
            lines.append(f"  Example: {example}")

    return "\n".join(lines).strip()
