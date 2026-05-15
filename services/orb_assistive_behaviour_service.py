from __future__ import annotations

from typing import Any


ASSISTIVE_PROMPTS = {
    "overdue_protocol_review": "A return interview is still outstanding.",
    "unresolved_handover_actions": "There are two unresolved actions from handover.",
    "missing_debrief": "The debrief has not been recorded yet.",
    "prepare_handover": "Would you like me to prepare tonight's handover?",
    "weak_child_voice": "There's limited child voice in this section.",
    "open_follow_up": "There's still one follow-up open.",
}


def _counted(label: str, count: Any, fallback: str) -> str:
    try:
        value = int(count)
    except (TypeError, ValueError):
        return fallback
    if value <= 0:
        return fallback
    return f"{value} {label}{'' if value == 1 else 's'}"


class OrbAssistiveBehaviourService:
    def suggest(self, *, signals: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        data = signals or {}
        suggestions: list[dict[str, Any]] = []
        child_name = str(data.get("child_name") or data.get("preferred_name") or "").strip()
        context = str(data.get("environment_mode") or data.get("care_mode") or "").strip()
        quiet_context = context in {"child_nearby", "child_present", "quiet_hours", "night_shift", "emotional_overload"}
        for key, copy in ASSISTIVE_PROMPTS.items():
            if data.get(key):
                prompt_copy = copy
                if key == "overdue_protocol_review" and child_name:
                    prompt_copy = f"{child_name}'s return interview is still outstanding."
                if key == "unresolved_handover_actions":
                    prompt_copy = f"There are {_counted('unresolved action', data.get('unresolved_handover_action_count'), 'unresolved actions')} from handover."
                if key == "open_follow_up":
                    prompt_copy = f"There's still {_counted('follow-up', data.get('open_follow_up_count'), 'one follow-up')} open."
                suggestions.append(
                    {
                        "id": key,
                        "copy": prompt_copy,
                        "tone": "gentle_non_punitive",
                        "dismissible": True,
                        "evidence_linked": True,
                        "evidence": data.get(f"{key}_evidence") or data.get("evidence") or [],
                        "intrusion_level": "minimal" if quiet_context else "soft",
                        "notification_style": "quiet_presence" if quiet_context else "ambient_nudge",
                        "manager_configurable": True,
                        "suggested_action": self._action_for(key),
                    }
                )
        try:
            incident_count = int(data.get("recent_incident_count") or 0)
        except (TypeError, ValueError):
            incident_count = 0
        if incident_count >= 3 and not data.get("dismiss_simplify_workspace"):
            suggestions.append(
                {
                    "id": "simplify_after_incidents",
                    "copy": "There have been several incidents this evening. I can simplify the workspace if helpful.",
                    "tone": "grounded_supportive",
                    "dismissible": True,
                    "evidence_linked": True,
                    "evidence": data.get("recent_incident_evidence") or [],
                    "intrusion_level": "minimal",
                    "notification_style": "quiet_presence",
                    "manager_configurable": True,
                    "suggested_action": "offer_reduced_stimulation_workspace",
                }
            )
        return suggestions

    def _action_for(self, key: str) -> str:
        return {
            "overdue_protocol_review": "open_return_interview_task",
            "unresolved_handover_actions": "open_handover_actions",
            "missing_debrief": "open_debrief_record",
            "prepare_handover": "prepare_handover_draft",
            "weak_child_voice": "show_child_voice_prompt",
            "open_follow_up": "open_follow_up",
        }.get(key, "review_evidence")


orb_assistive_behaviour_service = OrbAssistiveBehaviourService()

