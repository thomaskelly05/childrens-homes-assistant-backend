from __future__ import annotations

"""Operational dashboard payload builder for IndiCare OS assistant.

This module produces a consolidated, frontend/API-friendly dashboard payload
from visible scoped evidence. It is intentionally read-only and conservative:
no Ofsted grade predictions, no final safeguarding threshold decisions, and no
uncited operational conclusions.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.action_extraction import extract_actions, serialise_action_extraction
from assistant.escalation_monitoring import build_escalation_monitoring, serialise_escalation_monitoring
from assistant.home_quality_trends import build_home_quality_trend, serialise_home_quality_trend
from assistant.inspection_readiness import build_inspection_readiness, serialise_inspection_readiness
from assistant.management_oversight import build_management_oversight, serialise_management_oversight
from assistant.pattern_detection import detect_patterns, serialise_pattern_detection
from assistant.reg45_builder import build_reg45_review_context, serialise_reg45_review_context
from assistant.risk_trajectory import build_risk_trajectory, serialise_risk_trajectory
from assistant.safeguarding_escalation import build_safeguarding_escalation, serialise_safeguarding_escalation
from assistant.smart_recommendations import build_smart_recommendations, serialise_smart_recommendations
from assistant.what_changed import build_what_changed, serialise_what_changed


@dataclass(frozen=True)
class DashboardCard:
    key: str
    title: str
    status: str
    summary: str
    priority: str
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class OperationalDashboard:
    scope_type: str
    evidence_count: int
    cards: list[DashboardCard] = field(default_factory=list)
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


def _priority_from_status(status: str) -> str:
    if status in {"urgent", "urgent_review_required", "high_attention", "deteriorating_or_high_attention"}:
        return "high"
    if status in {"heightened", "watching_brief", "limited", "weak", "developing_with_gaps"}:
        return "medium"
    return "normal"


def _card(key: str, title: str, status: str, summary: str, payload: dict[str, Any]) -> DashboardCard:
    return DashboardCard(
        key=key,
        title=title,
        status=status,
        summary=summary,
        priority=_priority_from_status(status),
        payload=payload,
    )


def build_operational_dashboard(
    *,
    evidence_index: list[dict[str, Any]] | None,
    scope_type: str = "home",
    user_role: str = "manager",
) -> OperationalDashboard:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    if not evidence:
        return OperationalDashboard(
            scope_type=scope_type,
            evidence_count=0,
            cards=[
                DashboardCard(
                    key="evidence",
                    title="Evidence required",
                    status="unknown",
                    summary="No visible scoped evidence is attached, so operational dashboard conclusions are unavailable.",
                    priority="high",
                    payload={},
                )
            ],
            source_modules={},
            warnings=["no_visible_evidence_for_operational_dashboard"],
        )

    safeguarding = serialise_safeguarding_escalation(build_safeguarding_escalation(evidence_index=evidence))
    escalation = serialise_escalation_monitoring(build_escalation_monitoring(evidence_index=evidence))
    what_changed = serialise_what_changed(build_what_changed(evidence_index=evidence))
    risk = serialise_risk_trajectory(build_risk_trajectory(evidence_index=evidence))
    patterns = serialise_pattern_detection(detect_patterns(evidence_index=evidence))
    actions = serialise_action_extraction(extract_actions(evidence_index=evidence))
    oversight = serialise_management_oversight(build_management_oversight(evidence_index=evidence))
    readiness = serialise_inspection_readiness(build_inspection_readiness(evidence_index=evidence))
    reg45 = serialise_reg45_review_context(build_reg45_review_context(evidence_index=evidence))
    recommendations = serialise_smart_recommendations(build_smart_recommendations(evidence_index=evidence, user_role=user_role))
    home_quality = serialise_home_quality_trend(build_home_quality_trend(evidence_index=evidence)) if scope_type in {"home", "quality", "provider"} else {}

    source_modules = {
        "safeguarding": safeguarding,
        "escalation": escalation,
        "what_changed": what_changed,
        "risk_trajectory": risk,
        "patterns": patterns,
        "actions": actions,
        "management_oversight": oversight,
        "inspection_readiness": readiness,
        "reg45": reg45,
        "recommendations": recommendations,
        "home_quality": home_quality,
    }

    cards = [
        _card(
            "safeguarding",
            "Safeguarding",
            safeguarding.get("level", "unknown"),
            f"Safeguarding level: {safeguarding.get('level', 'unknown')}.",
            safeguarding,
        ),
        _card(
            "escalation",
            "Escalation monitoring",
            escalation.get("monitoring_level", "unknown"),
            f"{len(escalation.get('alerts', []))} escalation alert(s) visible.",
            escalation,
        ),
        _card(
            "what_changed",
            "What changed",
            "active" if what_changed.get("signals") else "limited",
            "; ".join(what_changed.get("headlines", [])[:2]) or "No clear change signals detected.",
            what_changed,
        ),
        _card(
            "risk_trajectory",
            "Risk trajectory",
            risk.get("trajectory", "unknown"),
            f"Risk trajectory: {risk.get('trajectory', 'unknown')} ({risk.get('confidence', 'low')} confidence).",
            risk,
        ),
        _card(
            "actions",
            "Actions",
            "open" if actions.get("open_count", 0) else "clear_or_limited",
            f"{actions.get('open_count', 0)} open action(s), {actions.get('gap_count', 0)} quality gap(s).",
            actions,
        ),
        _card(
            "inspection_readiness",
            "Inspection readiness",
            readiness.get("overall_level", "unknown"),
            f"Readiness: {readiness.get('overall_level', 'unknown')} ({readiness.get('overall_score', 0)}/100).",
            readiness,
        ),
        _card(
            "recommendations",
            "Recommendations",
            "active" if recommendations.get("recommendations") else "limited",
            f"{len(recommendations.get('recommendations', []))} recommendation(s) generated.",
            recommendations,
        ),
    ]

    if home_quality:
        cards.append(
            _card(
                "home_quality",
                "Home quality trend",
                home_quality.get("trend", "unknown"),
                f"Home trend: {home_quality.get('trend', 'unknown')} ({home_quality.get('confidence', 'low')} confidence).",
                home_quality,
            )
        )

    warnings: list[str] = []
    for payload in source_modules.values():
        if isinstance(payload, dict) and isinstance(payload.get("warnings"), list):
            warnings.extend(payload.get("warnings", []))

    return OperationalDashboard(
        scope_type=scope_type,
        evidence_count=len(evidence),
        cards=cards,
        source_modules=source_modules,
        warnings=_dedupe(warnings),
    )


def serialise_operational_dashboard(dashboard: OperationalDashboard) -> dict[str, Any]:
    return {
        "scope_type": dashboard.scope_type,
        "evidence_count": dashboard.evidence_count,
        "warnings": dashboard.warnings,
        "cards": [
            {
                "key": card.key,
                "title": card.title,
                "status": card.status,
                "summary": card.summary,
                "priority": card.priority,
                "payload": card.payload,
            }
            for card in dashboard.cards
        ],
        "source_modules": dashboard.source_modules,
    }


def build_operational_dashboard_prompt_block(dashboard: OperationalDashboard) -> str:
    lines = [
        "OPERATIONAL DASHBOARD CONTEXT",
        "Use this as a concise dashboard summary. Do not replace professional judgement or safeguarding procedures.",
        f"Scope: {dashboard.scope_type}. Evidence count: {dashboard.evidence_count}.",
        "",
    ]

    if dashboard.cards:
        lines.append("Dashboard cards:")
        for card in dashboard.cards:
            lines.append(f"- {card.priority.upper()} {card.title}: {card.status}. {card.summary}")

    if dashboard.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in dashboard.warnings[:12]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
