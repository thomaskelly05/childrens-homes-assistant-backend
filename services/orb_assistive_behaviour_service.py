from __future__ import annotations

from typing import Any


ASSISTIVE_PROMPTS = {
    "overdue_protocol_review": "Jamie's return interview is still outstanding.",
    "unresolved_handover_actions": "There are two unresolved actions from handover.",
    "missing_debrief": "The debrief has not been recorded yet.",
    "prepare_handover": "Would you like me to prepare tonight's handover?",
    "weak_child_voice": "There's limited child voice in this section.",
    "open_follow_up": "There's still one follow-up open.",
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
                        "intrusion_level": "soft",
                        "notification_style": "ambient_nudge",
                        "manager_configurable": True,
                    }
                )
        return suggestions


orb_assistive_behaviour_service = OrbAssistiveBehaviourService()

