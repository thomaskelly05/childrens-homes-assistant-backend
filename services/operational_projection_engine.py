from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class OperationalProjection:
    subject_type: str
    subject_id: str | None
    emotional_trend: dict[str, Any]
    safeguarding_escalation: dict[str, Any]
    placement_stability: dict[str, Any]
    relationship_map: dict[str, Any]
    manager_attention: list[str]
    orb_memory_summary: str

    def model_dump(self) -> dict[str, Any]:
        return self.__dict__


class OperationalProjectionEngine:
    def project(self, events: list[dict[str, Any]], *, subject_type: str = "child", subject_id: str | None = None) -> OperationalProjection:
        total = len(events)
        safeguarding_count = sum(1 for event in events if event.get("safeguarding"))
        review_count = sum(1 for event in events if event.get("requires_review"))
        child_voice_count = sum(1 for event in events if event.get("child_voice_present"))

        emotional_counter: Counter[str] = Counter()
        relationship_counter: Counter[str] = Counter()
        risk_counter: Counter[str] = Counter()
        for event in events:
            emotional_counter.update(event.get("emotional_tags") or [])
            relationship_counter.update(event.get("relationship_tags") or [])
            risk_counter.update(event.get("risk_tags") or [])

        emotional_trend = self._emotional_trend(emotional_counter, total)
        safeguarding_escalation = self._safeguarding_escalation(safeguarding_count, risk_counter, total)
        placement_stability = self._placement_stability(safeguarding_count, review_count, total)
        relationship_map = {
            "strongest_themes": relationship_counter.most_common(5),
            "trusted_adult_signals": [item for item, _count in relationship_counter.most_common() if item in {"staff", "professional"}],
            "family_signals": [item for item, _count in relationship_counter.most_common() if item in {"family", "mum", "dad"}],
        }

        manager_attention: list[str] = []
        if review_count:
            manager_attention.append(f"{review_count} event(s) need manager review.")
        if safeguarding_count:
            manager_attention.append(f"{safeguarding_count} safeguarding-linked event(s) detected.")
        if total and child_voice_count / total < 0.5:
            manager_attention.append("Child voice is missing or weak across recent records.")
        if not manager_attention:
            manager_attention.append("No immediate management escalation detected from the supplied events.")

        orb_memory_summary = self._summary(
            total=total,
            emotional_trend=emotional_trend,
            safeguarding_escalation=safeguarding_escalation,
            placement_stability=placement_stability,
            child_voice_count=child_voice_count,
        )

        return OperationalProjection(
            subject_type=subject_type,
            subject_id=subject_id,
            emotional_trend=emotional_trend,
            safeguarding_escalation=safeguarding_escalation,
            placement_stability=placement_stability,
            relationship_map=relationship_map,
            manager_attention=manager_attention,
            orb_memory_summary=orb_memory_summary,
        )

    def _emotional_trend(self, counter: Counter[str], total: int) -> dict[str, Any]:
        if not total:
            return {"trend": "unknown", "confidence": 0.0, "drivers": []}
        negative = sum(counter.get(term, 0) for term in ["distressed", "dysregulated", "anxious", "withdrawn"])
        positive = sum(counter.get(term, 0) for term in ["calm", "happy"])
        if positive > negative:
            trend = "improving_or_settled"
        elif negative > positive:
            trend = "heightened_or_unsettled"
        else:
            trend = "mixed"
        return {"trend": trend, "confidence": round(min(0.95, (positive + negative) / max(1, total)), 2), "drivers": counter.most_common(5)}

    def _safeguarding_escalation(self, safeguarding_count: int, risks: Counter[str], total: int) -> dict[str, Any]:
        if not total:
            return {"risk": "unknown", "confidence": 0.0, "drivers": []}
        ratio = safeguarding_count / total
        risk = "high" if ratio >= 0.4 else "moderate" if ratio else "low"
        return {"risk": risk, "confidence": round(min(0.95, ratio + 0.2 if ratio else 0.5), 2), "drivers": risks.most_common(5)}

    def _placement_stability(self, safeguarding_count: int, review_count: int, total: int) -> dict[str, Any]:
        if not total:
            return {"stability": "unknown", "confidence": 0.0}
        pressure = safeguarding_count + review_count
        stability = "fragile" if pressure >= 3 else "watching" if pressure else "stable"
        return {"stability": stability, "confidence": round(min(0.95, 0.45 + pressure / max(1, total)), 2)}

    def _summary(self, *, total: int, emotional_trend: dict[str, Any], safeguarding_escalation: dict[str, Any], placement_stability: dict[str, Any], child_voice_count: int) -> str:
        if not total:
            return "There is not yet enough operational evidence to form a reliable pattern."
        return (
            f"Recent records show {emotional_trend['trend']} emotional presentation, "
            f"{safeguarding_escalation['risk']} safeguarding pressure, and "
            f"{placement_stability['stability']} placement stability. "
            f"Child voice is present in {child_voice_count} of {total} event(s)."
        )


operational_projection_engine = OperationalProjectionEngine()
