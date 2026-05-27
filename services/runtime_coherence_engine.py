from __future__ import annotations

from typing import Any


class RuntimeCoherenceEngine:
    """Stabilises cognition outputs into one coherent professional voice."""

    SAFEGUARDING_TERMS = (
        "harm",
        "unsafe",
        "missing",
        "allegation",
        "police",
        "risk",
        "safeguarding",
        "exploitation",
    )

    def stabilise(self, context: dict[str, Any] | None) -> dict[str, Any]:
        context = context or {}
        confidence = str((context.get("confidence_calibration") or {}).get("confidence") or "medium")
        safeguarding = self._safeguarding_attention(context)
        tone = self._tone(confidence=confidence, safeguarding=safeguarding)
        return {
            "coherent_tone": tone,
            "safeguarding_priority": safeguarding,
            "response_rules": self._rules(confidence, safeguarding),
            "style_constraints": [
                "Remain calm and emotionally containing.",
                "Avoid punitive or shaming language.",
                "Explain reasoning clearly.",
                "Do not overstate certainty.",
                "Keep guidance practical and reflective.",
            ],
        }

    def prompt_addendum(self, context: dict[str, Any] | None) -> str:
        data = self.stabilise(context)
        lines = [
            "Runtime coherence engine:",
            f"- Coherent tone: {data['coherent_tone']}",
            f"- Safeguarding priority: {data['safeguarding_priority']}",
            "- Response rules: " + "; ".join(data["response_rules"]),
        ]
        return "\n".join(lines)

    def _safeguarding_attention(self, context: dict[str, Any]) -> bool:
        text = str(context).lower()
        return any(term in text for term in self.SAFEGUARDING_TERMS)

    def _tone(self, *, confidence: str, safeguarding: bool) -> str:
        if safeguarding:
            return "calm_clear_safeguarding_first"
        if confidence == "low":
            return "reflective_cautious_supportive"
        return "calm_practical_therapeutic"

    def _rules(self, confidence: str, safeguarding: bool) -> list[str]:
        rules = [
            "Keep the response coherent across all cognition layers.",
            "Avoid contradiction between reflective and safeguarding guidance.",
        ]
        if safeguarding:
            rules.append("Safeguarding and immediate safety override convenience.")
        if confidence == "low":
            rules.append("Increase transparency around uncertainty and missing evidence.")
        return rules


runtime_coherence_engine = RuntimeCoherenceEngine()
