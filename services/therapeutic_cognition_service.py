from __future__ import annotations

from typing import Any


class TherapeuticCognitionService:
    """Reflective therapeutic interpretation layer.

    This service intentionally avoids diagnosis, prediction or replacement of
    therapeutic professionals. It helps identify whether operational language
    and practice signals align with trauma-informed and relationship-based care.
    """

    THERAPEUTIC_SIGNALS = {
        "warmth": ["warm", "kind", "reassured", "supported", "validated"],
        "repair": ["repair", "reconnected", "apologised", "restored"],
        "co_regulation": ["calm", "regulated", "grounded", "supported emotionally"],
        "curiosity": ["wondered", "explored", "curious", "understood"],
    }

    PUNITIVE_SIGNALS = {
        "control": ["non compliant", "attention seeking", "manipulative"],
        "punishment": ["sanction", "punished", "removed"],
        "disconnection": ["ignored", "isolated", "excluded"],
    }

    def analyse(self, payload: dict[str, Any]) -> dict[str, Any]:
        text = self._extract_text(payload).lower()

        therapeutic_matches = self._match(self.THERAPEUTIC_SIGNALS, text)
        punitive_matches = self._match(self.PUNITIVE_SIGNALS, text)

        emotional_temperature = self._emotional_temperature(
            therapeutic_matches=therapeutic_matches,
            punitive_matches=punitive_matches,
        )

        return {
            "context_type": "therapeutic_cognition",
            "emotional_temperature": emotional_temperature,
            "therapeutic_signals": therapeutic_matches,
            "punitive_signals": punitive_matches,
            "reflective_prompts": self._prompts(emotional_temperature),
            "boundaries": {
                "not_a_clinical_assessment": True,
                "not_a_diagnostic_tool": True,
                "supports_reflective_practice": True,
            },
        }

    def _extract_text(self, payload: dict[str, Any]) -> str:
        fragments: list[str] = []
        for value in payload.values():
            if isinstance(value, str):
                fragments.append(value)
            elif isinstance(value, list):
                fragments.extend(str(item) for item in value)
            elif isinstance(value, dict):
                fragments.append(self._extract_text(value))
        return " ".join(fragments)

    def _match(self, groups: dict[str, list[str]], text: str) -> dict[str, list[str]]:
        matched: dict[str, list[str]] = {}
        for category, keywords in groups.items():
            found = [keyword for keyword in keywords if keyword in text]
            if found:
                matched[category] = found
        return matched

    def _emotional_temperature(self, *, therapeutic_matches: dict[str, list[str]], punitive_matches: dict[str, list[str]]) -> str:
        therapeutic_score = sum(len(v) for v in therapeutic_matches.values())
        punitive_score = sum(len(v) for v in punitive_matches.values())

        if punitive_score >= therapeutic_score + 3:
            return "emotionally_concerning"
        if punitive_score > therapeutic_score:
            return "watch"
        if therapeutic_score >= punitive_score + 3:
            return "emotionally_attuned"
        return "mixed"

    def _prompts(self, emotional_temperature: str) -> list[str]:
        if emotional_temperature == "emotionally_concerning":
            return [
                "Could the language unintentionally communicate shame or blame?",
                "How might the child have emotionally experienced this interaction?",
                "Would reflective supervision help reframe the response therapeutically?",
            ]
        if emotional_temperature == "watch":
            return [
                "Check whether emotional containment and child voice are sufficiently visible.",
                "Review whether the recording shows curiosity as well as behaviour description.",
            ]
        if emotional_temperature == "emotionally_attuned":
            return [
                "Continue evidencing repair, warmth and co-regulation.",
                "Capture protective relational moments consistently.",
            ]
        return [
            "Review whether emotional context and relational repair are visible.",
            "Consider whether the recording balances accountability with empathy.",
        ]


therapeutic_cognition_service = TherapeuticCognitionService()
