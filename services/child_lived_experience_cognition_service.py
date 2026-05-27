from __future__ import annotations

from typing import Any


class ChildLivedExperienceCognitionService:
    """Models child lived experience and relational safety.

    This is one of the core Ofsted-aligned cognition layers.
    It attempts to move ORB away from incident-centric thinking and toward:
    - emotional safety
    - belonging
    - stability
    - trust
    - relational reliability
    - identity and voice
    """

    EXPERIENCE_AREAS = {
        "belonging": ("welcome", "included", "family", "belong", "trusted adult", "safe base"),
        "instability": ("placement breakdown", "missing", "multiple homes", "disruption", "instability"),
        "voice": ("wishes", "feelings", "voice", "not listened", "choice", "consulted"),
        "emotional_safety": ("scared", "unsafe", "alone", "fear", "anxious", "distressed"),
        "repair": ("repair", "reconnected", "apology", "restored", "reassured"),
        "identity": ("culture", "identity", "religion", "lgbt", "neurodivergent", "autism"),
    }

    def analyse(self, text: str) -> dict[str, Any]:
        lower = str(text or "").lower()
        signals = {
            area: [term for term in terms if term in lower]
            for area, terms in self.EXPERIENCE_AREAS.items()
        }
        return {
            "signals": signals,
            "core_questions": [
                "What is life feeling like for this child right now?",
                "Does the child feel emotionally safe?",
                "Does the child feel listened to and understood?",
                "What relationships are protective?",
                "What may the child be communicating through behaviour or presentation?",
            ],
            "ofsted_alignment": [
                "children's experiences",
                "progress",
                "stability",
                "voice",
                "relationships",
            ],
        }

    def prompt_addendum(self, text: str) -> str:
        data = self.analyse(text)
        lines = ["Child lived-experience cognition:"]
        for area, hits in data["signals"].items():
            if hits:
                lines.append(f"- {area}: " + "; ".join(hits))
        lines.append("- Core questions:")
        for question in data["core_questions"]:
            lines.append(f"  - {question}")
        return "\n".join(lines)


child_lived_experience_cognition_service = ChildLivedExperienceCognitionService()
