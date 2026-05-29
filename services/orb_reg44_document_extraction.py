"""Standalone Reg 44 visit report extraction — no OS database access.

Logic converged from ``backend/reg44_report_reader_router.py`` (classify_evidence,
split_findings) for use by ORB Document Intelligence on uploaded/pasted text only.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any

NOT_STATED = "not stated in the supplied document"


def _text(value: Any) -> str:
    return str(value or "").strip()


def classify_evidence(sentence: str) -> dict[str, Any]:
    """Classify a single finding sentence (ported from Reg 44 report reader)."""
    lower = sentence.lower()
    safeguarding_terms = [
        "safeguarding",
        "missing",
        "mfc",
        "allegation",
        "harm",
        "risk",
        "exploitation",
        "self-harm",
        "restraint",
        "incident",
    ]
    good_terms = [
        "good practice",
        "positive",
        "warm",
        "nurturing",
        "child-centred",
        "person-centred",
        "strength",
        "effective",
        "improved",
    ]
    action_terms = [
        "must",
        "should",
        "action",
        "recommend",
        "required",
        "improve",
        "ensure",
        "review",
        "update",
        "complete",
    ]
    staff_terms = ["staff", "supervision", "training", "rota", "agency"]
    health_terms = ["health", "medication", "camhs", "therapy", "gp", "dental"]
    education_terms = ["education", "school", "attendance", "learning", "college"]
    child_voice_terms = [
        "voice of the child",
        "child said",
        "young person said",
        "wishes",
        "feelings",
    ]
    environment_terms = ["environment", "bedroom", "home condition", "maintenance", "repair"]
    records_terms = ["record", "chronology", "log", "daily note", "care plan", "risk assessment"]

    evidence_type = "other"
    if any(t in lower for t in safeguarding_terms):
        evidence_type = "safeguarding"
    elif any(t in lower for t in good_terms):
        evidence_type = "good_practice"
    elif any(t in lower for t in staff_terms):
        evidence_type = "staffing"
    elif any(t in lower for t in health_terms):
        evidence_type = "health"
    elif any(t in lower for t in education_terms):
        evidence_type = "education"
    elif any(t in lower for t in child_voice_terms):
        evidence_type = "voice_of_child"
    elif any(t in lower for t in environment_terms):
        evidence_type = "environment"
    elif any(t in lower for t in records_terms):
        evidence_type = "records"

    positive = any(t in lower for t in good_terms) and not any(
        t in lower for t in ["not", "lack", "failed", "shortfall"]
    )
    requires_action = any(t in lower for t in action_terms)
    safeguarding_relevant = any(t in lower for t in safeguarding_terms)
    reg45_relevant = (
        safeguarding_relevant
        or requires_action
        or positive
        or any(t in lower for t in ["leadership", "management", "quality", "standard"])
    )
    provider_learning_relevant = reg45_relevant or any(
        t in lower for t in ["provider", "responsible individual", "ri", "registered manager"]
    )

    title = sentence.strip()[:90] + ("..." if len(sentence.strip()) > 90 else "")
    return {
        "evidence_type": evidence_type,
        "title": title or "Reg 44 finding",
        "evidence_text": sentence.strip(),
        "positive": positive,
        "requires_action": requires_action,
        "safeguarding_relevant": safeguarding_relevant,
        "reg45_relevant": reg45_relevant,
        "provider_learning_relevant": provider_learning_relevant,
    }


def split_findings(text: str) -> list[str]:
    """Split report text into reviewable finding sentences."""
    clean = re.sub(r"\s+", " ", text or "").strip()
    if not clean:
        return []
    rough = re.split(r"(?<=[.!?])\s+|\n+|\u2022|\*| - ", clean)
    findings: list[str] = []
    for item in rough:
        item = item.strip(" ;:-")
        if len(item) < 35:
            continue
        if len(item) > 900:
            item = item[:900]
        findings.append(item)
    return findings[:80]


def _extract_visit_date(text: str) -> str:
    patterns = [
        r"(?:visit\s+date|date\s+of\s+visit|report\s+date)\s*[:\-]?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})",
        r"(?:visit\s+date|date\s+of\s+visit|report\s+date)\s*[:\-]?\s*(\d{1,2}\s+\w+\s+\d{4})",
        r"\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return NOT_STATED


def _extract_visitor(text: str) -> str:
    patterns = [
        r"(?:independent\s+visitor|visitor|visited\s+by|conducted\s+by)\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})",
        r"(?:visitor\s+name)\s*[:\-]?\s*([^\n,]{3,80})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            if len(name) >= 3 and "regulation" not in name.lower():
                return name
    return NOT_STATED


def _extract_home(text: str) -> str:
    patterns = [
        r"(?:children'?s\s+home|home\s+name|setting)\s*[:\-]?\s*([^\n,]{4,120})",
        r"(?:reg\s*44\s+report\s+for)\s+([^\n,]{4,120})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()[:120]
    return NOT_STATED


def _extract_due_date(sentence: str) -> str:
    match = re.search(
        r"(?:by|before|due|deadline)\s+(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}\s+\w+\s+\d{4})",
        sentence,
        re.IGNORECASE,
    )
    if match:
        return match.group(1).strip()
    return NOT_STATED


def _extract_owner(sentence: str) -> str:
    patterns = [
        r"(?:registered\s+manager|rm|manager|ri|responsible\s+individual|quality\s+lead|staff)\s+(?:to|should|must)",
        r"(?:owner|responsible)\s*[:\-]\s*([^\n,]{3,60})",
    ]
    lower = sentence.lower()
    for label, term in (
        ("Registered manager", "registered manager"),
        ("Responsible Individual", "responsible individual"),
        ("Quality lead", "quality lead"),
        ("Staff team", "staff to"),
    ):
        if term in lower:
            return label
    for pattern in patterns:
        match = re.search(pattern, sentence, re.IGNORECASE)
        if match and match.lastindex:
            return match.group(1).strip()
    return NOT_STATED


def _theme_bucket(evidence_type: str) -> str:
    mapping = {
        "voice_of_child": "childrens_experience",
        "good_practice": "childrens_experience",
        "safeguarding": "safeguarding",
        "staffing": "staff_practice",
        "health": "childrens_experience",
        "education": "childrens_experience",
        "environment": "environment",
        "records": "records_evidence",
    }
    return mapping.get(evidence_type, "leadership_management")


def extract_reg44_report(text: str, *, title: str = "Reg 44 visit report") -> dict[str, Any]:
    """Extract structured Reg 44 intelligence from pasted/uploaded report text only."""
    normalised = _text(text)
    if not normalised:
        raise ValueError("Document text is empty.")

    findings = split_findings(normalised)
    classified = [classify_evidence(f) for f in findings]

    themes: dict[str, list[str]] = {
        "childrens_experience": [],
        "safeguarding": [],
        "staff_practice": [],
        "leadership_management": [],
        "environment": [],
        "records_evidence": [],
    }
    actions_raised: list[dict[str, Any]] = []
    repeated: dict[str, int] = {}
    missing_evidence: list[str] = []
    escalation_points: list[str] = []

    for item in classified:
        bucket = _theme_bucket(item["evidence_type"])
        snippet = item["evidence_text"][:220]
        if snippet and snippet not in themes[bucket]:
            themes[bucket].append(snippet)
        key = item["title"][:60].lower()
        repeated[key] = repeated.get(key, 0) + 1
        if item["requires_action"]:
            actions_raised.append(
                {
                    "title": item["title"],
                    "action_text": item["evidence_text"],
                    "owner": _extract_owner(item["evidence_text"]),
                    "due_date": _extract_due_date(item["evidence_text"]),
                    "safeguarding_relevant": item["safeguarding_relevant"],
                    "source_basis": "Supplied Reg 44 report text",
                }
            )
        if item["safeguarding_relevant"]:
            escalation_points.append(item["evidence_text"][:240])
        if item["evidence_type"] == "records" and item["requires_action"]:
            missing_evidence.append(item["evidence_text"][:240])

    repeated_concerns = [
        item["evidence_text"][:240]
        for item in classified
        if repeated.get(item["title"][:60].lower(), 0) > 1
    ][:8]

    manager_response = [
        a["action_text"][:200]
        for a in actions_raised
        if a["safeguarding_relevant"] or "manager" in a["action_text"].lower()
    ][:6]
    ri_oversight = [
        item["evidence_text"][:200]
        for item in classified
        if item.get("provider_learning_relevant")
    ][:6]

    ofsted_relevance = [
        item["evidence_text"][:200]
        for item in classified
        if item.get("reg45_relevant") or item["evidence_type"] in {"records", "safeguarding"}
    ][:6]

    return {
        "title": title,
        "visit_date": _extract_visit_date(normalised[:4000]),
        "visitor": _extract_visitor(normalised[:4000]),
        "home": _extract_home(normalised[:4000]),
        "themes": {k: v[:12] for k, v in themes.items() if v},
        "actions_raised": actions_raised[:25],
        "repeated_concerns": repeated_concerns,
        "missing_evidence": missing_evidence[:12] or (
            [NOT_STATED] if not any(t["evidence_type"] == "records" for t in classified) else []
        ),
        "escalation_points": escalation_points[:12],
        "manager_response_needed": manager_response or [NOT_STATED],
        "ri_provider_oversight_needed": ri_oversight or [NOT_STATED],
        "ofsted_sccif_relevance": ofsted_relevance or [NOT_STATED],
        "finding_count": len(classified),
        "standalone_only": True,
        "os_records_accessed": False,
    }
