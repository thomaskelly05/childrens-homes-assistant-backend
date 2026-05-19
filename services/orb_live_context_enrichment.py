from __future__ import annotations

from typing import Any

from services.orb_emotional_safety_service import orb_emotional_safety_service
from services.orb_emotional_state_service import orb_emotional_state_service
from services.orb_risk_intelligence_service import orb_risk_intelligence_service


class OrbLiveContextEnrichment:
    """Converges existing ORB emotional and risk services into the live ORB pathway."""

    def enrich(self, *, message: str, context: dict[str, Any]) -> dict[str, Any]:
        chronology = list(context.get("chronology") or [])
        safeguarding = list(context.get("safeguarding") or [])
        combined = [*chronology, *safeguarding]

        emotional_state = orb_emotional_state_service.assess(
            signals={
                "safeguarding": bool(safeguarding),
                "help_requests": 1 if "help" in message.lower() else 0,
            },
            workflow="safeguarding" if safeguarding else None,
        )

        emotional_safety = orb_emotional_safety_service.evaluate(
            text=message,
            signals={
                "safeguarding": bool(safeguarding),
                "chronology_records": len(combined),
            },
        )

        risk_intelligence = {}
        child = context.get("child_profile") or {}
        child_id = child.get("id") if isinstance(child, dict) else None
        if child_id:
            try:
                risk_intelligence = orb_risk_intelligence_service.answer(
                    question=message,
                    active_young_person_id=child_id,
                    records=combined,
                    missing_episodes=safeguarding,
                    home_id=context.get("home_id"),
                )
            except Exception:
                risk_intelligence = {
                    "answer": ["Risk intelligence could not fully calculate from the current live context."]
                }

        return {
            "emotional_state": emotional_state,
            "emotional_safety": emotional_safety,
            "risk_intelligence": risk_intelligence,
        }


orb_live_context_enrichment = OrbLiveContextEnrichment()
