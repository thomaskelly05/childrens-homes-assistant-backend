from __future__ import annotations

from typing import Any

from services.manager_intelligence_service import ManagerIntelligenceService


class ProactiveIntelligenceService:
    """Proactive alerts for managers and senior staff.

    Converts manager intelligence into clear, prioritised alerts that can be
    shown on dashboards or pushed into notifications. This layer does not make
    decisions for staff; it highlights what requires human review.
    """

    def __init__(self) -> None:
        self.manager_intelligence = ManagerIntelligenceService()

    def build_alerts(self, *, current_user: dict[str, Any], days: int = 30, home_id: int | None = None) -> dict[str, Any]:
        intelligence = self.manager_intelligence.build_dashboard(
            current_user=current_user,
            days=days,
            home_id=home_id,
        )
        if not intelligence.get("ok"):
            return {"ok": False, "alerts": [], "error": intelligence.get("error"), "detail": intelligence.get("detail")}

        alerts: list[dict[str, Any]] = []
        alerts.extend(self._risk_alerts(intelligence))
        alerts.extend(self._evidence_gap_alerts(intelligence))
        alerts.extend(self._document_gap_alerts(intelligence))
        alerts.extend(self._assistant_usage_alerts(intelligence))
        alerts.extend(self._action_alerts(intelligence))

        alerts = sorted(alerts, key=lambda item: self._level_score(item.get("level")), reverse=True)
        return {
            "ok": True,
            "home_id": intelligence.get("home_id"),
            "days": days,
            "summary": {
                "total": len(alerts),
                "critical": len([a for a in alerts if a.get("level") == "critical"]),
                "high": len([a for a in alerts if a.get("level") == "high"]),
                "medium": len([a for a in alerts if a.get("level") == "medium"]),
                "low": len([a for a in alerts if a.get("level") == "low"]),
            },
            "alerts": alerts,
            "source": "manager_intelligence",
        }

    def _risk_alerts(self, intelligence: dict[str, Any]) -> list[dict[str, Any]]:
        risks = intelligence.get("risks") or {}
        alerts = []
        status = risks.get("status") or "low"
        if status == "high":
            alerts.append(self._alert(
                level="critical",
                category="risk",
                title="High home risk signal",
                message="The home intelligence dashboard is showing a high-risk status.",
                why="Safeguarding, missing episodes or high-risk review items may require immediate management attention.",
                action="Open Home Intelligence and Manager Review Queue now.",
            ))
        elif status == "medium":
            alerts.append(self._alert(
                level="medium",
                category="risk",
                title="Emerging home risk signal",
                message="The home intelligence dashboard is showing a medium-risk status.",
                why="Incidents, pending reviews or emerging patterns may need manager oversight.",
                action="Review incidents, actions and manager review queue today.",
            ))

        for signal in risks.get("signals") or []:
            alerts.append(self._alert(
                level=self._normalise_level(signal.get("level")),
                category="risk_signal",
                title=signal.get("message") or "Risk signal identified",
                message=signal.get("message") or "Risk signal identified by the system.",
                why="This signal was generated from recent records and review queue data.",
                action=signal.get("action") or "Review source records and decide next steps.",
            ))
        return alerts

    def _evidence_gap_alerts(self, intelligence: dict[str, Any]) -> list[dict[str, Any]]:
        alerts = []
        for gap in intelligence.get("evidence_gaps") or []:
            alerts.append(self._alert(
                level="medium",
                category="evidence_gap",
                title=f"Evidence gap: {gap.get('area') or 'Unknown area'}",
                message=gap.get("gap") or "Evidence gap identified.",
                why="Evidence gaps may weaken Inspection evidence preparation and reduce management oversight visibility.",
                action="Assign an owner to close this gap and record evidence of completion.",
            ))
        return alerts

    def _document_gap_alerts(self, intelligence: dict[str, Any]) -> list[dict[str, Any]]:
        alerts = []
        for gap in intelligence.get("document_gaps") or []:
            level = "high" if str(gap.get("area") or "").lower() in {"risk assessment", "safeguarding", "behaviour support"} else "medium"
            alerts.append(self._alert(
                level=level,
                category="document_gap",
                title=f"Document gap: {gap.get('area') or 'Document'}",
                message=gap.get("gap") or "Required document not visible.",
                why="Staff and managers need approved documents to make safe, consistent decisions.",
                action="Upload, review or approve the relevant document.",
            ))
        return alerts

    def _assistant_usage_alerts(self, intelligence: dict[str, Any]) -> list[dict[str, Any]]:
        alerts = []
        for item in intelligence.get("assistant_insights") or []:
            count = int(item.get("count") or 0)
            question = item.get("question") or "Assistant query"
            if count >= 3:
                alerts.append(self._alert(
                    level="medium",
                    category="staff_uncertainty",
                    title="Repeated staff question pattern",
                    message=f"Staff have asked a similar question {count} time(s): {question}",
                    why="Repeated questions may show that plans, routines, risk information or policies are unclear to staff.",
                    action="Review whether the relevant document or handover guidance needs updating.",
                ))
        return alerts

    def _action_alerts(self, intelligence: dict[str, Any]) -> list[dict[str, Any]]:
        alerts = []
        summary = intelligence.get("summary") or {}
        if int(summary.get("review_queue") or 0) > 0:
            alerts.append(self._alert(
                level="high",
                category="manager_review",
                title="Manager review queue has pending items",
                message=f"{summary.get('review_queue')} item(s) are awaiting manager review.",
                why="Unreviewed records weaken leadership oversight and may delay safeguarding follow-up.",
                action="Open Manager Review and clear high-priority items first.",
            ))
        if int(summary.get("open_actions") or 0) > 0:
            alerts.append(self._alert(
                level="medium",
                category="actions",
                title="Open or overdue actions visible",
                message=f"{summary.get('open_actions')} open or overdue action(s) are visible.",
                why="Actions need ownership, completion evidence and manager follow-through.",
                action="Review action owners, due dates and completion evidence.",
            ))
        return alerts

    def _alert(self, *, level: str, category: str, title: str, message: str, why: str, action: str) -> dict[str, Any]:
        return {
            "level": level,
            "category": category,
            "title": title,
            "message": message,
            "why": why,
            "recommended_action": action,
        }

    def _normalise_level(self, level: Any) -> str:
        value = str(level or "low").lower()
        if value in {"critical", "high", "medium", "low"}:
            return value
        if value == "warning":
            return "medium"
        return "low"

    def _level_score(self, level: Any) -> int:
        return {"critical": 4, "high": 3, "medium": 2, "low": 1}.get(str(level or "low").lower(), 0)
