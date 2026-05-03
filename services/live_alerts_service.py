from __future__ import annotations

from datetime import datetime
from typing import Any

from services.rm_dashboard_service import RMDashboardService
from services.staff_today_service import StaffTodayService


class LiveAlertsService:
    """Builds proactive alert banners for the OS.

    This service converts dashboard and staff-today intelligence into a simple,
    frontend-friendly alerts payload. It is intentionally read-only and safe to
    call often from the shell.
    """

    def home_alerts(self, *, home_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
        dashboard = RMDashboardService().dashboard(home_id=home_id, current_user=current_user)
        alerts = []

        for risk in dashboard.get("live_risks") or []:
            alerts.append({
                "level": self._level(risk.get("priority")),
                "type": risk.get("type") or "live_risk",
                "title": risk.get("title") or "Action required",
                "message": risk.get("detail") or "A risk requires review.",
                "href": risk.get("href") or "/os-dashboard",
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

        if summary.get("oversight_status") == "no_recent_oversight":
            alerts.insert(0, {
                "level": "high",
                "type": "leadership_oversight",
                "title": "Leadership oversight gap",
                "message": "No recent leadership oversight has been recorded for this home.",
                "href": f"/inspection-os/home/{home_id}",
            })

        return {
            "ok": True,
            "generated_at": self._now(),
            "home_id": home_id,
            "status": dashboard.get("status"),
            "alert_count": len(alerts),
            "critical_count": len([a for a in alerts if a.get("level") == "critical"]),
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

        for warning in today.get("warnings") or []:
            alerts.append({
                "level": self._level(warning.get("priority") or warning.get("level")),
                "type": warning.get("type") or "warning",
                "title": warning.get("title") or "Warning",
                "message": warning.get("detail") or warning.get("message") or "A warning requires review.",
                "href": "/my-profile",
            })

        enforcement = today.get("enforcement") or {}
        for gate in enforcement.get("gates") or []:
            alerts.insert(0, {
                "level": "high",
                "type": gate.get("gate") or "enforcement",
                "title": "Action required before continuing",
                "message": gate.get("message") or "A required action is blocking normal workflow.",
                "href": "/my-profile",
            })

        return {
            "ok": True,
            "generated_at": self._now(),
            "staff": today.get("staff"),
            "alert_count": len(alerts),
            "critical_count": len([a for a in alerts if a.get("level") == "critical"]),
            "alerts": alerts[:10],
            "banner": self._banner(alerts),
        }

    def _banner(self, alerts: list[dict[str, Any]]) -> dict[str, Any]:
        if not alerts:
            return {
                "visible": False,
                "level": "clear",
                "title": "No urgent alerts",
                "message": "No urgent OS alerts are currently showing.",
            }
        critical = [a for a in alerts if a.get("level") == "critical"]
        high = [a for a in alerts if a.get("level") == "high"]
        level = "critical" if critical else "high" if high else "medium"
        return {
            "visible": True,
            "level": level,
            "title": "Action required" if level in {"critical", "high"} else "Needs attention",
            "message": f"{len(alerts)} live alert{'s' if len(alerts) != 1 else ''} require review.",
        }

    def _level(self, value: Any) -> str:
        v = str(value or "medium").strip().lower()
        if v in {"critical", "unsafe", "unsafe_review_required"}:
            return "critical"
        if v in {"high", "danger", "urgent"}:
            return "high"
        if v in {"low", "info", "clear"}:
            return "low"
        return "medium"

    def _now(self) -> str:
        return datetime.utcnow().isoformat() + "Z"
