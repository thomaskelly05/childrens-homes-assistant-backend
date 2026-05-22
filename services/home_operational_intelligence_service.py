from __future__ import annotations

from collections import Counter
from typing import Any


class HomeOperationalIntelligenceService:
    def analyse(
        self,
        *,
        events: list[dict[str, Any]],
        manager_queue: dict[str, Any] | None = None,
        inspection: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        manager_queue = manager_queue or {}
        inspection = inspection or {}

        emotional_counter: Counter[str] = Counter()
        risk_counter: Counter[str] = Counter()
        severity_counter: Counter[str] = Counter()
        workflow_counter: Counter[str] = Counter()

        for event in events:
            emotional_counter.update(event.get("emotional_tags") or [])
            risk_counter.update(event.get("risk_tags") or [])
            severity_counter.update([str(event.get("severity") or "medium")])
            workflow_counter.update([str(event.get("workflow_state") or "recorded")])

        safeguarding_pressure = self._safeguarding_pressure(risk_counter, severity_counter)
        emotional_climate = self._emotional_climate(emotional_counter)
        workforce_pressure = self._workforce_pressure(manager_queue)
        operational_pressure = self._operational_pressure(workflow_counter, inspection)

        alerts = self._alerts(
            safeguarding_pressure=safeguarding_pressure,
            emotional_climate=emotional_climate,
            workforce_pressure=workforce_pressure,
            operational_pressure=operational_pressure,
            risk_counter=risk_counter,
        )

        return {
            "ok": True,
            "home_climate": {
                "emotional_climate": emotional_climate,
                "safeguarding_pressure": safeguarding_pressure,
                "workforce_pressure": workforce_pressure,
                "operational_pressure": operational_pressure,
            },
            "risk_heatmap": {
                "emotional": emotional_counter.most_common(10),
                "risk": risk_counter.most_common(10),
                "severity": severity_counter.most_common(),
                "workflow": workflow_counter.most_common(),
            },
            "alerts": alerts,
            "summary": self._summary(
                emotional_climate=emotional_climate,
                safeguarding_pressure=safeguarding_pressure,
                workforce_pressure=workforce_pressure,
                operational_pressure=operational_pressure,
                alerts=alerts,
            ),
        }

    def _emotional_climate(self, emotional_counter: Counter[str]) -> dict[str, Any]:
        distressed = emotional_counter.get("distressed", 0)
        dysregulated = emotional_counter.get("dysregulated", 0)
        anxious = emotional_counter.get("anxious", 0)
        calm = emotional_counter.get("calm", 0)
        happy = emotional_counter.get("happy", 0)

        pressure = distressed + dysregulated + anxious
        settled = calm + happy

        if pressure > settled:
            state = "unsettled"
        elif settled > pressure:
            state = "settled"
        else:
            state = "mixed"

        return {
            "state": state,
            "pressure_indicators": pressure,
            "settled_indicators": settled,
        }

    def _safeguarding_pressure(self, risk_counter: Counter[str], severity_counter: Counter[str]) -> dict[str, Any]:
        high = severity_counter.get("high", 0)
        critical = severity_counter.get("critical", 0)
        missing = risk_counter.get("missing", 0)
        exploitation = risk_counter.get("exploitation", 0)

        pressure_score = high + (critical * 2) + missing + exploitation

        if pressure_score >= 8:
            state = "critical"
        elif pressure_score >= 4:
            state = "heightened"
        else:
            state = "stable"

        return {
            "state": state,
            "pressure_score": pressure_score,
        }

    def _workforce_pressure(self, manager_queue: dict[str, Any]) -> dict[str, Any]:
        total = int(manager_queue.get("total") or 0)
        critical = int(manager_queue.get("critical") or 0)
        high = int(manager_queue.get("high") or 0)

        pressure = critical + high + total

        if pressure >= 15:
            state = "overloaded"
        elif pressure >= 6:
            state = "pressured"
        else:
            state = "manageable"

        return {
            "state": state,
            "queue_items": total,
        }

    def _operational_pressure(self, workflow_counter: Counter[str], inspection: dict[str, Any]) -> dict[str, Any]:
        incomplete = sum(
            count
            for state, count in workflow_counter.items()
            if state in {"draft", "submitted", "awaiting_review"}
        )

        readiness = inspection.get("overall_readiness") or "good"

        if incomplete >= 10 or readiness == "requires_immediate_attention":
            state = "high"
        elif incomplete >= 4 or readiness == "watching":
            state = "watching"
        else:
            state = "stable"

        return {
            "state": state,
            "incomplete_workflows": incomplete,
        }

    def _alerts(
        self,
        *,
        safeguarding_pressure: dict[str, Any],
        emotional_climate: dict[str, Any],
        workforce_pressure: dict[str, Any],
        operational_pressure: dict[str, Any],
        risk_counter: Counter[str],
    ) -> list[dict[str, Any]]:
        alerts: list[dict[str, Any]] = []

        if safeguarding_pressure["state"] != "stable":
            alerts.append({
                "type": "safeguarding",
                "severity": safeguarding_pressure["state"],
                "message": "Safeguarding pressure is elevated across operational records.",
            })

        if emotional_climate["state"] == "unsettled":
            alerts.append({
                "type": "emotional_climate",
                "severity": "medium",
                "message": "The home emotional climate appears unsettled or dysregulated.",
            })

        if workforce_pressure["state"] != "manageable":
            alerts.append({
                "type": "workforce",
                "severity": workforce_pressure["state"],
                "message": "Operational oversight queues suggest workforce pressure is increasing.",
            })

        if operational_pressure["state"] != "stable":
            alerts.append({
                "type": "operations",
                "severity": operational_pressure["state"],
                "message": "Incomplete workflows or inspection concerns require attention.",
            })

        if risk_counter.get("missing", 0) >= 2:
            alerts.append({
                "type": "missing_from_home",
                "severity": "high",
                "message": "Repeated missing-from-home indicators detected.",
            })

        return alerts

    def _summary(
        self,
        *,
        emotional_climate: dict[str, Any],
        safeguarding_pressure: dict[str, Any],
        workforce_pressure: dict[str, Any],
        operational_pressure: dict[str, Any],
        alerts: list[dict[str, Any]],
    ) -> str:
        return (
            f"Home emotional climate is {emotional_climate['state']}, safeguarding pressure is "
            f"{safeguarding_pressure['state']}, workforce pressure is {workforce_pressure['state']}, "
            f"and operational pressure is {operational_pressure['state']}. "
            f"{len(alerts)} active operational alert(s) generated."
        )


home_operational_intelligence_service = HomeOperationalIntelligenceService()
