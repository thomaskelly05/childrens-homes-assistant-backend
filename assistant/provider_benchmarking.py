from __future__ import annotations

"""Provider benchmarking for IndiCare OS assistant.

This module compares visible home-level quality, safeguarding and governance
signals across homes. It is not punitive, does not predict Ofsted grades and does
not make final compliance judgements. It helps providers/RIs identify where
support, assurance or evidence strengthening may be needed.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.home_quality_trends import build_home_quality_trend, serialise_home_quality_trend
from assistant.inspection_readiness import build_inspection_readiness, serialise_inspection_readiness
from assistant.quality_scoring import build_quality_score, serialise_quality_score


@dataclass(frozen=True)
class HomeBenchmark:
    home_id: str
    home_name: str
    evidence_count: int
    quality_score: int
    quality_level: str
    inspection_score: int
    inspection_level: str
    home_trend: str
    confidence: str
    support_priority: str
    strengths: list[str] = field(default_factory=list)
    concerns: list[str] = field(default_factory=list)
    recommended_actions: list[str] = field(default_factory=list)
    source_modules: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ProviderBenchmarkingResult:
    provider_level: str
    home_count: int
    evidence_count: int
    benchmarks: list[HomeBenchmark] = field(default_factory=list)
    high_support_homes: list[HomeBenchmark] = field(default_factory=list)
    provider_strengths: list[str] = field(default_factory=list)
    provider_concerns: list[str] = field(default_factory=list)
    provider_actions: list[str] = field(default_factory=list)
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


def _home_id(home: dict[str, Any], index: int) -> str:
    return _safe_string(home.get("home_id") or home.get("id") or index)


def _home_name(home: dict[str, Any], index: int) -> str:
    return _safe_string(home.get("home_name") or home.get("name") or f"Home {index}")


def _home_evidence(home: dict[str, Any]) -> list[dict[str, Any]]:
    evidence = home.get("evidence_index") or home.get("evidence") or home.get("sources")
    return evidence if isinstance(evidence, list) else []


def _support_priority(quality_score: int, inspection_score: int, trend: str) -> str:
    if trend == "deteriorating_or_high_attention" or quality_score < 45 or inspection_score < 45:
        return "high"
    if trend == "watching_brief" or quality_score < 65 or inspection_score < 65:
        return "medium"
    return "routine"


def _build_home_benchmark(home: dict[str, Any], index: int) -> HomeBenchmark:
    evidence = _home_evidence(home)
    quality = serialise_quality_score(build_quality_score(evidence_index=evidence))
    readiness = serialise_inspection_readiness(build_inspection_readiness(evidence_index=evidence))
    trend = serialise_home_quality_trend(build_home_quality_trend(evidence_index=evidence))

    quality_score = int(quality.get("overall_score") or 0)
    inspection_score = int(readiness.get("overall_score") or 0)
    home_trend = _safe_string(trend.get("trend")) or "unknown"

    return HomeBenchmark(
        home_id=_home_id(home, index),
        home_name=_home_name(home, index),
        evidence_count=len(evidence),
        quality_score=quality_score,
        quality_level=_safe_string(quality.get("overall_level")) or "unknown",
        inspection_score=inspection_score,
        inspection_level=_safe_string(readiness.get("overall_level")) or "unknown",
        home_trend=home_trend,
        confidence=_safe_string(trend.get("confidence")) or "low",
        support_priority=_support_priority(quality_score, inspection_score, home_trend),
        strengths=list(quality.get("strengths") or [])[:5],
        concerns=list(quality.get("concerns") or [])[:5],
        recommended_actions=_dedupe(list(quality.get("recommended_actions") or []) + list(readiness.get("immediate_actions") or []))[:8],
        source_modules={
            "quality_score": quality,
            "inspection_readiness": readiness,
            "home_quality_trend": trend,
        },
    )


def _provider_level(benchmarks: list[HomeBenchmark]) -> str:
    if not benchmarks:
        return "unknown"
    high = len([item for item in benchmarks if item.support_priority == "high"])
    medium = len([item for item in benchmarks if item.support_priority == "medium"])
    if high >= max(1, len(benchmarks) // 2):
        return "provider_high_support_required"
    if high:
        return "targeted_high_support_required"
    if medium:
        return "provider_developing_with_targeted_support"
    return "provider_routine_assurance"


def build_provider_benchmarking(
    *,
    homes: list[dict[str, Any]] | None,
) -> ProviderBenchmarkingResult:
    safe_homes = homes if isinstance(homes, list) else []
    if not safe_homes:
        return ProviderBenchmarkingResult(
            provider_level="unknown",
            home_count=0,
            evidence_count=0,
            provider_actions=["Attach home-level evidence before producing provider benchmarking."],
            warnings=["no_visible_home_evidence_for_provider_benchmarking"],
        )

    benchmarks = [
        _build_home_benchmark(home, index + 1)
        for index, home in enumerate(safe_homes)
        if isinstance(home, dict)
    ]

    benchmarks = sorted(
        benchmarks,
        key=lambda item: ({"high": 3, "medium": 2, "routine": 1}.get(item.support_priority, 0), -item.quality_score),
        reverse=True,
    )

    high_support = [item for item in benchmarks if item.support_priority == "high"]

    strengths: list[str] = []
    concerns: list[str] = []
    actions: list[str] = []
    warnings: list[str] = []

    for item in benchmarks:
        for strength in item.strengths[:2]:
            strengths.append(f"{item.home_name}: {strength}")
        for concern in item.concerns[:3]:
            concerns.append(f"{item.home_name}: {concern}")
        if item.support_priority in {"high", "medium"}:
            actions.append(f"Review support needs for {item.home_name} ({item.support_priority} priority).")
            actions.extend(item.recommended_actions[:3])
        if item.evidence_count == 0:
            warnings.append(f"{item.home_name}: no visible evidence supplied.")

    return ProviderBenchmarkingResult(
        provider_level=_provider_level(benchmarks),
        home_count=len(benchmarks),
        evidence_count=sum(item.evidence_count for item in benchmarks),
        benchmarks=benchmarks,
        high_support_homes=high_support,
        provider_strengths=_dedupe(strengths)[:12],
        provider_concerns=_dedupe(concerns)[:12],
        provider_actions=_dedupe(actions)[:15],
        warnings=_dedupe(warnings),
    )


def serialise_provider_benchmarking(result: ProviderBenchmarkingResult) -> dict[str, Any]:
    def benchmark_payload(item: HomeBenchmark) -> dict[str, Any]:
        return {
            "home_id": item.home_id,
            "home_name": item.home_name,
            "evidence_count": item.evidence_count,
            "quality_score": item.quality_score,
            "quality_level": item.quality_level,
            "inspection_score": item.inspection_score,
            "inspection_level": item.inspection_level,
            "home_trend": item.home_trend,
            "confidence": item.confidence,
            "support_priority": item.support_priority,
            "strengths": item.strengths,
            "concerns": item.concerns,
            "recommended_actions": item.recommended_actions,
            "source_modules": item.source_modules,
        }

    return {
        "provider_level": result.provider_level,
        "home_count": result.home_count,
        "evidence_count": result.evidence_count,
        "provider_strengths": result.provider_strengths,
        "provider_concerns": result.provider_concerns,
        "provider_actions": result.provider_actions,
        "warnings": result.warnings,
        "benchmarks": [benchmark_payload(item) for item in result.benchmarks],
        "high_support_homes": [benchmark_payload(item) for item in result.high_support_homes],
    }


def build_provider_benchmarking_prompt_block(result: ProviderBenchmarkingResult) -> str:
    lines = [
        "PROVIDER BENCHMARKING CONTEXT",
        "Use this as internal provider assurance only. Do not rank homes punitively, predict Ofsted grades or make final compliance judgements.",
        f"Provider level: {result.provider_level}. Homes: {result.home_count}. Evidence count: {result.evidence_count}.",
        "",
    ]

    if result.benchmarks:
        lines.append("Home benchmarking summary:")
        for item in result.benchmarks[:10]:
            lines.append(
                f"- {item.home_name}: quality {item.quality_score}/100 ({item.quality_level}), inspection evidence {item.inspection_score}/100 ({item.inspection_level}), support priority {item.support_priority}."
            )

    if result.provider_concerns:
        lines.append("")
        lines.append("Provider concerns:")
        for concern in result.provider_concerns[:10]:
            lines.append(f"- {concern}")

    if result.provider_actions:
        lines.append("")
        lines.append("Provider actions:")
        for action in result.provider_actions[:12]:
            lines.append(f"- {action}")

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings[:10]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
