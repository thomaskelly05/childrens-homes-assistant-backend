from __future__ import annotations

"""Real-time operational alert builder for IndiCare OS assistant.

This module converts visible OS intelligence into alert-ready payloads for
future dashboards, notifications and manager/RI review queues. It does not send
notifications itself and does not replace safeguarding procedures.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from assistant.action_extraction import extract_actions, serialise_action_extraction
from assistant.escalation_monitoring import build_escalation_monitoring, serialise_escalation_monitoring
from assistant.regulatory_concern_detection import build_regulatory_concern_detection, serialise_regulatory_concern_detection
from assistant.risk_trajectory import build_risk_trajectory, serialise_risk_trajectory
from assistant.safeguarding_escalation import build_safeguarding_escalation, serialise_safeguarding_escalation


@dataclass(frozen=True)
class OperationalAlert:
    alert_id: str
    alert_type: str
    title: str
    severity: str
    audience: str
    reason: str
    recommended_action: str
    evidence_refs: list[str] = field(default_factory=list)
    created_at: str = ""


@dataclass(frozen=True)
class RealTimeAlertResult:
    alert_level: str
    evidence_count: int
    alerts: list[OperationalAlert] = field(default_factory=list)
    source_modules: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _dedupe_alerts(alerts: list[OperationalAlert]) -> list[OperationalAlert]:
    result: list[OperationalAlert] = []
    seen: set[str] = set()
    for alert in alerts:
        key = f"{alert.alert_type}|{alert.title}|{alert.reason}|{','.join(alert.evidence_refs)}".lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(alert)
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
        citation_refs = item.get("citation_refs")
        if isinstance(citation_refs, list):
            for candidate in citation_refs:
                text = _safe_string(candidate)
                if text and text not in refs:
                    refs.append(text)
        evidence_refs = item.get("evidence_refs")
        if isinstance(evidence_refs, list):
            for candidate in evidence_refs:
                text = _safe_string(candidate)
                if text and text not in refs:
                    refs.append(text)
        if len(refs) >= limit:
            return refs[:limit]
    return refs[:limit]


def _alert_level(alerts: list[OperationalAlert]) -> str:
    if any(alert.severity == "critical" for alert in alerts):
        return "critical"
    if any(alert.severity == "high" for alert in alerts):
        return "high"
    if any(alert.severity == "medium" for alert in alerts):
        return "medium"
    if alerts:
        return "low"
    return "none"


def _make_alert_id(alert_type: str, index: int) -> str:
    return f"{alert_type}-{index}"


def build_real_time_alerts(
    *,
    evidence_index: list[dict[str, Any]] | None,
    audience: str = "manager",
) -> RealTimeAlertResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    now = datetime.utcnow().isoformat() + "Z"

    if not evidence:
        alert = OperationalAlert(
            alert_id="evidence-1",
            alert_type="missing_evidence",
            title="Evidence required",
            severity="high",
            audience=audience,
            reason="No visible scoped OS evidence was provided for alert generation.",
            recommended_action="Attach visible OS evidence before relying on operational alerts.",
            evidence_refs=[],
            created_at=now,
        )
        return RealTimeAlertResult(
            alert_level="high",
            evidence_count=0,
            alerts=[alert],
            warnings=["no_visible_evidence_for_real_time_alerts"],
        )

    safeguarding = serialise_safeguarding_escalation(build_safeguarding_escalation(evidence_index=evidence))
    escalation = serialise_escalation_monitoring(build_escalation_monitoring(evidence_index=evidence))
    risk = serialise_risk_trajectory(build_risk_trajectory(evidence_index=evidence))
    actions = serialise_action_extraction(extract_actions(evidence_index=evidence))
    regulatory = serialise_regulatory_concern_detection(build_regulatory_concern_detection(evidence_index=evidence))

    alerts: list[OperationalAlert] = []

    if safeguarding.get("level") in {"urgent", "heightened"}:
        severity = "critical" if safeguarding.get("level") == "urgent" else "high"
        alerts.append(
            OperationalAlert(
                alert_id=_make_alert_id("safeguarding", len(alerts) + 1),
                alert_type="safeguarding_escalation",
                title="Safeguarding escalation visible",
                severity=severity,
                audience=audience,
                reason=f"Safeguarding level is {safeguarding.get('level')} based on visible indicators.",
                recommended_action="Check immediate safety, manager/on-call escalation and whether external safeguarding procedures are required.",
                evidence_refs=_refs_from_items(safeguarding.get("indicators")),
                created_at=now,
            )
        )

    for item in escalation.get("alerts", [])[:6] if isinstance(escalation.get("alerts"), list) else []:
        if not isinstance(item, dict):
            continue
        severity_text = _safe_string(item.get("severity"))
        severity = "critical" if severity_text == "urgent" else "high" if severity_text == "high" else "medium"
        alerts.append(
            OperationalAlert(
                alert_id=_make_alert_id("escalation", len(alerts) + 1),
                alert_type="escalation_monitoring",
                title=_safe_string(item.get("title")) or "Escalation alert",
                severity=severity,
                audience=audience,
                reason=_safe_string(item.get("reason")),
                recommended_action=_safe_string(item.get("recommended_action")),
                evidence_refs=[_safe_string(ref) for ref in item.get("evidence_refs", []) if _safe_string(ref)] if isinstance(item.get("evidence_refs"), list) else [],
                created_at=now,
            )
        )

    if risk.get("trajectory") == "escalating":
        alerts.append(
            OperationalAlert(
                alert_id=_make_alert_id("risk", len(alerts) + 1),
                alert_type="risk_trajectory",
                title="Risk trajectory appears escalating",
                severity="high",
                audience=audience,
                reason="Visible evidence suggests risk may be escalating over time.",
                recommended_action="Review current risk controls, care plans, supervision and management follow-through.",
                evidence_refs=_refs_from_items(risk.get("points")),
                created_at=now,
            )
        )

    if int(actions.get("open_count") or 0) >= 3 or int(actions.get("gap_count") or 0) >= 3:
        alerts.append(
            OperationalAlert(
                alert_id=_make_alert_id("actions", len(alerts) + 1),
                alert_type="action_drift",
                title="Open actions or quality gaps require review",
                severity="high" if int(actions.get("open_count") or 0) >= 5 or int(actions.get("gap_count") or 0) >= 5 else "medium",
                audience=audience,
                reason=f"Visible action intelligence shows {actions.get('open_count', 0)} open action(s) and {actions.get('gap_count', 0)} quality gap(s).",
                recommended_action="Clarify action ownership, due dates, completion evidence and management sign-off.",
                evidence_refs=_refs_from_items(actions.get("actions")),
                created_at=now,
            )
        )

    for concern in regulatory.get("concerns", [])[:6] if isinstance(regulatory.get("concerns"), list) else []:
        if not isinstance(concern, dict):
            continue
        concern_severity = _safe_string(concern.get("severity"))
        alerts.append(
            OperationalAlert(
                alert_id=_make_alert_id("regulatory", len(alerts) + 1),
                alert_type="regulatory_concern_review",
                title=_safe_string(concern.get("concern")) or "Regulatory concern for review",
                severity="high" if concern_severity in {"urgent", "high"} else "medium",
                audience=audience,
                reason=_safe_string(concern.get("rationale")),
                recommended_action="Review the concern with the registered manager/RI and record professional judgement, actions and impact.",
                evidence_refs=[_safe_string(ref) for ref in concern.get("evidence_refs", []) if _safe_string(ref)] if isinstance(concern.get("evidence_refs"), list) else [],
                created_at=now,
            )
        )

    alerts = _dedupe_alerts(alerts)[:20]

    warnings: list[str] = []
    for payload in (safeguarding, escalation, risk, actions, regulatory):
        maybe = payload.get("warnings") if isinstance(payload, dict) else []
        if isinstance(maybe, list):
            warnings.extend(_safe_string(item) for item in maybe if _safe_string(item))

    return RealTimeAlertResult(
        alert_level=_alert_level(alerts),
        evidence_count=len(evidence),
        alerts=alerts,
        source_modules={
            "safeguarding": safeguarding,
            "escalation": escalation,
            "risk_trajectory": risk,
            "actions": actions,
            "regulatory_concerns": regulatory,
        },
        warnings=sorted(set(warnings)),
    )


def serialise_real_time_alerts(result: RealTimeAlertResult) -> dict[str, Any]:
    return {
        "alert_level": result.alert_level,
        "evidence_count": result.evidence_count,
        "warnings": result.warnings,
        "alerts": [
            {
                "alert_id": item.alert_id,
                "alert_type": item.alert_type,
                "title": item.title,
                "severity": item.severity,
                "audience": item.audience,
                "reason": item.reason,
                "recommended_action": item.recommended_action,
                "evidence_refs": item.evidence_refs,
                "created_at": item.created_at,
            }
            for item in result.alerts
        ],
        "source_modules": result.source_modules,
    }


def build_real_time_alerts_prompt_block(result: RealTimeAlertResult) -> str:
    lines = [
        "REAL-TIME OPERATIONAL ALERT CONTEXT",
        "Use this as alert context only. Do not replace safeguarding procedures or professional judgement.",
        f"Alert level: {result.alert_level}. Evidence count: {result.evidence_count}.",
        "",
    ]

    if result.alerts:
        lines.append("Alerts:")
        for alert in result.alerts[:12]:
            refs = " ".join(alert.evidence_refs)
            lines.append(f"- {alert.severity.upper()} {alert.title}: {alert.reason} Action: {alert.recommended_action} {refs}".strip())

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings[:12]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
