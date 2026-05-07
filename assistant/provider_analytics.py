from __future__ import annotations

"""Provider analytics for IndiCare OS assistant.

This module aggregates visible home-level analytics into a provider/RI view.
It is intentionally conservative: it does not predict Ofsted outcomes, compare
homes unfairly, or make final compliance judgements. It highlights where visible
evidence suggests strengths, vulnerabilities and provider actions.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.home_quality_trends import build_home_quality_trend, serialise_home_quality_trend


HIGH_ATTENTION_TRENDS = {"deteriorating_or_high_attention", "watching_brief"}
POSITIVE_TRENDS = {"improving_or_well_controlled", "stable_or_mixed"}


@dataclass(frozen=True)
class ProviderHomeAnalytics:
    home_id: str
    home_name: str
    trend: str
    confidence: str
    evidence_count: int
    priority_actions: list[str] = field(default_factory=list)
    vulnerabilities: list[str] = field(default_factory=list)
    strengths: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    raw_home_quality: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ProviderAnalyticsResult:
    provider_trend: str
    confidence: str
    home_count: int
    evidence_count: int
    high_attention_homes: list[ProviderHomeAnalytics] = field(default_factory=list)
    positive_or_stable_homes: list[ProviderHomeAnalytics] = field(default_factory=list)
    provider_headlines: list[str] = field(default_factory=list)
    provider_actions: list[str] = field(default_factory=list)
    cross_home_vulnerabilities: list[str] = field(default_factory=list)
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


def _home_id(home_payload: dict[str, Any], fallback: int) -> str:
    return _safe_string(home_payload.get("home_id") or home_payload.get("id") or fallback)


def _home_name(home_payload: dict[str, Any], fallback: int) -> str:
    return _safe_string(home_payload.get("home_name") or home_payload.get("name") or f"Home {fallback}")


def _home_evidence(home_payload: dict[str, Any]) -> list[dict[str, Any]]:
    evidence = home_payload.get("evidence_index") or home_payload.get("evidence") or home_payload.get("sources")
    return evidence if isinstance(evidence, list) else []


def _build_home_analytics(home_payload: dict[str, Any], fallback_index: int) -> ProviderHomeAnalytics:
    evidence = _home_evidence(home_payload)
    trend = build_home_quality_trend(evidence_index=evidence)
    trend_payload = serialise_home_quality_trend(trend)

    return ProviderHomeAnalytics(
        home_id=_home_id(home_payload, fallback_index),
        home_name=_home_name(home_payload, fallback_index),
        trend=trend.trend,
        confidence=trend.confidence,
        evidence_count=trend.evidence_count,
        priority_actions=trend.priority_actions,
        vulnerabilities=trend.vulnerabilities,
        strengths=trend.strengths,
        warnings=trend.warnings,
        raw_home_quality=trend_payload,
    )


def _derive_provider_trend(home_analytics: list[ProviderHomeAnalytics]) -> tuple[str, str]:
    if not home_analytics:
        return "unknown", "low"

    high_attention = len([home for home in home_analytics if home.trend in HIGH_ATTENTION_TRENDS])
    positive = len([home for home in home_analytics if home.trend in POSITIVE_TRENDS])
    total = len(home_analytics)

    if high_attention >= max(1, total // 2):
        trend = "provider_high_attention"
    elif high_attention:
        trend = "provider_mixed_with_targeted_risk"
    elif positive == total:
        trend = "provider_stable_or_improving"
    else:
        trend = "provider_mixed_or_unclear"

    medium_confidence = len([home for home in home_analytics if home.confidence == "medium"])
    confidence = "medium" if medium_confidence >= max(1, total // 2) else "working"
    return trend, confidence


def build_provider_analytics(
    *,
    homes: list[dict[str, Any]] | None,
) -> ProviderAnalyticsResult:
    safe_homes = homes if isinstance(homes, list) else []
    if not safe_homes:
        return ProviderAnalyticsResult(
            provider_trend="unknown",
            confidence="low",
            home_count=0,
            evidence_count=0,
            warnings=["no_visible_home_evidence_for_provider_analytics"],
            provider_actions=["Attach home-level evidence before drawing provider-level conclusions."],
        )

    home_analytics = [
        _build_home_analytics(home, index + 1)
        for index, home in enumerate(safe_homes)
        if isinstance(home, dict)
    ]

    trend, confidence = _derive_provider_trend(home_analytics)
    evidence_count = sum(home.evidence_count for home in home_analytics)

    high_attention = [home for home in home_analytics if home.trend in HIGH_ATTENTION_TRENDS]
    positive_or_stable = [home for home in home_analytics if home.trend in POSITIVE_TRENDS]

    headlines: list[str] = [
        f"Provider trend appears {trend.replace('_', ' ')} across {len(home_analytics)} visible home(s).",
    ]
    if high_attention:
        headlines.append(f"{len(high_attention)} home(s) require higher attention based on visible evidence.")
    if positive_or_stable:
        headlines.append(f"{len(positive_or_stable)} home(s) appear stable or improving based on visible evidence.")

    provider_actions: list[str] = []
    for home in high_attention[:5]:
        provider_actions.append(f"Review {home.home_name}: {home.trend.replace('_', ' ')}.")
        provider_actions.extend(home.priority_actions[:3])

    vulnerabilities: list[str] = []
    for home in high_attention[:5]:
        for vulnerability in home.vulnerabilities[:3]:
            vulnerabilities.append(f"{home.home_name}: {vulnerability}")

    warnings: list[str] = []
    for home in home_analytics:
        for warning in home.warnings:
            warnings.append(f"{home.home_name}: {warning}")

    return ProviderAnalyticsResult(
        provider_trend=trend,
        confidence=confidence,
        home_count=len(home_analytics),
        evidence_count=evidence_count,
        high_attention_homes=high_attention,
        positive_or_stable_homes=positive_or_stable,
        provider_headlines=_dedupe(headlines),
        provider_actions=_dedupe(provider_actions)[:15],
        cross_home_vulnerabilities=_dedupe(vulnerabilities)[:15],
        warnings=_dedupe(warnings),
    )


def serialise_provider_analytics(result: ProviderAnalyticsResult) -> dict[str, Any]:
    def home_payload(home: ProviderHomeAnalytics) -> dict[str, Any]:
        return {
            "home_id": home.home_id,
            "home_name": home.home_name,
            "trend": home.trend,
            "confidence": home.confidence,
            "evidence_count": home.evidence_count,
            "priority_actions": home.priority_actions,
            "vulnerabilities": home.vulnerabilities,
            "strengths": home.strengths,
            "warnings": home.warnings,
            "home_quality": home.raw_home_quality,
        }

    return {
        "provider_trend": result.provider_trend,
        "confidence": result.confidence,
        "home_count": result.home_count,
        "evidence_count": result.evidence_count,
        "provider_headlines": result.provider_headlines,
        "provider_actions": result.provider_actions,
        "cross_home_vulnerabilities": result.cross_home_vulnerabilities,
        "warnings": result.warnings,
        "high_attention_homes": [home_payload(home) for home in result.high_attention_homes],
        "positive_or_stable_homes": [home_payload(home) for home in result.positive_or_stable_homes],
    }


def build_provider_analytics_prompt_block(result: ProviderAnalyticsResult) -> str:
    lines = [
        "PROVIDER ANALYTICS CONTEXT",
        "Use this as RI/provider governance intelligence. Do not predict Ofsted grades or make final compliance judgements.",
        f"Provider trend: {result.provider_trend}. Confidence: {result.confidence}. Homes: {result.home_count}. Evidence count: {result.evidence_count}.",
        "",
    ]

    if result.provider_headlines:
        lines.append("Provider headlines:")
        for item in result.provider_headlines:
            lines.append(f"- {item}")

    if result.high_attention_homes:
        lines.append("")
        lines.append("High-attention homes:")
        for home in result.high_attention_homes[:8]:
            lines.append(f"- {home.home_name}: {home.trend} ({home.confidence}).")

    if result.cross_home_vulnerabilities:
        lines.append("")
        lines.append("Cross-home vulnerabilities:")
        for item in result.cross_home_vulnerabilities[:12]:
            lines.append(f"- {item}")

    if result.provider_actions:
        lines.append("")
        lines.append("Provider actions:")
        for item in result.provider_actions[:12]:
            lines.append(f"- {item}")

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings[:12]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
