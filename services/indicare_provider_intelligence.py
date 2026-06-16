from __future__ import annotations

from dataclasses import dataclass, asdict
from statistics import mean
from typing import Any


@dataclass(frozen=True)
class ProviderHomeSignal:
    id: str
    name: str
    readiness: int
    safeguarding_status: str
    chronology_quality: str
    open_actions: int
    risk_level: str
    inspection_focus: list[str]


DEFAULT_HOME_SIGNALS = [
    ProviderHomeSignal(
        id="home-a",
        name="Home A",
        readiness=82,
        safeguarding_status="stable",
        chronology_quality="good",
        open_actions=3,
        risk_level="medium",
        inspection_focus=["Management oversight", "Chronology linkage"],
    ),
    ProviderHomeSignal(
        id="home-b",
        name="Home B",
        readiness=68,
        safeguarding_status="review",
        chronology_quality="gaps",
        open_actions=7,
        risk_level="high",
        inspection_focus=["Safeguarding escalation", "Chronology completeness", "Follow-up actions"],
    ),
    ProviderHomeSignal(
        id="home-c",
        name="Home C",
        readiness=91,
        safeguarding_status="stable",
        chronology_quality="strong",
        open_actions=1,
        risk_level="low",
        inspection_focus=["Evidence consistency"],
    ),
]


def provider_overview() -> dict[str, Any]:
    homes = [asdict(home) for home in DEFAULT_HOME_SIGNALS]
    readiness_scores = [home.readiness for home in DEFAULT_HOME_SIGNALS]
    open_actions = sum(home.open_actions for home in DEFAULT_HOME_SIGNALS)
    high_risk = [home for home in DEFAULT_HOME_SIGNALS if home.risk_level == "high"]

    return {
        "ok": True,
        "summary": {
            "average_readiness": round(mean(readiness_scores)),
            "connected_homes": len(DEFAULT_HOME_SIGNALS),
            "open_actions": open_actions,
            "high_risk_homes": len(high_risk),
            "enterprise_status": "provider_intelligence_online",
        },
        "homes": homes,
        "insights": provider_insights(DEFAULT_HOME_SIGNALS),
        "recommended_actions": recommended_actions(DEFAULT_HOME_SIGNALS),
    }


def provider_insights(homes: list[ProviderHomeSignal]) -> list[dict[str, Any]]:
    insights: list[dict[str, Any]] = []

    for home in homes:
        if home.risk_level == "high":
            insights.append({
                "title": f"{home.name} requires leadership attention",
                "body": "Safeguarding status, chronology gaps and open actions indicate a higher operational priority.",
                "priority": "high",
                "home_id": home.id,
            })

        if home.chronology_quality in {"gaps", "weak"}:
            insights.append({
                "title": f"Chronology quality gap in {home.name}",
                "body": "Review chronology entries for dates, times, action taken, outcomes and management oversight.",
                "priority": "medium",
                "home_id": home.id,
            })

        if home.open_actions >= 5:
            insights.append({
                "title": f"Open actions building in {home.name}",
                "body": "Check whether follow-up actions have clear owners, review dates and completion evidence.",
                "priority": "medium",
                "home_id": home.id,
            })

    if not insights:
        insights.append({
            "title": "Provider position stable",
            "body": "No high-priority provider-wide concerns detected in the current signal set.",
            "priority": "low",
            "home_id": None,
        })

    return insights[:8]


def recommended_actions(homes: list[ProviderHomeSignal]) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []

    for home in sorted(homes, key=lambda item: (item.risk_level != "high", item.readiness)):
        if home.readiness < 75:
            actions.append({
                "label": f"Create readiness plan for {home.name}",
                "prompt": f"Create an Inspection evidence preparation improvement plan for {home.name}, focusing on {', '.join(home.inspection_focus)}.",
                "feature": "inspection_readiness",
                "home_id": home.id,
            })

        if home.open_actions:
            actions.append({
                "label": f"Review open actions for {home.name}",
                "prompt": f"Review the open actions for {home.name} and produce a leadership follow-up plan.",
                "feature": "provider_actions",
                "home_id": home.id,
            })

    actions.append({
        "label": "Generate executive briefing",
        "prompt": "Create an executive provider briefing covering safeguarding, chronology quality, Inspection evidence preparation and unresolved actions.",
        "feature": "executive_briefing",
        "home_id": None,
    })

    return actions[:8]


def inspection_readiness_score(home_id: str | None = None) -> dict[str, Any]:
    homes = DEFAULT_HOME_SIGNALS if home_id is None else [home for home in DEFAULT_HOME_SIGNALS if home.id == home_id]
    if not homes:
        return {"ok": False, "detail": "Home not found"}

    score = round(mean([home.readiness for home in homes]))
    return {
        "ok": True,
        "score": score,
        "confidence": "high" if score >= 85 else "medium" if score >= 70 else "low",
        "domains": {
            "safeguarding": _domain_score(homes, "safeguarding"),
            "chronology": _domain_score(homes, "chronology"),
            "management_oversight": _domain_score(homes, "management"),
            "evidence_quality": _domain_score(homes, "evidence"),
        },
        "actions": recommended_actions(homes),
    }


def _domain_score(homes: list[ProviderHomeSignal], domain: str) -> int:
    base = round(mean([home.readiness for home in homes]))
    adjustment = {
        "safeguarding": -6 if any(home.safeguarding_status == "review" for home in homes) else 3,
        "chronology": -8 if any(home.chronology_quality == "gaps" for home in homes) else 4,
        "management": -4 if sum(home.open_actions for home in homes) > 5 else 2,
        "evidence": -5 if any(home.readiness < 75 for home in homes) else 3,
    }.get(domain, 0)
    return max(0, min(100, base + adjustment))
