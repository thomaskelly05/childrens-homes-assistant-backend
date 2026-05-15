from __future__ import annotations

CARE_MODE_TO_ENVIRONMENT = {
    "child_nearby": "child_present",
    "office": "general",
    "staff_meeting": "manager_review",
    "safeguarding_discussion": "safeguarding",
    "quiet_hours": "quiet_hours",
    "mobile_use": "mobile",
    "crisis_escalation": "crisis_escalation",
    "inspection_preparation": "inspection",
    "handover": "handover",
    "recording": "recording",
    "document_writing": "document_writing",
}


class OrbCareEnvironmentModeService:
    def resolve(self, mode: str = "office") -> dict[str, str | bool]:
        environment_mode = CARE_MODE_TO_ENVIRONMENT.get(mode, "general")
        privacy_sensitive = mode in {"child_nearby", "safeguarding_discussion", "crisis_escalation"}
        return {
            "care_mode": mode,
            "environment_mode": environment_mode,
            "retrieval_behaviour": "active_child_and_evidence_first" if privacy_sensitive else "rbac_scoped",
            "visual_intensity": "soft" if mode in {"child_nearby", "quiet_hours"} else "ambient",
            "voice_volume_hint": "low" if mode in {"child_nearby", "quiet_hours"} else "normal",
            "captions": "privacy_sensitive" if privacy_sensitive else "available",
            "response_length": "short" if privacy_sensitive else "concise",
            "evidence_posture": "review_required",
            "prompt_timing": "minimal" if privacy_sensitive else "gentle",
        }


orb_care_environment_mode_service = OrbCareEnvironmentModeService()

