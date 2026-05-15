from __future__ import annotations

CARE_MODE_TO_ENVIRONMENT = {
    "general": "general",
    "child_present": "child_present",
    "child_nearby": "child_present",
    "office": "general",
    "staff_meeting": "manager_review",
    "safeguarding": "safeguarding",
    "safeguarding_discussion": "safeguarding",
    "safeguarding_review": "safeguarding",
    "quiet_hours": "quiet_hours",
    "night_shift": "night_shift",
    "mobile": "mobile",
    "mobile_use": "mobile",
    "mobile_quick_support": "mobile_quick_support",
    "crisis_escalation": "crisis_escalation",
    "crisis_mode": "crisis_escalation",
    "inspection": "inspection",
    "inspection_preparation": "inspection",
    "inspection_prep": "inspection_prep",
    "handover": "handover",
    "recording": "recording",
    "document_writing": "document_writing",
    "reflective_writing": "reflective_writing",
    "emotional_overload": "emotional_overload",
    "supervision": "supervision",
    "management_review": "management_review",
    "manager_review": "management_review",
}


class OrbCareEnvironmentModeService:
    def resolve(self, mode: str = "office") -> dict[str, str | bool]:
        environment_mode = CARE_MODE_TO_ENVIRONMENT.get(mode, "general")
        privacy_sensitive = mode in {"child_present", "child_nearby", "safeguarding", "safeguarding_discussion", "safeguarding_review", "crisis_escalation", "crisis_mode"}
        low_stimulation = mode in {"child_present", "child_nearby", "quiet_hours", "night_shift", "emotional_overload"}
        return {
            "care_mode": mode,
            "environment_mode": environment_mode,
            "retrieval_behaviour": "active_child_and_evidence_first" if privacy_sensitive else "rbac_scoped",
            "visual_intensity": "soft" if low_stimulation else "ambient",
            "motion": "minimal" if mode in {"emotional_overload", "crisis_escalation", "crisis_mode", "mobile_quick_support"} else "soft" if low_stimulation else "ambient",
            "voice_volume_hint": "low" if low_stimulation else "clear" if privacy_sensitive else "normal",
            "captions": "privacy_sensitive" if privacy_sensitive else "available",
            "response_length": "very_short" if mode in {"emotional_overload", "crisis_escalation", "crisis_mode"} else "short" if privacy_sensitive or low_stimulation else "concise",
            "evidence_posture": "review_required",
            "prompt_timing": "minimal" if privacy_sensitive else "gentle",
            "information_density": "minimal" if low_stimulation or privacy_sensitive else "evidence_first" if environment_mode in {"inspection", "inspection_prep"} else "calm",
            "failure_copy_style": "plain_reassuring",
        }


orb_care_environment_mode_service = OrbCareEnvironmentModeService()

