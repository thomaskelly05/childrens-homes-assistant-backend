from __future__ import annotations

from typing import Any


class HumanReviewGovernanceService:
    """Governance enforcement layer for regulated ORB cognition.

    Ensures ORB remains advisory, explainable, bounded and human-led for
    safeguarding, escalation and operational decision-making.
    """

    HIGH_REVIEW_TERMS = {
        "allegation",
        "self-harm",
        "suicide",
        "sexual exploitation",
        "criminal exploitation",
        "police",
        "lado",
        "restraint",
        "injury",
        "missing",
    }

    def evaluate(
        self,
        *,
        narrative: str,
        confidence: str | None = None,
    ) -> dict[str, Any]:
        lower = str(narrative or "").lower()
        matched = sorted(term for term in self.HIGH_REVIEW_TERMS if term in lower)

        review_required = bool(matched) or confidence in {"low", "uncertain"}

        return {
            "human_review_required": review_required,
            "matched_terms": matched,
            "confidence": confidence or "unknown",
            "governance_rules": self._rules(review_required=review_required),
            "response_constraints": [
                "Do not make safeguarding threshold decisions.",
                "Do not replace professional judgement.",
                "Avoid definitive certainty where evidence is incomplete.",
                "Encourage escalation and oversight where risk is present.",
            ],
            "recommended_actions": self._actions(review_required=review_required),
        }

    def prompt_addendum(self, *, narrative: str, confidence: str | None = None) -> str:
        result = self.evaluate(narrative=narrative, confidence=confidence)
        lines = [
            "Human review governance:",
            f"- Human review required: {result['human_review_required']}",
            f"- Confidence: {result['confidence']}",
        ]
        if result["matched_terms"]:
            lines.append("- Governance triggers: " + "; ".join(result["matched_terms"]))
        return "\n".join(lines)

    def _rules(self, *, review_required: bool) -> list[str]:
        rules = [
            "Safeguarding accountability remains human-led.",
            "ORB guidance is advisory and reflective.",
        ]
        if review_required:
            rules.append("Escalation and management oversight should be considered.")
        return rules

    def _actions(self, *, review_required: bool) -> list[str]:
        if review_required:
            return [
                "Encourage immediate management or safeguarding review.",
                "Ensure factual recording and chronology visibility.",
                "Consider whether escalation pathways apply.",
            ]
        return [
            "Continue reflective review and evidence gathering.",
        ]


human_review_governance_service = HumanReviewGovernanceService()
