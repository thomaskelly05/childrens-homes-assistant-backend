from __future__ import annotations

from typing import Any


class SafeguardingEscalationIntelligenceEngine:
    """Escalation-aware safeguarding cognition for ORB.

    Supports reflective safeguarding thinking while preserving human-led
    safeguarding decision-making and escalation boundaries.
    """

    HIGH_RISK_TERMS = {
        "allegation",
        "sexual exploitation",
        "criminal exploitation",
        "self-harm",
        "suicide",
        "missing",
        "abscond",
        "restraint",
        "injury",
        "police",
        "lado",
    }

    def analyse(self, *, narrative: str) -> dict[str, Any]:
        lower = str(narrative or "").lower()
        matched = sorted(term for term in self.HIGH_RISK_TERMS if term in lower)

        if len(matched) >= 4:
            escalation = "critical"
        elif len(matched) >= 2:
            escalation = "high"
        elif matched:
            escalation = "medium"
        else:
            escalation = "low"

        return {
            "escalation_level": escalation,
            "matched_terms": matched,
            "human_review_required": escalation in {"high", "critical"},
            "guidance": self._guidance(level=escalation),
            "reflective_questions": self._questions(level=escalation),
            "boundaries": [
                "ORB can support safeguarding reflection but cannot make threshold decisions.",
                "Local safeguarding procedures and professional judgement must always apply.",
                "Escalate immediately if there is immediate risk of harm.",
            ],
        }

    def prompt_addendum(self, *, narrative: str) -> str:
        result = self.analyse(narrative=narrative)
        lines = [
            "Safeguarding escalation intelligence:",
            f"- Escalation level: {result['escalation_level']}",
        ]
        if result["matched_terms"]:
            lines.append("- Matched terms: " + "; ".join(result["matched_terms"]))
        lines.append(f"- Human review required: {result['human_review_required']}")
        return "\n".join(lines)

    def _guidance(self, *, level: str) -> list[str]:
        if level == "critical":
            return [
                "Immediate safeguarding review should be considered.",
                "Check who must be informed now and what cannot wait.",
                "Ensure clear factual recording and management oversight.",
            ]
        if level == "high":
            return [
                "Pause and consider escalation pathways and safeguarding responsibilities.",
                "Review what evidence is known and what remains unclear.",
            ]
        if level == "medium":
            return [
                "Remain professionally curious and consider whether additional safeguarding context is needed.",
            ]
        return [
            "No major escalation indicators detected from the current narrative.",
        ]

    def _questions(self, *, level: str) -> list[str]:
        questions = [
            "What is known right now?",
            "What remains unclear or missing?",
            "Who needs to know about this concern?",
        ]
        if level in {"high", "critical"}:
            questions.extend([
                "Is there immediate or escalating risk?",
                "What safeguarding procedures apply here?",
                "What oversight or management review is needed?",
            ])
        return questions


safeguarding_escalation_intelligence_engine = SafeguardingEscalationIntelligenceEngine()
