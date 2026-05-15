from __future__ import annotations


class OrbProsodyService:
    def shape(self, *, environment_mode: str = "general", emotional_safety: bool = False) -> dict[str, str | bool | int]:
        if emotional_safety:
            return {
                "pace": "slower",
                "volume_hint": "soft",
                "cadence": "short_phrases",
                "sentence_endings": "soft_downward",
                "pause_ms": 360,
                "interruptible": True,
            }
        if environment_mode in {"night_shift", "quiet_hours", "child_present"}:
            return {
                "pace": "slower",
                "volume_hint": "low",
                "cadence": "brief",
                "sentence_endings": "soft",
                "pause_ms": 320,
                "interruptible": True,
            }
        if environment_mode in {"safeguarding", "crisis_escalation"}:
            return {
                "pace": "measured",
                "volume_hint": "clear",
                "cadence": "evidence_first",
                "sentence_endings": "contained",
                "pause_ms": 280,
                "interruptible": True,
            }
        if environment_mode in {"inspection", "inspection_prep", "manager_review"}:
            return {
                "pace": "measured",
                "volume_hint": "normal",
                "cadence": "concise_evidence_led",
                "sentence_endings": "contained",
                "pause_ms": 240,
                "interruptible": True,
            }
        if environment_mode in {"document_writing", "reflective_writing"}:
            return {
                "pace": "steady",
                "volume_hint": "soft",
                "cadence": "reflective_pauses",
                "sentence_endings": "soft",
                "pause_ms": 300,
                "interruptible": True,
            }
        if environment_mode in {"mobile", "mobile_quick_support"}:
            return {
                "pace": "steady",
                "volume_hint": "normal",
                "cadence": "very_brief",
                "sentence_endings": "clear",
                "pause_ms": 180,
                "interruptible": True,
            }
        return {"pace": "steady", "volume_hint": "normal", "cadence": "conversational", "sentence_endings": "soft", "pause_ms": 230, "interruptible": True}


orb_prosody_service = OrbProsodyService()

