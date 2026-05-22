from __future__ import annotations

from typing import Any


class LiveHomeStatusService:
    """Live home status metrics for the Care Hub command centre."""

    def build(
        self,
        *,
        feed: dict[str, Any],
        risk_matrix: dict[str, Any] | None = None,
        workflow: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        home = (feed.get("home_operational_intelligence") or {}).get("home_climate") or {}
        risk_matrix = risk_matrix or {}
        workflow = workflow or {}
        dimensions = risk_matrix.get("dimensions") or {}

        return {
            "ok": True,
            "status": risk_matrix.get("matrix_state") or "stable",
            "live_emotional_climate": home.get("emotional_climate") or {},
            "live_safeguarding_pressure": home.get("safeguarding_pressure") or {},
            "missing_from_home_pressure": {
                "score": dimensions.get("missing_from_home"),
                "state": "heightened" if (dimensions.get("missing_from_home") or 100) < 60 else "stable",
            },
            "placement_instability": {
                "score": dimensions.get("placement_instability"),
            },
            "workflow_completion_pct": workflow.get("workflow_health_pct"),
            "child_voice_quality_pct": dimensions.get("child_voice_quality"),
            "evidence_linkage_pct": dimensions.get("evidence_linkage"),
            "inspection_readiness_pct": dimensions.get("inspection_readiness"),
            "staff_pressure_score": dimensions.get("staff_pressure"),
            "live_operational_risk_score": risk_matrix.get("live_operational_risk_score"),
            "summary": self._summary(home, risk_matrix),
        }

    def _summary(self, home: dict[str, Any], risk_matrix: dict[str, Any]) -> str:
        emotional = (home.get("emotional_climate") or {}).get("state", "unknown")
        safeguarding = (home.get("safeguarding_pressure") or {}).get("state", "unknown")
        risk = risk_matrix.get("live_operational_risk_score", 0)
        return (
            f"Live home status: emotional climate {emotional}, safeguarding {safeguarding}, "
            f"operational risk score {risk}."
        )


live_home_status_service = LiveHomeStatusService()
