from __future__ import annotations

from typing import Any

from services.workforce_intelligence_service import WorkforceIntelligenceService


class StaffWellbeingService:
    """Staff wellbeing signals converged from supervision, sickness and check-in data."""

    def __init__(self, workforce: WorkforceIntelligenceService | None = None) -> None:
        self._workforce = workforce or WorkforceIntelligenceService()

    def build(self, conn: Any, *, current_user: dict[str, Any], staff_id: int | None = None) -> dict[str, Any]:
        chronology = self._workforce.chronology(conn, current_user=current_user, staff_id=staff_id, limit=40)
        risk = self._workforce.risk(conn, current_user=current_user, staff_id=staff_id)
        wellbeing_events = [event for event in chronology.get("events", []) if event.get("event_type") == "wellbeing"]
        practice_concerns = [event for event in chronology.get("events", []) if event.get("event_type") == "practice_concern"]

        alerts = []
        for item in risk.get("alerts") or []:
            if item.get("type") in {"workforce_risk", "wellbeing"}:
                alerts.append(item)

        return {
            "ok": True,
            "staff_id": staff_id,
            "wellbeing_events": wellbeing_events[:15],
            "practice_concerns": practice_concerns[:10],
            "home_health": risk.get("home_health"),
            "alerts": alerts[:15],
            "supervision_culture": {
                "overdue_supervisions": sum(
                    int((item.get("signals") or {}).get("overdue_supervisions", 0))
                    for item in (risk.get("staff_risks") or [])
                ),
            },
            "summary": (
                f"{len(wellbeing_events)} wellbeing event(s) and {len(practice_concerns)} practice concern(s) in scope."
            ),
        }


staff_wellbeing_service = StaffWellbeingService()
