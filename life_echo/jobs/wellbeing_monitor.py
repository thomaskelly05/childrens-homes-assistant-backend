from __future__ import annotations

from life_echo.intelligence.wellbeing_engine import LifeEchoWellbeingEngine
from life_echo.notifications.risk_alerts import life_echo_risk_alerts
from life_echo.schemas import LifeEchoEvent


class LifeEchoWellbeingMonitorJob:
    """Background wellbeing monitoring runtime."""

    @staticmethod
    def process(child_id: str, events: list[LifeEchoEvent]) -> dict:
        wellbeing = LifeEchoWellbeingEngine.calculate(events)

        if wellbeing.get("trajectory") == "declining":
            life_echo_risk_alerts.create_alert(
                child_id=child_id,
                severity="medium",
                title="Declining wellbeing trajectory",
                description=(
                    "LifeEcho detected a declining emotional wellbeing pattern."
                ),
            )

        return wellbeing
