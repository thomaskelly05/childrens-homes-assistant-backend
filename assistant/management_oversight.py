from __future__ import annotations

"""Management oversight intelligence for IndiCare OS assistant.

This module reviews visible OS evidence for management grip, follow-through,
ownership, timescales and governance gaps. It does not make final compliance
judgements; it highlights issues for professional review.
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any


OVERSIGHT_RECORD_TYPES = {
    "manager_action",
    "task",
    "quality_audit",
    "inspection_action",
    "compliance_item",
    "monthly_review",
    "reg44_visit",
    "reg44_finding",
    "reg44_action",
    "reg45_review",
    "reg45_action",
    "supervision_session",
    "handover",
    "handover_record",
}

OWNERSHIP_TERMS = {
    "manager",
    "registered manager",
    "ri",
    "responsible individual",
    "senior",
    "key worker",
    "staff to",
    "manager to",
    "owner",
    "lead",
    "assigned",
}

FOLLOW_THROUGH_TERMS = {
    "completed",
    "reviewed",
    "updated",
    "closed",
    "actioned",
    "followed up",
    "evidence uploaded",
    "signed off",
}

GAP_TERMS = {
    "overdue",
    "not completed",
    "no evidence",
    "not reviewed",
    "not updated",
    "awaiting",
    "missing",
    "gap",
    "delay",
    "unresolved",
}


@dataclass(frozen=True)
class OversightFinding:
    citation_ref: str
    record_type: str
    label: str
    date: str
    finding_type: str
    severity: str
    excerpt: str


@dataclass(frozen=True)
class ManagementOversightResult:
    oversight_level: str
    evidence_count: int
    findings: list[OversightFinding] = field(default_factory=list)
    strengths: list[str] = field(default_factory=list)
    gaps: list[str] = field(default_factory=list)
    recommended_actions: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


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


def _normalise_date(value: Any) -> str:
    parsed = _parse_datetime(value)
    return parsed.isoformat() if parsed else ""


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
        for key in ("label", "title", "excerpt", "summary", "description", "outcome", "notes", "status")
    ).lower()


def _excerpt(item: dict[str, Any]) -> str:
    return _safe_string(item.get("excerpt") or item.get("summary") or item.get("description") or item.get("notes") or item.get("label") or item.get("title"))[:360]


def _is_oversight_item(item: dict[str, Any]) -> bool:
    record_type = _safe_string(item.get("record_type") or item.get("type")).lower()
    text = _combined_text(item)
    if record_type in OVERSIGHT_RECORD_TYPES:
        return True
    return any(term in text for term in OWNERSHIP_TERMS | FOLLOW_THROUGH_TERMS | GAP_TERMS)


def _findings_for_item(item: dict[str, Any]) -> list[OversightFinding]:
    if not isinstance(item, dict) or not _is_oversight_item(item):
        return []

    citation_ref = _citation_ref(item)
    if not citation_ref:
        return []

    record_type = _safe_string(item.get("record_type") or item.get("type") or "record").lower()
    text = _combined_text(item)
    label = _safe_string(item.get("label") or item.get("title") or record_type or "Record")
    date_value = _normalise_date(item.get("date") or item.get("event_at") or item.get("updated_at") or item.get("due_date"))
    excerpt = _excerpt(item)

    findings: list[OversightFinding] = []

    has_owner = any(term in text for term in OWNERSHIP_TERMS)
    has_follow_through = any(term in text for term in FOLLOW_THROUGH_TERMS)
    has_gap = any(term in text for term in GAP_TERMS)

    if has_follow_through:
        findings.append(
            OversightFinding(
                citation_ref=citation_ref,
                record_type=record_type,
                label=label,
                date=date_value,
                finding_type="follow_through_visible",
                severity="strength",
                excerpt=excerpt,
            )
        )

    if has_owner:
        findings.append(
            OversightFinding(
                citation_ref=citation_ref,
                record_type=record_type,
                label=label,
                date=date_value,
                finding_type="ownership_visible",
                severity="strength",
                excerpt=excerpt,
            )
        )

    if has_gap:
        findings.append(
            OversightFinding(
                citation_ref=citation_ref,
                record_type=record_type,
                label=label,
                date=date_value,
                finding_type="oversight_gap_or_delay",
                severity="gap",
                excerpt=excerpt,
            )
        )

    if record_type in {"manager_action", "task", "inspection_action", "reg45_action"} and not has_owner:
        findings.append(
            OversightFinding(
                citation_ref=citation_ref,
                record_type=record_type,
                label=label,
                date=date_value,
                finding_type="action_without_clear_owner",
                severity="gap",
                excerpt=excerpt,
            )
        )

    if record_type in {"manager_action", "task", "inspection_action", "reg45_action"} and not has_follow_through:
        findings.append(
            OversightFinding(
                citation_ref=citation_ref,
                record_type=record_type,
                label=label,
                date=date_value,
                finding_type="follow_through_not_visible",
                severity="gap",
                excerpt=excerpt,
            )
        )

    return findings


def _derive_level(findings: list[OversightFinding]) -> str:
    if not findings:
        return "unknown"
    gap_count = len([item for item in findings if item.severity == "gap"])
    strength_count = len([item for item in findings if item.severity == "strength"])
    if gap_count >= 5 and gap_count > strength_count:
        return "weak_or_unclear"
    if gap_count >= 2:
        return "developing_with_gaps"
    if strength_count >= 3 and gap_count == 0:
        return "visible_grip"
    return "limited_visible_oversight"


def build_management_oversight(
    *,
    evidence_index: list[dict[str, Any]] | None,
    limit: int = 30,
) -> ManagementOversightResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    if not evidence:
        return ManagementOversightResult(
            oversight_level="unknown",
            evidence_count=0,
            warnings=["no_visible_evidence_for_management_oversight"],
            recommended_actions=["Add visible management oversight evidence before drawing conclusions."],
        )

    findings: list[OversightFinding] = []
    for item in evidence:
        findings.extend(_findings_for_item(item))

    findings = sorted(
        findings,
        key=lambda item: (0 if item.severity == "gap" else 1, item.date, item.citation_ref),
        reverse=True,
    )[: max(1, min(int(limit), 100))]

    strengths = [
        f"{item.finding_type.replace('_', ' ')} visible in {item.label} {item.citation_ref}".strip()
        for item in findings
        if item.severity == "strength"
    ][:8]

    gaps = [
        f"{item.finding_type.replace('_', ' ')} in {item.label} {item.citation_ref}".strip()
        for item in findings
        if item.severity == "gap"
    ][:8]

    recommended_actions: list[str] = []
    if gaps:
        recommended_actions.extend(
            [
                "Review open actions for clear owner, due date, evidence of completion and management sign-off.",
                "Ensure safeguarding and quality actions show follow-through, not only initial response.",
                "Add review dates and impact evidence to management oversight records.",
            ]
        )
    if not strengths:
        recommended_actions.append("Record visible management oversight, decisions, rationale and impact on children.")

    warnings: list[str] = []
    if not findings:
        warnings.append("no_management_oversight_signals_detected")

    return ManagementOversightResult(
        oversight_level=_derive_level(findings),
        evidence_count=len(evidence),
        findings=findings,
        strengths=strengths,
        gaps=gaps,
        recommended_actions=recommended_actions,
        warnings=warnings,
    )


def serialise_management_oversight(result: ManagementOversightResult) -> dict[str, Any]:
    return {
        "oversight_level": result.oversight_level,
        "evidence_count": result.evidence_count,
        "strengths": result.strengths,
        "gaps": result.gaps,
        "recommended_actions": result.recommended_actions,
        "warnings": result.warnings,
        "findings": [
            {
                "citation_ref": item.citation_ref,
                "record_type": item.record_type,
                "label": item.label,
                "date": item.date,
                "finding_type": item.finding_type,
                "severity": item.severity,
                "excerpt": item.excerpt,
            }
            for item in result.findings
        ],
    }


def build_management_oversight_prompt_block(result: ManagementOversightResult) -> str:
    lines = [
        "MANAGEMENT OVERSIGHT CONTEXT",
        "Use this to support oversight review. Do not make final compliance judgements without professional review.",
        f"Oversight level: {result.oversight_level}",
        "",
    ]

    if result.strengths:
        lines.append("Visible strengths:")
        for item in result.strengths:
            lines.append(f"- {item}")

    if result.gaps:
        lines.append("")
        lines.append("Visible oversight gaps:")
        for item in result.gaps:
            lines.append(f"- {item}")

    if result.recommended_actions:
        lines.append("")
        lines.append("Recommended actions:")
        for item in result.recommended_actions:
            lines.append(f"- {item}")

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
