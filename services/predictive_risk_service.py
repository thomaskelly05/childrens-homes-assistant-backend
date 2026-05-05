from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Any

from services.workspace_orchestrator_service import WorkspaceOrchestratorService


class PredictiveRiskService:
    """Early-warning risk analysis for IndiCare.

    This service does not predict certainty or make decisions. It identifies
    patterns that may indicate risk is building and prompts human review.
    """

    def __init__(self) -> None:
        self.workspace = WorkspaceOrchestratorService()

    def child_risk(self, *, young_person_id: int, current_user: dict[str, Any], days: int = 30) -> dict[str, Any]:
        workspace = self.workspace.child_workspace(young_person_id=young_person_id, current_user=current_user, days=days)
        events = workspace.get("journey", {}).get("timeline") or workspace.get("journey", {}).get("recent_events") or []
        return {
            "ok": True,
            "scope": "child",
            "young_person_id": young_person_id,
            "days": days,
            "risk": self._analyse_events(events),
            "disclaimer": "Early-warning support only. Managers must verify source records and apply professional judgement.",
        }

    def home_risk(self, *, home_id: int, current_user: dict[str, Any], days: int = 30) -> dict[str, Any]:
        workspace = self.workspace.home_workspace(home_id=home_id, current_user=current_user, days=days)
        events = workspace.get("child_journey_overview", {}).get("recent_events") or []
        return {
            "ok": True,
            "scope": "home",
            "home_id": home_id,
            "days": days,
            "risk": self._analyse_events(events),
            "disclaimer": "Early-warning support only. Managers must verify source records and apply professional judgement.",
        }

    def _analyse_events(self, events: list[dict[str, Any]]) -> dict[str, Any]:
        counts = self._counts(events)
        signals = []
        score = 0

        incidents = counts.get("incident", 0) + counts.get("incidents", 0)
        safeguarding = counts.get("safeguarding", 0) + counts.get("safeguarding_records", 0)
        missing = counts.get("missing_episode", 0) + counts.get("missing_episodes", 0)
        keywork = counts.get("keywork", 0) + counts.get("keywork_sessions", 0)
        daily = counts.get("daily_note", 0) + counts.get("daily_notes", 0)

        if incidents >= 5:
            score += 30
            signals.append(self._signal("high", "Incident frequency is high", "Several incidents are visible in the current period.", "Review triggers, plans, staffing, debriefs and whether risk is escalating."))
        elif incidents >= 3:
            score += 18
            signals.append(self._signal("medium", "Incident pattern emerging", "Multiple incidents are visible in the current period.", "Check whether behaviour support and risk assessments need updating."))

        if safeguarding:
            score += 30
            signals.append(self._signal("high", "Safeguarding activity present", "Safeguarding-related records are visible.", "Check immediate safety action, notifications, oversight and outcomes."))

        if missing >= 2:
            score += 25
            signals.append(self._signal("high", "Repeated missing-from-care pattern", "More than one missing episode is visible.", "Review missing plan, return interviews, locations, associates and exploitation risk."))
        elif missing == 1:
            score += 12
            signals.append(self._signal("medium", "Missing episode present", "A missing episode is visible.", "Check return work, risk review and triggers."))

        if events and keywork == 0:
            score += 10
            signals.append(self._signal("medium", "Child voice gap", "No keywork/direct work is visible in this sample.", "Schedule keywork/direct work and record wishes, feelings and goals."))

        if daily == 0 and events:
            score += 8
            signals.append(self._signal("low", "Daily lived experience gap", "No daily note evidence is visible in this sample.", "Check daily recording completion and quality."))

        text = " ".join(str(value or "") for event in events for value in event.values()).lower()
        if any(term in text for term in ["self-harm", "self harm", "suicide", "suicidal", "overdose"]):
            score += 35
            signals.append(self._signal("critical", "Self-harm or suicidal language visible", "Records may include self-harm or suicidal ideation language.", "Follow safeguarding and risk procedures immediately; verify source records."))
        if any(term in text for term in ["exploitation", "cse", "county lines", "unknown adult"]):
            score += 30
            signals.append(self._signal("high", "Exploitation language visible", "Records may include exploitation-related language.", "Review safeguarding plan, missing plan, external notifications and protective actions."))

        if not signals:
            signals.append(self._signal("low", "No predictive risk pattern identified", "No obvious escalation signal was identified in this sample.", "Continue monitoring records, child voice and staff response."))

        return {
            "score": min(score, 100),
            "band": self._band(score),
            "signals": signals,
            "counts": {
                "events": len(events),
                "incidents": incidents,
                "safeguarding": safeguarding,
                "missing": missing,
                "keywork": keywork,
                "daily": daily,
            },
        }

    def _counts(self, events: list[dict[str, Any]]) -> Counter:
        return Counter(str(event.get("record_type") or event.get("source_table") or "record") for event in events)

    def _band(self, score: int) -> str:
        if score >= 70:
            return "critical"
        if score >= 45:
            return "high"
        if score >= 20:
            return "medium"
        return "low"

    def _signal(self, level: str, title: str, why: str, action: str) -> dict[str, str]:
        return {"level": level, "title": title, "why": why, "recommended_action": action}
