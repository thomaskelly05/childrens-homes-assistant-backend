from __future__ import annotations

"""
assistant/answer_quality.py

Elite answer quality-control layer for IndiCare Assistant.

Purpose:
- Check final assistant answers before they are returned
- Detect weak, unsafe, unsupported, or poorly evidenced outputs
- Support safeguarding-first responses
- Support inspection, Reg 45, manager review, recording and OS evidence discipline
- Produce user-safe warnings and audit metadata

This module does not expose private reasoning.
It provides quality and safety checks only.
"""

import re
from dataclasses import dataclass, field
from typing import Any


RECORD_CITATION_PATTERN = re.compile(
    r"\[[A-Za-z][A-Za-z0-9_\-]*:\d+[A-Za-z0-9_\-]*\]"
)

BROKEN_CITATION_PATTERN = re.compile(
    r"\[[A-Za-z][A-Za-z0-9_\-]*:\s*\]"
)

GENERIC_RECORD_ACCESS_CLAIMS = {
    "the records show",
    "your records show",
    "the chronology shows",
    "the care plan shows",
    "the risk assessment shows",
    "the child’s file shows",
    "the childs file shows",
    "i can see from the records",
    "based on the full record",
    "across the full record",
}

SAFEGUARDING_ACTION_TERMS = {
    "safeguarding",
    "manager",
    "on-call",
    "on call",
    "social worker",
    "police",
    "emergency",
    "lado",
    "medical",
    "record",
    "escalat",
    "immediate safety",
}

REPORT_MODES = {
    "report",
    "structured_report",
    "reg45",
    "reg45_report",
    "ofsted_view",
    "manager_review",
}

ACTION_OWNER_TERMS = {
    "manager",
    "staff",
    "key worker",
    "senior",
    "responsible individual",
    "ri",
    "provider",
    "social worker",
    "allocated worker",
    "by",
    "owner",
    "lead",
    "review",
}

INSPECTION_TERMS = {
    "child",
    "lived experience",
    "impact",
    "evidence",
    "risk",
    "oversight",
    "action",
    "review",
}

REG45_TERMS = {
    "quality of care",
    "children’s experiences",
    "childrens experiences",
    "safeguarding",
    "leadership",
    "strengths",
    "areas for development",
    "actions",
    "evidence",
}


@dataclass
class AnswerQualityResult:
    is_usable: bool = True
    severity: str = "ok"
    confidence: str = "working"
    warnings: list[str] = field(default_factory=list)
    blockers: list[str] = field(default_factory=list)
    suggested_fixes: list[str] = field(default_factory=list)
    metrics: dict[str, Any] = field(default_factory=dict)
    audit_flags: list[str] = field(default_factory=list)
    user_safe_notice: str = ""


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _safe_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"1", "true", "yes", "y", "on"}:
            return True
        if lowered in {"0", "false", "no", "n", "off"}:
            return False
    return bool(value)


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []

    for item in items:
        text = _safe_string(item)
        if not text:
            continue

        key = text.lower()
        if key in seen:
            continue

        seen.add(key)
        result.append(text)

    return result


def _normalise_mode(value: Any) -> str:
    return _safe_string(value).lower() or "default"


def _word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text or ""))


def _count_items(value: Any) -> int:
    if isinstance(value, (list, tuple, set, dict)):
        return len(value)
    return 0


def _extract_visible_refs(
    *,
    sources: list[dict[str, Any]] | None,
    evidence_index: list[dict[str, Any]] | None,
) -> set[str]:
    refs: set[str] = set()

    for collection in [sources or [], evidence_index or []]:
        for item in collection:
            if not isinstance(item, dict):
                continue

            citation_ref = _safe_string(item.get("citation_ref"))
            if citation_ref:
                refs.add(citation_ref)

            record_type = _safe_string(item.get("record_type") or item.get("type"))
            record_id = _safe_string(item.get("record_id") or item.get("id"))

            if record_type and record_id:
                refs.add(f"[{record_type}:{record_id}]")

    return refs


def _has_any(text: str, terms: set[str]) -> bool:
    lowered = _safe_string(text).lower()
    return any(term in lowered for term in terms)


