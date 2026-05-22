from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from repositories.isn_repository import isn_repository

INTERVENTION_KEYWORDS = {
    "return_home_interview": ["return home", "rhi", "return interview"],
    "strategy_meeting": ["strategy meeting", "contextual safeguarding meeting"],
    "police_disruption": ["police", "disruption", "intel shared"],
    "transport_intervention": ["station", "taxi", "transport"],
    "therapeutic_support": ["therapy", "therapeutic", "wellbeing"],
    "placement_action": ["placement", "move", "matching"],
}


class ISNInterventionTrackerService:
    """Tracks safeguarding interventions and contextual impact indicators."""

    def __init__(self, repository=isn_repository):
        self.repository = repository

    def interventions(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        young_person_id: int | None = None,
        limit: int = 1000,
    ) -> dict[str, Any]:
        signals = self.repository.list_signals(
            conn,
            current_user=current_user,
            filters={"young_person_id": young_person_id} if young_person_id else {},
            limit=limit,
        )

        grouped: dict[str, dict[str, Any]] = defaultdict(
            lambda: {
                "count": 0,
                "linked_signal_ids": [],
                "risk_levels": Counter(),
            }
        )

        for signal in signals:
            text = " ".join(
                str(value or "")
                for value in [signal.summary, signal.intelligence_notes]
            ).lower()

            for intervention, keywords in INTERVENTION_KEYWORDS.items():
                if any(keyword in text for keyword in keywords):
                    grouped[intervention]["count"] += 1
                    grouped[intervention]["linked_signal_ids"].append(signal.id)
                    grouped[intervention]["risk_levels"][signal.risk_level] += 1

        output = []
        for intervention, data in grouped.items():
            output.append(
                {
                    "intervention": intervention,
                    "count": data["count"],
                    "linked_signal_ids": data["linked_signal_ids"],
                    "highest_risk": self._highest_risk(data["risk_levels"]),
                    "contextual_effectiveness": self._effectiveness(data["risk_levels"]),
                }
            )

        output.sort(key=lambda item: item["count"], reverse=True)

        return {
            "ok": True,
            "country": "UK",
            "young_person_id": young_person_id,
            "interventions": output,
            "total": len(output),
        }

    def _highest_risk(self, risks: Counter[str]) -> str:
        for risk in ["critical", "high", "medium", "low"]:
            if risks.get(risk):
                return risk
        return "low"

    def _effectiveness(self, risks: Counter[str]) -> str:
        if risks.get("critical"):
            return "ongoing_high_contextual_pressure"
        if risks.get("high"):
            return "requires_review"
        return "stabilising"


isn_intervention_tracker_service = ISNInterventionTrackerService()
