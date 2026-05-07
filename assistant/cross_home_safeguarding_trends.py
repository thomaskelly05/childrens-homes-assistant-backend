from __future__ import annotations

"""Cross-home safeguarding trend intelligence for IndiCare OS assistant.

This module aggregates visible safeguarding evidence across homes for provider,
RI and quality oversight. It does not make final safeguarding threshold decisions
or compare homes punitively; it highlights visible recurring themes and homes
requiring attention.
"""

from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Any

from assistant.risk_trajectory import build_risk_trajectory, serialise_risk_trajectory
from assistant.safeguarding_escalation import build_safeguarding_escalation, serialise_safeguarding_escalation


SAFEGUARDING_THEMES: dict[str, set[str]] = {
    "missing_from_care": {"missing", "abscond", "not returned", "missing overnight"},
    "exploitation": {"exploitation", "county lines", "unknown adult", "unsafe adult", "criminal exploitation", "sexual exploitation"},
    "self_harm_or_mental_health": {"self-harm", "suicidal", "ligature", "overdose", "mental health", "camhs"},
    "violence_or_injury": {"assault", "injury", "weapon", "hospital", "restraint"},
    "allegation_or_lado": {"allegation", "lado", "strategy meeting"},
    "police_or_emergency": {"police", "999", "emergency"},
}


@dataclass(frozen=True)
class HomeSafeguardingTrend:
    home_id: str
    home_name: str
    safeguarding_level: str
    risk_trajectory: str
    evidence_count: int
    themes: dict[str, int] = field(default_factory=dict)
    evidence_refs: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class CrossHomeSafeguardingTrendResult:
    provider_safeguarding_level: str
    home_count: int
    evidence_count: int
    high_attention_homes: list[HomeSafeguardingTrend] = field(default_factory=list)
    recurring_themes: dict[str, int] = field(default_factory=dict)
    home_trends: list[HomeSafeguardingTrend] = field(default_factory=list)
    provider_actions: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _home_evidence(home: dict[str, Any]) -> list[dict[str, Any]]:
    evidence = home.get("evidence_index") or home.get("evidence") or home.get("sources")
    return evidence if isinstance(evidence, list) else []


def _home_id(home: dict[str, Any], index: int) -> str:
    return _safe_string(home.get("home_id") or home.get("id") or index)


def _home_name(home: dict[str, Any], index: int) -> str:
    return _safe_string(home.get("home_name") or home.get("name") or f"Home {index}")


def _text(item: dict[str, Any]) -> str:
    return " ".join(
        _safe_string(item.get(key))
        for key in ("label", "title", "excerpt", "summary", "description", "outcome", "notes")
    ).lower()


def _citation_ref(item: dict[str, Any]) -> str:
    citation = _safe_string(item.get("citation_ref"))
    if citation:
        return citation
    record_type = _safe_string(item.get("record_type") or item.get("type"))
    record_id = _safe_string(item.get("record_id") or item.get("id"))
    if record_type and record_id:
        return f"[{record_type}:{record_id}]"
    return ""


def _theme_counts(evidence: list[dict[str, Any]]) -> tuple[dict[str, int], list[str]]:
    counts: Counter[str] = Counter()
    refs: list[str] = []

    for item in evidence:
        if not isinstance(item, dict):
            continue
        text = _text(item)
        matched = False
        for theme, keywords in SAFEGUARDING_THEMES.items():
            if any(keyword in text for keyword in keywords):
                counts[theme] += 1
                matched = True
        if matched:
            ref = _citation_ref(item)
            if ref and ref not in refs:
                refs.append(ref)

    return dict(counts), refs[:8]


def _build_home_trend(home: dict[str, Any], index: int) -> HomeSafeguardingTrend:
    evidence = _home_evidence(home)
    safeguarding = serialise_safeguarding_escalation(build_safeguarding_escalation(evidence_index=evidence))
    risk = serialise_risk_trajectory(build_risk_trajectory(evidence_index=evidence))
    themes, refs = _theme_counts(evidence)

    warnings: list[str] = []
    for payload in (safeguarding, risk):
        maybe = payload.get("warnings") if isinstance(payload, dict) else []
        if isinstance(maybe, list):
            warnings.extend(_safe_string(item) for item in maybe if _safe_string(item))

    return HomeSafeguardingTrend(
        home_id=_home_id(home, index),
        home_name=_home_name(home, index),
        safeguarding_level=_safe_string(safeguarding.get("level")) or "unknown",
        risk_trajectory=_safe_string(risk.get("trajectory")) or "unknown",
        evidence_count=len(evidence),
        themes=themes,
        evidence_refs=refs,
        warnings=sorted(set(warnings)),
    )


