from __future__ import annotations

"""Escalation monitoring for IndiCare OS assistant.

This module combines safeguarding escalation, action extraction, risk trajectory
and management oversight into a monitoring view for unresolved high-risk signals.
It is for professional review and does not replace safeguarding procedures.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.action_extraction import extract_actions, serialise_action_extraction
from assistant.management_oversight import build_management_oversight, serialise_management_oversight
from assistant.risk_trajectory import build_risk_trajectory, serialise_risk_trajectory
from assistant.safeguarding_escalation import build_safeguarding_escalation, serialise_safeguarding_escalation


@dataclass(frozen=True)
class EscalationAlert:
    title: str
    severity: str
    reason: str
    recommended_action: str
    evidence_refs: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class EscalationMonitoringResult:
    monitoring_level: str
    evidence_count: int
    alerts: list[EscalationAlert] = field(default_factory=list)
    safeguarding: dict[str, Any] = field(default_factory=dict)
    risk_trajectory: dict[str, Any] = field(default_factory=dict)
    actions: dict[str, Any] = field(default_factory=dict)
    management_oversight: dict[str, Any] = field(default_factory=dict)
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


def _refs_from_items(items: list[dict[str, Any]] | None, limit: int = 5) -> list[str]:
    refs: list[str] = []
    if not isinstance(items, list):
        return []
    for item in items:
        if not isinstance(item, dict):
            continue
        ref = _safe_string(item.get("citation_ref"))
        if ref and ref not in refs:
            refs.append(ref)
        for candidate in item.get("citation_refs", []) if isinstance(item.get("citation_refs"), list) else []:
            candidate_ref = _safe_string(candidate)
            if candidate_ref and candidate_ref not in refs:
                refs.append(candidate_ref)
        if len(refs) >= limit:
            break
    return refs[:limit]


def _derive_monitoring_level(alerts: list[EscalationAlert]) -> str:
    if any(alert.severity == "urgent" for alert in alerts):
        return "urgent_review_required"
    if any(alert.severity == "high" for alert in alerts):
        return "high_attention"
    if alerts:
        return "monitoring_required"
    return "no_escalation_detected"


def build_escalation_monitoring(
    *,
    evidence_index: list[dict[str, Any]] | None,
) -> EscalationMonitoringResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    if not evidence:
        return EscalationMonitoringResult(
            monitoring_level="unknown",
            evidence_count=0,
            alerts=[
                EscalationAlert(
                    title="No visible evidence",
                    severity="high",
                    reason="No scoped OS evidence was provided for escalation monitoring.",
                    recommended_action="Attach visible OS evidence before drawing escalation conclusions.",
                    evidence_refs=[],
                )
            ],
            warnings=["no_visible_evidence_for_escalation_monitoring"],
        )

    safeguarding = build_safeguarding_escalation(evidence_index=evidence)
    risk = build_risk_trajectory(evidence_index=evidence)
    actions = extract_actions(evidence_index=evidence)
    oversight = build_management_oversight(evidence_index=evidence)

    safeguarding_payload = serialise_safeguarding_escalation(safeguarding)
    risk_payload = serialise_risk_trajectory(risk)
    action_payload = serialise_action_extraction(actions)
    oversight_payload = serialise_management_oversight(oversight)

    alerts: list[EscalationAlert] = []

    if safeguarding.level in {"urgent", "heightened"}:
        alerts.append(
            EscalationAlert(
                title="Safeguarding escalation visible",
                severity="urgent" if safeguarding.level == "urgent" else "high",
                reason=f"Safeguarding monitoring level is {safeguarding.level} based on visible indicators.",
                recommended_action="Check immediate safety, supervision, manager/on-call escalation and whether external safeguarding procedures are required.",
                evidence_refs=_refs_from_items(safeguarding_payload.get("indicators")),
            )
        )

    if risk.trajectory == "escalating":
        alerts.append(
            EscalationAlert(
                title="Risk trajectory appears escalating",
                severity="high",
                reason="Risk movement appears to be increasing across visible evidence.",
                recommended_action="Review risk controls, care planning, safeguarding actions and management follow-through.",
                evidence_refs=_refs_from_items(risk_payload.get("points")),
            )
        )

    if actions.open_count >= 3 or actions.gap_count >= 3:
        alerts.append(
            EscalationAlert(
                title="Action drift or quality gaps visible",
                severity="high" if actions.open_count >= 5 or actions.gap_count >= 5 else "medium",
                reason=f"Visible actions include {actions.open_count} open action(s) and {actions.gap_count} quality gap(s).",
                recommended_action="Review open actions for owner, due date, completion evidence, management sign-off and child impact.",
                evidence_refs=_refs_from_items(action_payload.get("actions")),
            )
        )

    if oversight.oversight_level in {"weak_or_unclear", "limited_visible_oversight", "developing_with_gaps"}:
        alerts.append(
            EscalationAlert(
                title="Management oversight requires review",
                severity="high" if oversight.oversight_level == "weak_or_unclear" else "medium",
                reason=f"Management oversight level is {oversight.oversight_level}.",
                recommended_action="Check whether oversight records show decisions, rationale, owner, timescale, follow-through and impact.",
                evidence_refs=_refs_from_items(oversight_payload.get("findings")),
            )
        )

    warnings: list[str] = []
    for payload in (safeguarding_payload, risk_payload, action_payload, oversight_payload):
        maybe = payload.get("warnings") if isinstance(payload, dict) else []
        if isinstance(maybe, list):
            warnings.extend(_safe_string(item) for item in maybe)

    return EscalationMonitoringResult(
        monitoring_level=_derive_monitoring_level(alerts),
        evidence_count=len(evidence),
        alerts=alerts[:12],
        safeguarding=safeguarding_payload,
        risk_trajectory=risk_payload,
        actions=action_payload,
        management_oversight=oversight_payload,
        warnings=_dedupe(warnings),
    )


def serialise_escalation_monitoring(result: EscalationMonitoringResult) -> dict[str, Any]:
    return {
        "monitoring_level": result.monitoring_level,
        "evidence_count": result.evidence_count,
        "warnings": result.warnings,
        "alerts": [
            {
                "title": item.title,
                "severity": item.severity,
                "reason": item.reason,
                "recommended_action": item.recommended_action,
                "evidence_refs": item.evidence_refs,
            }
            for item in result.alerts
        ],
        "safeguarding": result.safeguarding,
        "risk_trajectory": result.risk_trajectory,
        "actions": result.actions,
        "management_oversight": result.management_oversight,
    }


def build_escalation_monitoring_prompt_block(result: EscalationMonitoringResult) -> str:
    lines = [
        "ESCALATION MONITORING CONTEXT",
        "Use this as a professional monitoring prompt. Do not replace safeguarding procedures or manager judgement.",
        f"Monitoring level: {result.monitoring_level}. Evidence count: {result.evidence_count}.",
        "",
    ]

    if result.alerts:
        lines.append("Alerts:")
        for alert in result.alerts:
            refs = " ".join(alert.evidence_refs)
            lines.append(f"- {alert.severity.upper()}: {alert.title}. {alert.reason} Action: {alert.recommended_action} {refs}".strip())

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings[:12]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
