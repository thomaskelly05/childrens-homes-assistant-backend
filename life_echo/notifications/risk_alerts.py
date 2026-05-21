from __future__ import annotations

from datetime import datetime, timezone


class LifeEchoRiskAlertService:
    """Generates runtime alerts for safeguarding and emotional escalation."""

    def __init__(self) -> None:
        self._alerts: list[dict] = []

    def create_alert(
        self,
        *,
        child_id: str,
        severity: str,
        title: str,
        description: str,
    ) -> dict:
        alert = {
            "id": f"alert_{len(self._alerts) + 1}",
            "child_id": child_id,
            "severity": severity,
            "title": title,
            "description": description,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "open",
        }

        self._alerts.append(alert)
        return alert

    def list_alerts(self) -> list[dict]:
        return self._alerts


life_echo_risk_alerts = LifeEchoRiskAlertService()