def _provider_level(home_trends: list[HomeSafeguardingTrend]) -> str:
    if not home_trends:
        return "unknown"
    urgent = len([home for home in home_trends if home.safeguarding_level == "urgent"])
    heightened = len([home for home in home_trends if home.safeguarding_level == "heightened" or home.risk_trajectory == "escalating"])
    if urgent:
        return "urgent_review_required"
    if heightened >= max(1, len(home_trends) // 2):
        return "provider_high_attention"
    if heightened:
        return "targeted_safeguarding_attention"
    return "routine_monitoring"


def build_cross_home_safeguarding_trends(
    *,
    homes: list[dict[str, Any]] | None,
) -> CrossHomeSafeguardingTrendResult:
    safe_homes = homes if isinstance(homes, list) else []
    if not safe_homes:
        return CrossHomeSafeguardingTrendResult(
            provider_safeguarding_level="unknown",
            home_count=0,
            evidence_count=0,
            provider_actions=["Attach home-level evidence before drawing cross-home safeguarding conclusions."],
            warnings=["no_visible_home_evidence_for_cross_home_safeguarding_trends"],
        )

    home_trends = [
        _build_home_trend(home, index + 1)
        for index, home in enumerate(safe_homes)
        if isinstance(home, dict)
    ]

    theme_counter: Counter[str] = Counter()
    for home in home_trends:
        theme_counter.update(home.themes)

    high_attention = [
        home for home in home_trends
        if home.safeguarding_level in {"urgent", "heightened"} or home.risk_trajectory == "escalating"
    ]

    provider_actions: list[str] = []
    if high_attention:
        provider_actions.append("Review high-attention homes for safeguarding grip, escalation and follow-through evidence.")
    for home in high_attention[:6]:
        provider_actions.append(f"Review {home.home_name}: safeguarding level {home.safeguarding_level}, risk trajectory {home.risk_trajectory}.")
    if any(count >= 2 for count in theme_counter.values()):
        provider_actions.append("Review recurring safeguarding themes across homes for systemic learning and provider assurance.")

    warnings: list[str] = []
    for home in home_trends:
        warnings.extend(f"{home.home_name}: {warning}" for warning in home.warnings)

    return CrossHomeSafeguardingTrendResult(
        provider_safeguarding_level=_provider_level(home_trends),
        home_count=len(home_trends),
        evidence_count=sum(home.evidence_count for home in home_trends),
        high_attention_homes=high_attention,
        recurring_themes=dict(theme_counter.most_common()),
        home_trends=home_trends,
        provider_actions=provider_actions[:15],
        warnings=sorted(set(warnings)),
    )


def serialise_cross_home_safeguarding_trends(result: CrossHomeSafeguardingTrendResult) -> dict[str, Any]:
    def home_payload(home: HomeSafeguardingTrend) -> dict[str, Any]:
        return {
            "home_id": home.home_id,
            "home_name": home.home_name,
            "safeguarding_level": home.safeguarding_level,
            "risk_trajectory": home.risk_trajectory,
            "evidence_count": home.evidence_count,
            "themes": home.themes,
            "evidence_refs": home.evidence_refs,
            "warnings": home.warnings,
        }

    return {
        "provider_safeguarding_level": result.provider_safeguarding_level,
        "home_count": result.home_count,
        "evidence_count": result.evidence_count,
        "recurring_themes": result.recurring_themes,
        "provider_actions": result.provider_actions,
        "warnings": result.warnings,
        "high_attention_homes": [home_payload(home) for home in result.high_attention_homes],
        "home_trends": [home_payload(home) for home in result.home_trends],
    }


def build_cross_home_safeguarding_prompt_block(result: CrossHomeSafeguardingTrendResult) -> str:
    lines = [
        "CROSS-HOME SAFEGUARDING TRENDS CONTEXT",
        "Use this for provider/RI safeguarding oversight. Do not make final threshold decisions or compare homes punitively.",
        f"Provider safeguarding level: {result.provider_safeguarding_level}. Homes: {result.home_count}. Evidence count: {result.evidence_count}.",
        "",
    ]

    if result.recurring_themes:
        lines.append("Recurring themes:")
        for theme, count in list(result.recurring_themes.items())[:10]:
            lines.append(f"- {theme}: {count}")

    if result.high_attention_homes:
        lines.append("")
        lines.append("High-attention homes:")
        for home in result.high_attention_homes[:8]:
            refs = " ".join(home.evidence_refs[:5])
            lines.append(f"- {home.home_name}: {home.safeguarding_level}, {home.risk_trajectory}. {refs}".strip())

    if result.provider_actions:
        lines.append("")
        lines.append("Provider actions:")
        for action in result.provider_actions[:12]:
            lines.append(f"- {action}")

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings[:12]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