def _citation_checks(
    *,
    answer_text: str,
    sources: list[dict[str, Any]] | None,
    evidence_index: list[dict[str, Any]] | None,
    requires_evidence_grounding: bool,
) -> tuple[list[str], list[str], dict[str, Any]]:
    warnings: list[str] = []
    blockers: list[str] = []

    citations = RECORD_CITATION_PATTERN.findall(answer_text)
    broken = BROKEN_CITATION_PATTERN.findall(answer_text)
    visible_refs = _extract_visible_refs(sources=sources, evidence_index=evidence_index)

    unsupported = [
        citation for citation in citations
        if visible_refs and citation not in visible_refs
    ]

    evidence_available = bool(sources or evidence_index)

    if broken:
        warnings.append("broken_citations_present")

    if unsupported:
        warnings.append("unsupported_citations_present")

    if evidence_available and not citations:
        warnings.append("evidence_available_but_no_inline_citations")

    if requires_evidence_grounding and not evidence_available:
        blockers.append("evidence_required_but_missing")

    metrics = {
        "citation_count": len(citations),
        "broken_citation_count": len(broken),
        "unsupported_citation_count": len(unsupported),
        "visible_reference_count": len(visible_refs),
        "has_inline_citations": bool(citations),
    }

    return warnings, blockers, metrics


def _standalone_record_access_checks(
    *,
    answer_text: str,
    assistant_surface: str,
    evidence_available: bool,
) -> list[str]:
    warnings: list[str] = []

    if assistant_surface != "standalone":
        return warnings

    lowered = answer_text.lower()

    if not evidence_available:
        for claim in GENERIC_RECORD_ACCESS_CLAIMS:
            if claim in lowered:
                warnings.append("standalone_answer_implies_unseen_record_access")
                break

    return warnings


def _safeguarding_checks(
    *,
    answer_text: str,
    safeguarding_level: str,
) -> tuple[list[str], list[str]]:
    warnings: list[str] = []
    blockers: list[str] = []

    if safeguarding_level not in {"heightened", "urgent"}:
        return warnings, blockers

    if not _has_any(answer_text, SAFEGUARDING_ACTION_TERMS):
        blockers.append("safeguarding_response_missing_safety_or_escalation")

    first_400 = answer_text[:400].lower()
    if safeguarding_level == "urgent" and not _has_any(first_400, SAFEGUARDING_ACTION_TERMS):
        warnings.append("urgent_safeguarding_not_prioritised_early")

    return warnings, blockers


def _inspection_quality_checks(
    *,
    answer_text: str,
    mode: str,
    output_type: str,
) -> list[str]:
    warnings: list[str] = []

    combined_mode = f"{mode} {output_type}"

    if not any(item in combined_mode for item in {"ofsted", "inspection", "manager_review", "reg45", "report"}):
        return warnings

    lowered = answer_text.lower()

    missing_terms = [term for term in INSPECTION_TERMS if term not in lowered]

    if len(missing_terms) >= 4:
        warnings.append("inspection_or_manager_output_lacks_core_quality_markers")

    if "grade" in lowered and any(term in lowered for term in {"outstanding", "good", "requires improvement", "inadequate"}):
        warnings.append("possible_unverified_ofsted_grade_prediction")

    return warnings


def _reg45_quality_checks(
    *,
    answer_text: str,
    mode: str,
    output_type: str,
) -> list[str]:
    warnings: list[str] = []

    combined_mode = f"{mode} {output_type}"

    if "reg45" not in combined_mode and "reg 45" not in answer_text.lower() and "regulation 45" not in answer_text.lower():
        return warnings

    lowered = answer_text.lower()

    missing_terms = [term for term in REG45_TERMS if term not in lowered]

    if len(missing_terms) >= 4:
        warnings.append("reg45_output_lacks_evaluation_structure")

    if "action" in lowered and not _has_any(lowered, ACTION_OWNER_TERMS):
        warnings.append("reg45_actions_may_lack_owner_or_review_point")

    return warnings


def _action_ownership_checks(
    *,
    answer_text: str,
    mode: str,
    output_type: str,
) -> list[str]:
    warnings: list[str] = []

    combined_mode = f"{mode} {output_type}"

    if not any(item in combined_mode for item in {"manager_review", "ofsted", "reg45", "report", "support_plan"}):
        return warnings

    lowered = answer_text.lower()

    if "action" in lowered and not _has_any(lowered, ACTION_OWNER_TERMS):
        warnings.append("actions_present_without_clear_owner_or_review")

    return warnings


