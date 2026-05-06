from __future__ import annotations

"""Central answer policy decisions for IndiCare Assistant.

This module does not generate text. It decides what kinds of controls,
warnings and evidence expectations apply before an answer is shown.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ResponsePolicyDecision:
    assistant_surface: str
    requires_os_citations: bool
    requires_regulatory_basis: bool
    requires_missing_evidence_warning: bool
    requires_child_centric_language: bool
    requires_safeguarding_focus: bool
    required_sections: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


REPORT_OUTPUTS = {
    "report",
    "structured_report",
    "email_report",
    "reg45_report",
}


def build_response_policy(
    *,
    message: str,
    assistant_surface: str,
    output_type: str,
    safeguarding_level: str,
    has_visible_evidence: bool,
    has_regulatory_basis: bool,
) -> ResponsePolicyDecision:
    text = _safe_string(message).lower()

    is_os = assistant_surface == "os_embedded"
    safeguarding = safeguarding_level in {"heightened", "urgent", "serious"}

    regulatory = (
        has_regulatory_basis
        or any(
            phrase in text
            for phrase in (
                "regulation",
                "reg ",
                "ofsted",
                "sccif",
                "quality standard",
                "notification",
                "reg45",
                "reg 45",
            )
        )
    )

    record_specific = any(
        phrase in text
        for phrase in (
            "what do the records show",
            "summarise the records",
            "chronology",
            "timeline",
            "incident",
            "daily note",
            "handover",
            "care plan",
            "risk assessment",
        )
    )

    required_sections: list[str] = []
    warnings: list[str] = []

    if safeguarding:
        required_sections.extend(
            [
                "Immediate safety",
                "Current known risk",
                "Actions taken",
                "Who should be informed",
            ]
        )

    if "reg45" in text or output_type == "reg45_report":
        required_sections.extend(
            [
                "Children's experiences and progress",
                "Safeguarding",
                "Leadership and management oversight",
                "Strengths",
                "Areas for development",
                "Actions and review points",
            ]
        )

    if is_os and record_specific and not has_visible_evidence:
        warnings.append("record_specific_answer_without_visible_evidence")

    if regulatory and not has_regulatory_basis:
        warnings.append("regulatory_question_without_regulatory_basis")

    if is_os and not has_visible_evidence:
        warnings.append("os_answer_without_visible_evidence")

    deduped_sections: list[str] = []
    seen_sections: set[str] = set()
    for section in required_sections:
        lowered = section.lower()
        if lowered in seen_sections:
            continue
        seen_sections.add(lowered)
        deduped_sections.append(section)

    deduped_warnings: list[str] = []
    seen_warnings: set[str] = set()
    for warning in warnings:
        if warning in seen_warnings:
            continue
        seen_warnings.add(warning)
        deduped_warnings.append(warning)

    return ResponsePolicyDecision(
        assistant_surface=assistant_surface,
        requires_os_citations=is_os and has_visible_evidence,
        requires_regulatory_basis=regulatory,
        requires_missing_evidence_warning=is_os and not has_visible_evidence,
        requires_child_centric_language=True,
        requires_safeguarding_focus=safeguarding,
        required_sections=deduped_sections,
        warnings=deduped_warnings,
    )


def serialise_response_policy(policy: ResponsePolicyDecision) -> dict[str, Any]:
    return {
        "assistant_surface": policy.assistant_surface,
        "requires_os_citations": policy.requires_os_citations,
        "requires_regulatory_basis": policy.requires_regulatory_basis,
        "requires_missing_evidence_warning": policy.requires_missing_evidence_warning,
        "requires_child_centric_language": policy.requires_child_centric_language,
        "requires_safeguarding_focus": policy.requires_safeguarding_focus,
        "required_sections": policy.required_sections,
        "warnings": policy.warnings,
    }
