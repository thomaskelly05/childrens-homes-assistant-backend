from __future__ import annotations


class OrbProsodyService:
    def shape(self, *, environment_mode: str = "general", emotional_safety: bool = False) -> dict[str, str | bool]:
        if emotional_safety:
            return {"pace": "slower", "volume_hint": "soft", "cadence": "short_phrases", "interruptible": True}
        if environment_mode in {"night_shift", "quiet_hours", "child_present"}:
            return {"pace": "slower", "volume_hint": "low", "cadence": "brief", "interruptible": True}
        if environment_mode in {"safeguarding", "crisis_escalation"}:
            return {"pace": "measured", "volume_hint": "clear", "cadence": "evidence_first", "interruptible": True}
        return {"pace": "steady", "volume_hint": "normal", "cadence": "conversational", "interruptible": True}


orb_prosody_service = OrbProsodyService()

