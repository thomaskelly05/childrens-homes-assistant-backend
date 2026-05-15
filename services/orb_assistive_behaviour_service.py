from __future__ import annotations

from typing import Any


ASSISTIVE_PROMPTS = {
    "overdue_protocol_review": "Jamie's missing protocol review is overdue.",
    "unresolved_handover_actions": "There are two unresolved actions from handover.",
    "missing_debrief": "The debrief has not been recorded yet.",
    "prepare_handover": "Would you like me to prepare tonight's handover?",
    "weak_child_voice": "This note may benefit from child voice.",
}


class OrbAssistiveBehaviourService:
    def suggest(self, *, signals: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        data = signals or {}
        suggestions: list[dict[str, Any]] = []
        for key, copy in ASSISTIVE_PROMPTS.items():
            if data.get(key):
                suggestions.append(
                    {
                        "id": key,
                        "copy": copy,
                        "tone": "gentle_non_punitive",
                        "dismissible": True,
                        "evidence_linked": True,
                        "manager_configurable": True,
                    }
                )
        return suggestions


orb_assistive_behaviour_service = OrbAssistiveBehaviourService()

