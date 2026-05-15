from __future__ import annotations


ENVIRONMENT_MODES = {
    "general": {"tone": "calm", "response_length": "concise", "motion": "ambient", "retrieval_priority": "balanced"},
    "recording": {"tone": "factual", "response_length": "short", "motion": "low", "retrieval_priority": "current_record"},
    "handover": {"tone": "practical", "response_length": "concise", "motion": "soft", "retrieval_priority": "continuity"},
    "night_shift": {"tone": "quiet", "response_length": "short", "motion": "soft", "retrieval_priority": "handover"},
    "safeguarding": {"tone": "cautious", "response_length": "short", "motion": "amber_edge", "retrieval_priority": "chronology"},
    "inspection": {"tone": "evidence_led", "response_length": "concise", "motion": "restrained", "retrieval_priority": "citations"},
    "inspection_prep": {"tone": "evidence_led", "response_length": "concise", "motion": "restrained", "retrieval_priority": "chronology_and_gaps"},
    "manager_review": {"tone": "oversight", "response_length": "concise", "motion": "restrained", "retrieval_priority": "evidence_gaps"},
    "document_writing": {"tone": "drafting", "response_length": "concise", "motion": "low", "retrieval_priority": "document_sources"},
    "reflective_writing": {"tone": "reflective", "response_length": "balanced", "motion": "low", "retrieval_priority": "narrative_continuity"},
    "crisis_escalation": {"tone": "clear", "response_length": "very_short", "motion": "minimal", "retrieval_priority": "safeguarding"},
    "child_present": {"tone": "privacy_sensitive", "response_length": "short", "motion": "soft", "retrieval_priority": "safe_summary"},
    "emotional_overload": {"tone": "grounded", "response_length": "very_short", "motion": "minimal", "retrieval_priority": "current_task"},
    "quiet_hours": {"tone": "low_stimulation", "response_length": "short", "motion": "soft", "retrieval_priority": "handover"},
    "mobile": {"tone": "brief", "response_length": "short", "motion": "minimal", "retrieval_priority": "current_task"},
    "mobile_quick_support": {"tone": "brief", "response_length": "short", "motion": "minimal", "retrieval_priority": "current_task"},
}

MODE_ALIASES = {
    "night": "night_shift",
    "crisis": "crisis_escalation",
    "safeguarding_review": "safeguarding",
    "inspection_preparation": "inspection_prep",
    "child_nearby": "child_present",
    "overload": "emotional_overload",
    "writing": "document_writing",
    "mobile_use": "mobile_quick_support",
}


class OrbEnvironmentContextService:
    def settings_for(self, mode: str = "general") -> dict[str, str | bool]:
        resolved = MODE_ALIASES.get(mode, mode)
        settings = ENVIRONMENT_MODES.get(resolved, ENVIRONMENT_MODES["general"]).copy()
        settings["mode"] = resolved
        settings["caption_privacy"] = "sensitive" if resolved in {"child_present", "safeguarding", "crisis_escalation"} else "standard"
        settings["caption_behaviour"] = "simplified" if resolved in {"emotional_overload", "mobile_quick_support"} else "available"
        settings["voice_tone"] = "quiet" if resolved in {"night_shift", "quiet_hours", "child_present"} else settings["tone"]
        settings["notification_style"] = "minimal" if resolved in {"child_present", "crisis_escalation", "emotional_overload"} else "soft"
        settings["visual_intensity"] = "low" if resolved in {"night_shift", "quiet_hours", "emotional_overload"} else "restrained" if settings["motion"] in {"minimal", "restrained"} else "ambient"
        settings["evidence_posture"] = "review_required" if resolved in {"safeguarding", "inspection", "inspection_prep", "manager_review"} else "balanced"
        settings["prompt_timing"] = "minimal" if resolved in {"child_present", "crisis_escalation", "emotional_overload"} else "gentle"
        return settings


orb_environment_context_service = OrbEnvironmentContextService()

