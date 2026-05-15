from __future__ import annotations

from typing import Any


SAFE_AUTOMATIONS = [
    "Annex A draft population",
    "Reg 45 evidence pack",
    "Reg 44 action tracker",
    "Ofsted readiness pack",
    "missing document tracker",
    "review due reminders",
    "policy review schedule",
    "staff training expiry alerts",
    "supervision overdue alerts",
    "child voice evidence tracker",
    "restraint/missing/complaint summaries",
    "safeguarding oversight timeline",
    "care plan update suggestions",
    "missing risk review prompts",
    "locality risk review reminders",
    "manager QA evidence prompts",
    "daily note quality checks",
    "chronology gap detection",
    "handover generation",
    "document evidence linking",
]

BLOCKED_AUTOMATIONS = [
    "safeguarding decisions",
    "referrals",
    "risk conclusions",
    "final approvals",
    "signatures",
    "Ofsted submissions",
    "Reg 45 final judgement",
    "care plan finalisation",
]


class AutomationOpportunityService:
    """Lists safe automation opportunities and hard human-review boundaries."""

    def opportunities(self, *, context: dict[str, Any] | None = None) -> dict[str, Any]:
        context = context or {}
        return {
            "safe_to_automate": [self._item(name) for name in SAFE_AUTOMATIONS],
            "must_not_automate": [{"name": name, "blocked": True, "reason": "requires human professional judgement/sign-off"} for name in BLOCKED_AUTOMATIONS],
            "recommended_now": self._recommended(context),
            "guardrails": [
                "Automation creates drafts, reminders and evidence links only.",
                "Humans remain responsible for decisions, approvals, referrals and submissions.",
                "Outputs use review recommended and records indicate language.",
            ],
        }

    def _item(self, name: str) -> dict[str, Any]:
        return {
            "name": name,
            "allowed": True,
            "output_state": "draft_or_prompt",
            "requires_review": True,
        }

    def _recommended(self, context: dict[str, Any]) -> list[dict[str, Any]]:
        text = str(context).lower()
        recommendations = []
        for item in SAFE_AUTOMATIONS:
            if any(term in text for term in item.lower().split("/")[:1]) or "inspection" in text and "Ofsted" in item:
                recommendations.append(self._item(item))
        return recommendations[:6] or [self._item("daily note quality checks"), self._item("missing document tracker")]


automation_opportunity_service = AutomationOpportunityService()
