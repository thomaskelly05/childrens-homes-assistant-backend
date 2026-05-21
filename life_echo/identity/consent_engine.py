from __future__ import annotations

from datetime import datetime, timezone


class LifeEchoConsentEngine:
    """Tracks consent and ownership preferences for emotional memories."""

    def __init__(self) -> None:
        self._consents: dict[str, dict] = {}

    def set_preferences(
        self,
        *,
        child_id: str,
        allow_memory_exports: bool = True,
        allow_voice_storage: bool = True,
        allow_family_access: bool = False,
        private_reflection_mode: bool = True,
    ) -> dict:
        preferences = {
            "child_id": child_id,
            "allow_memory_exports": allow_memory_exports,
            "allow_voice_storage": allow_voice_storage,
            "allow_family_access": allow_family_access,
            "private_reflection_mode": private_reflection_mode,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        self._consents[child_id] = preferences
        return preferences

    def get_preferences(self, child_id: str) -> dict | None:
        return self._consents.get(child_id)


life_echo_consent_engine = LifeEchoConsentEngine()
