from __future__ import annotations

"""Regulatory concern detection for IndiCare OS assistant.

This module flags possible regulatory concerns for professional review. It does
not declare breaches, non-compliance, Ofsted outcomes or legal conclusions.
It links concerns to visible evidence, mapped regulations and safe actions.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.action_extraction import extract_actions, serialise_action_extraction
from assistant.management_oversight import build_management_oversight, serialise_management_oversight
from assistant.regulatory_context_builder import build_adult_regulatory_context
from assistant.risk_trajectory import build_risk_trajectory, serialise_risk_trajectory
from assistant.safeguarding_escalation import build_safeguarding_escalation, serialise_safeguarding_escalation


@dataclass(frozen=True)
class RegulatoryConcern:
    regulation_key: str
    regulation_label: str
    concern: str
    severity: str
    rationale: str
    evidence_refs: list[str] = field(default_factory=list)
    recommended_review_actions: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class RegulatoryConcernDetectionResult:
    overall_level: str
    evidence_count: int
    concerns: list[RegulatoryConcern] = field(default_factory=list)
    regulatory_context: dict[str, Any] = field(default_factory=dict)
    source_modules: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _dedupe(items: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
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


def _refs_from_payload(payload: dict[str, Any], sections: tuple[str, ...], limit: int = 6) -> list[str]:
    refs: list[str] = []
    for section in sections:
        value = payload.get(section)
        if not isinstance(value, list):
            continue
        for item in value:
            if not isinstance(item, dict):
                continue
            ref = _safe_string(item.get("citation_ref"))
            if ref and ref not in refs:
                refs.append(ref)
            citation_refs = item.get("citation_refs")
            if isinstance(citation_refs, list):
                for candidate in citation_refs:
                    text = _safe_string(candidate)
                    if text and text not in refs:
                        refs.append(text)
            if len(refs) >= limit:
                return refs[:limit]
    return refs[:limit]


def _concern_level(concerns: list[RegulatoryConcern]) -> str:
    if any(item.severity == "urgent" for item in concerns):
        return "urgent_review_required"
    if any(item.severity == "high" for item in concerns):
        return "high_attention"
    if concerns:
        return "review_required"
    return "no_regulatory_concern_detected"


def build_regulatory_concern_detection(
    *,
    evidence_index: list[dict[str, Any]] | None,
) -> RegulatoryConcernDetectionResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    if not evidence:
        regulatory_context = build_adult_regulatory_context(
            message="regulatory concern review without visible OS evidence",
            mode="quality_review",
            task_type="review",
            output_type="answer",
            safeguarding_level="normal",
            urgency="routine",
            user_role_profile="manager",
        )
        return RegulatoryConcernDetectionResult(
            overall_level="unknown",
            evidence_count=0,
            regulatory_context=regulatory_context,
            warnings=["no_visible_evidence_for_regulatory_concern_detection"],
        )

    safeguarding = serialise_safeguarding_escalation(build_safeguarding_escalation(evidence_index=evidence))
    risk = serialise_risk_trajectory(build_risk_trajectory(evidence_index=evidence))
    actions = serialise_action_extraction(extract_actions(evidence_index=evidence))
    oversight = serialise_management_oversight(build_management_oversight(evidence_index=evidence))

    concerns: list[RegulatoryConcern] = []

    if safeguarding.get("level") in {"urgent", "heightened"}:
        concerns.append(
            RegulatoryConcern(
                regulation_key="reg12",
                regulation_label="Regulation 12 - The protection of children standard",
                concern="Possible protection standard concern for review",
                severity="urgent" if safeguarding.get("level") == "urgent" else "high",
                rationale=f"Safeguarding level is {safeguarding.get('level')} based on visible indicators.",
                evidence_refs=_refs_from_payload(safeguarding, ("indicators",)),
                recommended_review_actions=[
                    "Review immediate safety and current risk controls.",
                    "Check manager/on-call escalation and multi-agency communication.",
                    "Record decisions, rationale, actions and child impact.",
                ],
            )
        )

    if risk.get("trajectory") == "escalating":
        concerns.append(
            RegulatoryConcern(
                regulation_key="reg14",
                regulation_label="Regulation 14 - The care planning standard",
                concern="Possible care planning or risk-management concern for review",
                severity="high",
                rationale="Risk trajectory appears escalating in visible evidence.",
                evidence_refs=_refs_from_payload(risk, ("points",)),
                recommended_review_actions=[
                    "Review whether care plans and risk assessments reflect current risks.",
                    "Check whether planned responses are being implemented and reviewed.",
                ],
            )
        )

    if oversight.get("oversight_level") in {"weak_or_unclear", "limited_visible_oversight", "developing_with_gaps"}:
        concerns.append(
            RegulatoryConcern(
                regulation_key="reg13",
                regulation_label="Regulation 13 - The leadership and management standard",
                concern="Possible leadership and management oversight concern for review",
                severity="high" if oversight.get("oversight_level") == "weak_or_unclear" else "medium",
                rationale=f"Management oversight level is {oversight.get('oversight_level')} based on visible evidence.",
                evidence_refs=_refs_from_payload(oversight, ("findings",)),
                recommended_review_actions=[
                    "Review ownership, timescales, sign-off and follow-through evidence.",
                    "Check whether leadership actions evidence impact on children.",
                ],
            )
        )

    if int(actions.get("open_count") or 0) >= 3 or int(actions.get("gap_count") or 0) >= 3:
        concerns.append(
            RegulatoryConcern(
                regulation_key="reg13",
                regulation_label="Regulation 13 - The leadership and management standard",
                concern="Possible action drift or governance concern for review",
                severity="medium",
                rationale=f"Visible actions include {actions.get('open_count', 0)} open action(s) and {actions.get('gap_count', 0)} quality gap(s).",
                evidence_refs=_refs_from_payload(actions, ("actions",)),
                recommended_review_actions=[
                    "Clarify owners, due dates, status and evidence of completion.",
                    "Review whether open actions create safeguarding, care planning or quality risks.",
                ],
            )
        )

    if any("ofsted" in _safe_string(item).lower() or "notification" in _safe_string(item).lower() for item in actions.get("warnings", [])):
        concerns.append(
            RegulatoryConcern(
                regulation_key="reg40",
                regulation_label="Regulation 40 - Notification of a serious event",
                concern="Possible notification consideration for manager review",
                severity="medium",
                rationale="Notification-related warning language was visible in action intelligence.",
                evidence_refs=_refs_from_payload(actions, ("actions",)),
                recommended_review_actions=[
                    "Manager should review known facts against Regulation 40 notification requirements.",
                    "Do not conclude notification is required without threshold review.",
                ],
            )
        )

    regulatory_keys = _dedupe([item.regulation_key for item in concerns]) or ["reg12", "reg13", "reg14", "reg40"]
    regulatory_context = build_adult_regulatory_context(
        message=" ".join(regulatory_keys),
        mode="quality_review",
        task_type="review",
        output_type="answer",
        safeguarding_level="heightened" if concerns else "normal",
        urgency="urgent" if any(item.severity == "urgent" for item in concerns) else "routine",
        user_role_profile="manager",
    )

    warnings: list[str] = []
    for payload in (safeguarding, risk, actions, oversight):
        maybe = payload.get("warnings") if isinstance(payload, dict) else []
        if isinstance(maybe, list):
            warnings.extend(_safe_string(item) for item in maybe if _safe_string(item))

    return RegulatoryConcernDetectionResult(
        overall_level=_concern_level(concerns),
        evidence_count=len(evidence),
        concerns=concerns[:12],
        regulatory_context=regulatory_context,
        source_modules={
            "safeguarding": safeguarding,
            "risk_trajectory": risk,
            "actions": actions,
            "management_oversight": oversight,
        },
        warnings=_dedupe(warnings),
    )


def serialise_regulatory_concern_detection(result: RegulatoryConcernDetectionResult) -> dict[str, Any]:
    return {
        "overall_level": result.overall_level,
        "evidence_count": result.evidence_count,
        "warnings": result.warnings,
        "regulatory_context": result.regulatory_context,
        "source_modules": result.source_modules,
        "concerns": [
            {
                "regulation_key": item.regulation_key,
                "regulation_label": item.regulation_label,
                "concern": item.concern,
                "severity": item.severity,
                "rationale": item.rationale,
                "evidence_refs": item.evidence_refs,
                "recommended_review_actions": item.recommended_review_actions,
            }
            for item in result.concerns
        ],
    }


def build_regulatory_concern_prompt_block(result: RegulatoryConcernDetectionResult) -> str:
    lines = [
        "REGULATORY CONCERN CONTEXT",
        "Use this to flag possible concerns for professional review only. Do not declare breaches, non-compliance or Ofsted outcomes.",
        f"Overall level: {result.overall_level}. Evidence count: {result.evidence_count}.",
        "",
    ]

    if result.concerns:
        lines.append("Possible concerns for review:")
        for concern in result.concerns:
            refs = " ".join(concern.evidence_refs)
            lines.append(f"- {concern.severity.upper()} {concern.regulation_label}: {concern.concern}. {concern.rationale} {refs}".strip())

    if result.regulatory_context.get("prompt_block"):
        lines.extend(["", result.regulatory_context["prompt_block"]])

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings[:12]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