def _too_short_checks(
    *,
    answer_text: str,
    mode: str,
    output_type: str,
) -> list[str]:
    warnings: list[str] = []

    words = _word_count(answer_text)
    combined_mode = f"{mode} {output_type}"

    if any(item in combined_mode for item in REPORT_MODES) and words < 180:
        warnings.append("answer_too_short_for_report_or_review")

    if "reg45" in combined_mode and words < 300:
        warnings.append("reg45_answer_too_short")

    if "ofsted" in combined_mode and words < 180:
        warnings.append("ofsted_view_too_short")

    return warnings


def _build_suggested_fixes(
    *,
    warnings: list[str],
    blockers: list[str],
) -> list[str]:
    fixes: list[str] = []

    all_flags = set(warnings + blockers)

    if "answer_empty" in all_flags:
        fixes.append("Regenerate the response with a clear answer or safe fallback.")

    if "evidence_required_but_missing" in all_flags:
        fixes.append("Add visible scoped evidence or state clearly that record-based conclusions cannot be made.")

    if "evidence_available_but_no_inline_citations" in all_flags:
        fixes.append("Add inline citations using exact citation_ref values from visible sources.")

    if "broken_citations_present" in all_flags:
        fixes.append("Remove or repair broken citations before showing the answer.")

    if "unsupported_citations_present" in all_flags:
        fixes.append("Check that every citation used exists in the evidence index or source list.")

    if "safeguarding_response_missing_safety_or_escalation" in all_flags:
        fixes.append("Lead with immediate safety, escalation, recording, and who must be informed.")

    if "standalone_answer_implies_unseen_record_access" in all_flags:
        fixes.append("Clarify that standalone mode cannot see records unless supplied.")

    if "inspection_or_manager_output_lacks_core_quality_markers" in all_flags:
        fixes.append("Include child impact, evidence, risk, oversight, and actions.")

    if "reg45_output_lacks_evaluation_structure" in all_flags:
        fixes.append("Structure around quality of care, children’s experiences, safeguarding, leadership, strengths, development areas, actions, and evidence limitations.")

    if "actions_present_without_clear_owner_or_review" in all_flags:
        fixes.append("Add clear action owner, timescale, and review point.")

    return _dedupe(fixes)


def _derive_severity(
    *,
    blockers: list[str],
    warnings: list[str],
) -> str:
    if blockers:
        return "blocker"
    if len(warnings) >= 4:
        return "high_warning"
    if warnings:
        return "warning"
    return "ok"


def _derive_confidence(
    *,
    severity: str,
    evidence_available: bool,
    requires_evidence_grounding: bool,
    citation_count: int,
) -> str:
    if severity == "blocker":
        return "low"

    if severity == "high_warning":
        return "working"

    if requires_evidence_grounding and not evidence_available:
        return "low"

    if evidence_available and citation_count > 0 and severity == "ok":
        return "high"

    if severity == "warning":
        return "working"

    return "medium"


def _build_user_safe_notice(
    *,
    severity: str,
    blockers: list[str],
    warnings: list[str],
) -> str:
    if severity == "ok":
        return ""

    if "safeguarding_response_missing_safety_or_escalation" in blockers:
        return (
            "This response may not safely prioritise safeguarding. Review immediate safety, escalation, "
            "recording, and who must be informed before relying on it."
        )

    if "evidence_required_but_missing" in blockers:
        return (
            "This response does not have enough visible evidence for a record-based conclusion. "
            "Use it only as general practice support unless evidence is added."
        )

    if warnings:
        return "This response may need review before use, especially around evidence, citations, safeguarding, or action ownership."

    return ""


