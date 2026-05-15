from __future__ import annotations


ENVIRONMENT_MODES = {
    "general": {"tone": "calm", "response_length": "concise", "motion": "ambient", "retrieval_priority": "balanced"},
    "recording": {"tone": "factual", "response_length": "short", "motion": "low", "retrieval_priority": "current_record"},
    "handover": {"tone": "practical", "response_length": "concise", "motion": "soft", "retrieval_priority": "continuity"},
    "night_shift": {"tone": "quiet", "response_length": "short", "motion": "soft", "retrieval_priority": "handover"},
    "safeguarding": {"tone": "cautious", "response_length": "short", "motion": "amber_edge", "retrieval_priority": "chronology"},
    "inspection": {"tone": "evidence_led", "response_length": "concise", "motion": "restrained", "retrieval_priority": "citations"},
    "manager_review": {"tone": "oversight", "response_length": "concise", "motion": "restrained", "retrieval_priority": "evidence_gaps"},
    "document_writing": {"tone": "drafting", "response_length": "concise", "motion": "low", "retrieval_priority": "document_sources"},
    "crisis_escalation": {"tone": "clear", "response_length": "very_short", "motion": "minimal", "retrieval_priority": "safeguarding"},
    "child_present": {"tone": "privacy_sensitive", "response_length": "short", "motion": "soft", "retrieval_priority": "safe_summary"},
    "quiet_hours": {"tone": "low_stimulation", "response_length": "short", "motion": "soft", "retrieval_priority": "handover"},
    "mobile": {"tone": "brief", "response_length": "short", "motion": "minimal", "retrieval_priority": "current_task"},
}


class OrbEnvironmentContextService:
    def settings_for(self, mode: str = "general") -> dict[str, str | bool]:
        settings = ENVIRONMENT_MODES.get(mode, ENVIRONMENT_MODES["general"]).copy()
        settings["caption_privacy"] = "sensitive" if mode in {"child_present", "safeguarding", "crisis_escalation"} else "standard"
        settings["evidence_posture"] = "review_required" if mode in {"safeguarding", "inspection", "manager_review"} else "balanced"
        settings["prompt_timing"] = "minimal" if mode in {"child_present", "crisis_escalation"} else "gentle"
        return settings


orb_environment_context_service = OrbEnvironmentContextService()

