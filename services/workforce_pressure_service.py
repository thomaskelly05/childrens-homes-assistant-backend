from __future__ import annotations

from typing import Any

from services.operational_feed_service import build_operational_feed
from services.workforce_intelligence_service import WorkforceIntelligenceService


class WorkforcePressureService:
    """Operational staffing pressure converged from feed and workforce intelligence."""

    def __init__(self, workforce: WorkforceIntelligenceService | None = None) -> None:
        self._workforce = workforce or WorkforceIntelligenceService()

    def build(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        home_id: int | None = None,
        limit: int = 50,
    ) -> dict[str, Any]:
        feed = build_operational_feed(conn, home_id=home_id, limit=limit)
        climate = (feed.get("home_operational_intelligence") or {}).get("home_climate") or {}
        workforce_climate = climate.get("workforce_pressure") or {}
        manager_queue = feed.get("manager_queue") or {}
        workforce_risk = self._workforce.risk(conn, current_user=current_user)

        queue_pressure = int(workforce_climate.get("queue_items") or manager_queue.get("total") or 0)
        instability = workforce_risk.get("home_health") or {}
        supervision_overdue = sum(
            int((item.get("signals") or {}).get("overdue_supervisions", 0))
            for item in (workforce_risk.get("staff_risks") or [])
        )

        pressure_score = min(
            100,
            queue_pressure * 2
            + (20 if instability.get("level") == "fragile" else 10 if instability.get("level") == "watch" else 0)
            + supervision_overdue * 5,
        )

        return {
            "ok": True,
            "home_id": home_id,
            "operational_staffing_pressure": {
                "score": pressure_score,
                "state": "critical" if pressure_score >= 75 else "high" if pressure_score >= 50 else "manageable",
                "queue_items": queue_pressure,
                "manager_queue_total": manager_queue.get("total"),
            },
            "staffing_instability": instability,
            "supervision_overdue_count": supervision_overdue,
            "training_compliance_risk": self._training_risk(workforce_risk),
            "burnout_indicators": self._burnout_indicators(workforce_risk, workforce_climate),
            "summary": (
                f"Workforce pressure score {pressure_score} with {supervision_overdue} overdue supervision signal(s)."
            ),
        }

    def _training_risk(self, workforce_risk: dict[str, Any]) -> dict[str, Any]:
        expired = sum(int((item.get("signals") or {}).get("expired_training", 0)) for item in (workforce_risk.get("staff_risks") or []))
        missing = sum(int((item.get("signals") or {}).get("missing_training", 0)) for item in (workforce_risk.get("staff_risks") or []))
        return {
            "expired_training_count": expired,
            "missing_training_count": missing,
            "state": "high" if expired + missing >= 5 else "watch" if expired + missing >= 2 else "stable",
        }

    def _burnout_indicators(self, workforce_risk: dict[str, Any], climate: dict[str, Any]) -> dict[str, Any]:
        high_risk = len([item for item in (workforce_risk.get("staff_risks") or []) if item.get("level") in {"high", "critical"}])
        wellbeing_flags = sum(int((item.get("signals") or {}).get("wellbeing_flags", 0)) for item in (workforce_risk.get("staff_risks") or []))
        return {
            "high_risk_staff": high_risk,
            "wellbeing_flags": wellbeing_flags,
            "climate_state": climate.get("state"),
            "burnout_risk": "elevated" if high_risk >= 2 or wellbeing_flags >= 3 else "watch" if high_risk or wellbeing_flags else "stable",
        }


workforce_pressure_service = WorkforcePressureService()