def check_answer_quality(
    *,
    answer_text: str,
    mode: str = "default",
    output_type: str = "",
    assistant_surface: str = "standalone",
    safeguarding_level: str = "normal",
    requires_evidence_grounding: bool = False,
    sources: list[dict[str, Any]] | None = None,
    evidence_index: list[dict[str, Any]] | None = None,
    runtime: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Main production quality checker.

    Returns a JSON-safe dict that can be added to runtime, explainability,
    audit logs, or UI warnings.
    """
    runtime = runtime or {}

    answer = _safe_string(answer_text)
    mode = _normalise_mode(mode)
    output_type = _normalise_mode(output_type)
    assistant_surface = _safe_string(assistant_surface).lower() or "standalone"
    safeguarding_level = _safe_string(safeguarding_level).lower() or "normal"

    warnings: list[str] = []
    blockers: list[str] = []
    audit_flags: list[str] = []

    evidence_available = bool(sources or evidence_index)

    metrics: dict[str, Any] = {
        "word_count": _word_count(answer),
        "character_count": len(answer),
        "source_count": _count_items(sources),
        "evidence_count": _count_items(evidence_index),
        "assistant_surface": assistant_surface,
        "mode": mode,
        "output_type": output_type,
        "safeguarding_level": safeguarding_level,
        "requires_evidence_grounding": requires_evidence_grounding,
    }

    if not answer:
        blockers.append("answer_empty")

    if answer:
        warnings.extend(
            _too_short_checks(
                answer_text=answer,
                mode=mode,
                output_type=output_type,
            )
        )

        citation_warnings, citation_blockers, citation_metrics = _citation_checks(
            answer_text=answer,
            sources=sources,
            evidence_index=evidence_index,
            requires_evidence_grounding=requires_evidence_grounding,
        )
        warnings.extend(citation_warnings)
        blockers.extend(citation_blockers)
        metrics.update(citation_metrics)

        warnings.extend(
            _standalone_record_access_checks(
                answer_text=answer,
                assistant_surface=assistant_surface,
                evidence_available=evidence_available,
            )
        )

        safeguarding_warnings, safeguarding_blockers = _safeguarding_checks(
            answer_text=answer,
            safeguarding_level=safeguarding_level,
        )
        warnings.extend(safeguarding_warnings)
        blockers.extend(safeguarding_blockers)

        warnings.extend(
            _inspection_quality_checks(
                answer_text=answer,
                mode=mode,
                output_type=output_type,
            )
        )

        warnings.extend(
            _reg45_quality_checks(
                answer_text=answer,
                mode=mode,
                output_type=output_type,
            )
        )

        warnings.extend(
            _action_ownership_checks(
                answer_text=answer,
                mode=mode,
                output_type=output_type,
            )
        )

    warnings = _dedupe(warnings)
    blockers = _dedupe(blockers)

    severity = _derive_severity(blockers=blockers, warnings=warnings)

    confidence = _derive_confidence(
        severity=severity,
        evidence_available=evidence_available,
        requires_evidence_grounding=requires_evidence_grounding,
        citation_count=int(metrics.get("citation_count") or 0),
    )

    suggested_fixes = _build_suggested_fixes(
        warnings=warnings,
        blockers=blockers,
    )

    if blockers:
        audit_flags.append("quality_blocker_present")
    if warnings:
        audit_flags.append("quality_warning_present")
    if safeguarding_level in {"heightened", "urgent"}:
        audit_flags.append("safeguarding_quality_check")
    if requires_evidence_grounding:
        audit_flags.append("evidence_grounded_quality_check")
    if assistant_surface == "standalone":
        audit_flags.append("standalone_quality_check")

    result = AnswerQualityResult(
        is_usable=not blockers,
        severity=severity,
        confidence=confidence,
        warnings=warnings,
        blockers=blockers,
        suggested_fixes=suggested_fixes,
        metrics=metrics,
        audit_flags=_dedupe(audit_flags),
        user_safe_notice=_build_user_safe_notice(
            severity=severity,
            blockers=blockers,
            warnings=warnings,
        ),
    )

    return answer_quality_to_dict(result)


def answer_quality_to_dict(result: AnswerQualityResult) -> dict[str, Any]:
    return {
        "is_usable": result.is_usable,
        "severity": result.severity,
        "confidence": result.confidence,
        "warnings": result.warnings,
        "blockers": result.blockers,
        "suggested_fixes": result.suggested_fixes,
        "metrics": result.metrics,
        "audit_flags": result.audit_flags,
        "user_safe_notice": result.user_safe_notice,
    }


def build_quality_prompt_block(quality: dict[str, Any]) -> str:
    """
    Prompt-safe quality summary.
    Does not expose chain-of-thought.
    """
    lines = [
        "============================================================",
        "ANSWER QUALITY CONTEXT",
        "",
        f"Usable: {quality.get('is_usable')}",
        f"Severity: {quality.get('severity')}",
        f"Confidence: {quality.get('confidence')}",
    ]

    for label, key in [
        ("Warnings", "warnings"),
        ("Blockers", "blockers"),
        ("Suggested fixes", "suggested_fixes"),
        ("Audit flags", "audit_flags"),
    ]:
        values = quality.get(key)
        if isinstance(values, list) and values:
            lines.append("")
            lines.append(f"{label}:")
            for item in values:
                lines.append(f"• {_safe_string(item)}")

    notice = _safe_string(quality.get("user_safe_notice"))
    if notice:
        lines.extend(["", "User-safe notice:", notice])

    return "\n".join(lines).strip()
