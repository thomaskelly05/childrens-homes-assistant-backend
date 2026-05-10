from __future__ import annotations

from datetime import datetime
from typing import Any

from services.rm_dashboard_service import RMDashboardService
from services.staff_today_service import StaffTodayService
from services.os_intelligence_service import OSIntelligenceService


class LiveAlertsService:

    def home_alerts(self, *, home_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
        dashboard = RMDashboardService().dashboard(home_id=home_id, current_user=current_user)
        intelligence = OSIntelligenceService().home_intelligence(home_id=home_id)

        alerts = []

        # Existing dashboard risks
        for risk in dashboard.get("live_risks") or []:
            alerts.append({
                "level": self._level(risk.get("priority")),
                "type": risk.get("type") or "live_risk",
                "title": risk.get("title") or "Action required",
                "message": risk.get("detail") or "A risk requires review.",
                "href": risk.get("href") or "/os-dashboard",
            })

        # Intelligence-driven alerts
        for child in intelligence.get("children_needing_review", []):
            alerts.append({
                "level": "high" if child.get("score", 100) < 70 else "medium",
                "type": "child_review",
                "title": f"{child.get('name')} requires review",
                "message": f"Inspection readiness {child.get('score')}% with actions required.",
                "href": child.get("href"),
            })

        summary = dashboard.get("summary") or {}

        if summary.get("shift_safety") in {"at_risk", "unsafe_review_required"}:
            alerts.insert(0, {
                "level": "critical" if summary.get("shift_safety") == "unsafe_review_required" else "high",
                "type": "shift_safety",
                "title": "Shift safety needs review",
                "message": "The current rota or staffing position needs manager attention.",
                "href": "/rostering",
            })

        return {
            "ok": True,
            "generated_at": self._now(),
            "home_id": home_id,
            "alert_count": len(alerts),
            "alerts": alerts[:12],
            "banner": self._banner(alerts),
        }

    def my_alerts(self, *, current_user: dict[str, Any]) -> dict[str, Any]:
        today = StaffTodayService().get_my_today(current_user=current_user)
        alerts = []

        for item in today.get("due_now") or []:
            alerts.append({
                "level": self._level(item.get("priority")),
                "type": item.get("type") or "due_now",
                "title": item.get("title") or "Action due",
                "message": item.get("detail") or "You have an action due now.",
                "href": item.get("href") or "/my-profile",
            })

        return {
            "ok": True,
            "generated_at": self._now(),
            "alert_count": len(alerts),
            "alerts": alerts[:10],
            "banner": self._banner(alerts),
        }

    def _banner(self, alerts: list[dict[str, Any]]) -> dict[str, Any]:
        if not alerts:
            return {"visible": False, "level": "clear", "title": "No urgent alerts", "message": "No urgent OS alerts."}
        level = "critical" if any(a.get("level") == "critical" for a in alerts) else "high"
        return {"visible": True, "level": level, "title": "Action required", "message": f"{len(alerts)} alerts require review."}

    def _level(self, value: Any) -> str:
        v = str(value or "medium").lower()
        if v in {"critical", "unsafe"}:
            return "critical"
        if v in {"high", "urgent"}:
            return "high"
        return "medium"

    def _now(self) -> str:
        return datetime.utcnow().isoformat() + "Z"
