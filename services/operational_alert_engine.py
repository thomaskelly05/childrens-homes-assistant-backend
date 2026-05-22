from __future__ import annotations

from typing import Any


class OperationalAlertEngine:
    """Generates live operational alerts from converged intelligence."""

    def generate(
        self,
        *,
        feed: dict[str, Any],
        workflow: dict[str, Any] | None = None,
        risk_matrix: dict[str, Any] | None = None,
        chronology_patterns: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        events = feed.get("events") or []
        home_alerts = (feed.get("home_operational_intelligence") or {}).get("alerts") or []
        workflow = workflow or {}
        risk_matrix = risk_matrix or {}
        chronology_patterns = chronology_patterns or {}
        gaps = workflow.get("gaps") or {}

        alerts: list[dict[str, Any]] = list(home_alerts)

        missing_count = sum(1 for event in events if "missing" in (event.get("risk_tags") or []))
        if missing_count >= 2:
            alerts.append(self._alert(
                "repeated_missing_episodes",
                "high",
                "Repeated missing-from-home indicators detected across recent records.",
            ))

        restraint_count = sum(
            1 for event in events
            if "restraint" in (event.get("risk_tags") or []) or event.get("source_table") == "incidents"
        )
        if restraint_count >= 2:
            alerts.append(self._alert(
                "repeated_restraints",
                "high",
                "Repeated restraint or incident indicators require management review.",
            ))

        safeguarding_events = sum(1 for event in events if event.get("safeguarding"))
        if safeguarding_events >= 2:
            alerts.append(self._alert(
                "safeguarding_escalation",
                "critical" if safeguarding_events >= 4 else "high",
                "Safeguarding escalation patterns are visible across recent operational events.",
            ))

        if int(gaps.get("incomplete_workflows") or 0) >= 3:
            alerts.append(self._alert(
                "workflow_backlog",
                "medium",
                "Workflow backlog is increasing across incomplete operational records.",
            ))

        if int(gaps.get("weak_child_voice") or 0) >= 2:
            alerts.append(self._alert(
                "weak_child_voice",
                "medium",
                "Child voice appears weak or missing across multiple records.",
            ))

        readiness = (feed.get("inspection_intelligence") or {}).get("overall_readiness")
        if readiness == "requires_immediate_attention":
            alerts.append(self._alert(
                "inspection_vulnerability",
                "high",
                "Inspection vulnerability indicators require immediate leadership attention.",
            ))

        staff_score = (risk_matrix.get("dimensions") or {}).get("staff_pressure") or 100
        if staff_score < 50:
            alerts.append(self._alert(
                "staff_burnout_indicators",
                "high",
                "Manager oversight queues and workforce pressure suggest staff burnout risk.",
            ))

        placement = chronology_patterns.get("placement_instability") or {}
        if placement.get("state") in {"unstable", "watching"}:
            alerts.append(self._alert(
                "placement_instability",
                "high" if placement.get("state") == "unstable" else "medium",
                "Placement instability indicators are emerging across operational records.",
            ))

        alerts = self._dedupe(alerts)
        return {
            "ok": True,
            "total": len(alerts),
            "critical": sum(1 for alert in alerts if alert.get("severity") == "critical"),
            "high": sum(1 for alert in alerts if alert.get("severity") == "high"),
            "alerts": alerts,
            "summary": f"{len(alerts)} live operational alert(s) generated.",
        }

    def _alert(self, alert_type: str, severity: str, message: str) -> dict[str, Any]:
        return {"type": alert_type, "severity": severity, "message": message}

    def _dedupe(self, alerts: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen: set[str] = set()
        unique: list[dict[str, Any]] = []
        for alert in alerts:
            key = f"{alert.get('type')}:{alert.get('message')}"
            if key in seen:
                continue
            seen.add(key)
            unique.append(alert)
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "overloaded": 1, "pressured": 2}
        return sorted(unique, key=lambda item: severity_order.get(str(item.get("severity")), 9))


operational_alert_engine = OperationalAlertEngine()
