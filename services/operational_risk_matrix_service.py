from __future__ import annotations

from typing import Any


class OperationalRiskMatrixService:
    """Builds a live operational risk matrix from converged intelligence layers."""

    def build(
        self,
        *,
        feed: dict[str, Any],
        workflow: dict[str, Any] | None = None,
        chronology_patterns: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        home = (feed.get("home_operational_intelligence") or {}).get("home_climate") or {}
        inspection = feed.get("inspection_intelligence") or {}
        workflow = workflow or {}
        chronology_patterns = chronology_patterns or {}

        emotional = home.get("emotional_climate") or {}
        safeguarding = home.get("safeguarding_pressure") or {}
        workforce = home.get("workforce_pressure") or {}
        operational = home.get("operational_pressure") or {}

        dimensions = {
            "emotional_climate": self._score_emotional(emotional),
            "safeguarding_pressure": self._score_safeguarding(safeguarding),
            "missing_from_home": self._score_missing(feed.get("events") or []),
            "placement_instability": self._score_placement(chronology_patterns.get("placement_instability") or {}),
            "workflow_completion": 100 - int(workflow.get("inspection_vulnerability_pct") or 0),
            "child_voice_quality": self._score_child_voice(feed),
            "evidence_linkage": self._score_evidence(feed),
            "inspection_readiness": self._score_inspection(inspection),
            "staff_pressure": self._score_workforce(workforce),
        }

        live_operational_risk = round(
            sum(
                100 - min(100, max(0, score))
                for score in dimensions.values()
            )
            / max(1, len(dimensions))
        )

        matrix_state = "critical" if live_operational_risk >= 70 else "heightened" if live_operational_risk >= 45 else "stable"

        return {
            "ok": True,
            "matrix_state": matrix_state,
            "live_operational_risk_score": live_operational_risk,
            "dimensions": dimensions,
            "summary": (
                f"Operational risk matrix is {matrix_state} with a live risk score of {live_operational_risk}."
            ),
        }

    def _score_emotional(self, emotional: dict[str, Any]) -> int:
        mapping = {"unsettled": 35, "mixed": 65, "settled": 90}
        return mapping.get(str(emotional.get("state") or "mixed"), 60)

    def _score_safeguarding(self, safeguarding: dict[str, Any]) -> int:
        mapping = {"critical": 25, "heightened": 50, "stable": 88}
        return mapping.get(str(safeguarding.get("state") or "stable"), 70)

    def _score_missing(self, events: list[dict[str, Any]]) -> int:
        missing_count = sum(1 for event in events if "missing" in (event.get("risk_tags") or []))
        if missing_count >= 3:
            return 30
        if missing_count >= 1:
            return 55
        return 90

    def _score_placement(self, placement: dict[str, Any]) -> int:
        mapping = {"unstable": 30, "watching": 55, "stable": 90}
        return mapping.get(str(placement.get("state") or "stable"), 75)

    def _score_child_voice(self, feed: dict[str, Any]) -> int:
        events = feed.get("events") or []
        if not events:
            return 75
        with_voice = sum(1 for event in events if event.get("child_voice_present"))
        return round((with_voice / len(events)) * 100)

    def _score_evidence(self, feed: dict[str, Any]) -> int:
        queue = feed.get("manager_queue") or {}
        evidence_gaps = sum(1 for item in (queue.get("items") or []) if item.get("evidence_gap"))
        total = max(1, int(queue.get("total") or 1))
        return max(0, min(100, round(100 - ((evidence_gaps / total) * 100))))

    def _score_inspection(self, inspection: dict[str, Any]) -> int:
        readiness = str(inspection.get("overall_readiness") or "good")
        mapping = {
            "requires_immediate_attention": 25,
            "watching": 55,
            "good": 88,
        }
        return mapping.get(readiness, 70)

    def _score_workforce(self, workforce: dict[str, Any]) -> int:
        mapping = {"overloaded": 30, "pressured": 55, "manageable": 88}
        return mapping.get(str(workforce.get("state") or "manageable"), 70)


operational_risk_matrix_service = OperationalRiskMatrixService()
