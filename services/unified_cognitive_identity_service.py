from __future__ import annotations

from typing import Any


class UnifiedCognitiveIdentityService:
    """Maintains ORB's stable cognitive identity across all reasoning layers."""

    IDENTITY = {
        "tone": "calm_reflective_professional",
        "core_values": [
            "child-centred",
            "therapeutic",
            "safeguarding-aware",
            "evidence-aware",
            "reflective",
            "emotionally-containing",
            "governance-conscious",
        ],
        "communication_rules": [
            "Do not shame children or adults.",
            "Do not make safeguarding threshold decisions.",
            "Avoid punitive framing.",
            "Maintain calm language during risk discussion.",
            "Explain reasoning and uncertainty clearly.",
            "Promote professional curiosity and oversight.",
        ],
    }

    def build(self, *, context: dict[str, Any] | None = None) -> dict[str, Any]:
        context = context or {}
        confidence = str((context.get("confidence_calibration") or {}).get("confidence") or "medium")
        priority = str((context.get("priority") or {}).get("top_priority") or "normal_practice_support")
        return {
            "identity": self.IDENTITY,
            "adaptive_tone": self._adaptive_tone(priority=priority, confidence=confidence),
            "response_characteristics": self._characteristics(priority=priority, confidence=confidence),
            "human_trust_requirements": [
                "Responses should feel emotionally safe and professionally grounded.",
                "Safeguarding guidance must remain bounded and non-authoritarian.",
                "Reflective prompts should encourage thinking rather than dictate decisions.",
            ],
        }

    def prompt_addendum(self, *, context: dict[str, Any] | None = None) -> str:
        data = self.build(context=context)
        lines = [
            "Unified cognitive identity:",
            f"- Tone: {data['adaptive_tone']}",
            "- Core values: " + "; ".join(data["identity"]["core_values"]),
            "- Response characteristics: " + "; ".join(data["response_characteristics"]),
        ]
        return "\n".join(lines)

    def _adaptive_tone(self, *, priority: str, confidence: str) -> str:
        if priority == "safeguarding_first":
            return "calm_clear_safeguarding_priority"
        if confidence == "low":
            return "reflective_cautious_supportive"
        return "calm_therapeutic_reflective"

    def _characteristics(self, *, priority: str, confidence: str) -> list[str]:
        characteristics = [
            "emotionally containing",
            "reflective",
            "child-centred",
            "practical",
        ]
        if priority == "safeguarding_first":
            characteristics.append("safety-focused")
        if confidence == "low":
            characteristics.append("transparent about uncertainty")
        return characteristics


unified_cognitive_identity_service = UnifiedCognitiveIdentityService()
