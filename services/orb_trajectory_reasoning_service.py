from __future__ import annotations

from typing import Any


class OrbTrajectoryReasoningService:
    """Lightweight longitudinal reasoning over live ORB operational context."""

    def build(self, context: dict[str, Any]) -> dict[str, Any]:
        chronology = list(context.get("chronology") or [])
        actions = list(context.get("actions") or [])
        safeguarding = list(context.get("safeguarding") or [])
        documents = list(context.get("documents") or [])

        chronology_count = len(chronology)
        safeguarding_count = len(safeguarding)
        overdue_actions = [a for a in actions if str(a.get("status") or "").lower() in {"overdue", "review"}]
        unsigned_docs = [d for d in documents if not d.get("signed_off")]

        trajectory = "stable_or_mixed"
        if safeguarding_count >= 3 or len(overdue_actions) >= 5:
            trajectory = "increasing_operational_pressure"
        elif chronology_count >= 5 and safeguarding_count == 0:
            trajectory = "consistent_operational_visibility"

        indicators: list[str] = []
        if safeguarding_count:
            indicators.append("Recent safeguarding visibility suggests increased manager review may be required.")
        if overdue_actions:
            indicators.append("Open or overdue actions may indicate operational drift if not reviewed promptly.")
        if unsigned_docs:
            indicators.append("Unsigned or unreviewed documents may weaken visible oversight evidence.")
        if chronology_count >= 5:
            indicators.append("Chronology density suggests enough operational material for reflective review and pattern analysis.")

        return {
            "trajectory": trajectory,
            "chronology_density": chronology_count,
            "safeguarding_density": safeguarding_count,
            "overdue_action_count": len(overdue_actions),
            "unsigned_document_count": len(unsigned_docs),
            "trajectory_indicators": indicators[:5],
        }


orb_trajectory_reasoning_service = OrbTrajectoryReasoningService()
