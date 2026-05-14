from __future__ import annotations

import os
from typing import Any


def _enabled(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on", "enabled"}


class OrbWakeWordService:
    """Privacy-safe wake-word foundation.

    Real passive wake-word detection is intentionally disabled by default. The
    service exposes capability and lifecycle metadata so clients can implement a
    clear opt-in flow later without changing Orb's session contract.
    """

    wake_phrases = ("Hey Orb", "Hey IndiCare")

    def capability(self, *, user_agent: str | None = None) -> dict[str, Any]:
        return {
            "enabled": _enabled(os.getenv("ORB_WAKE_WORD_ENABLED"), default=False),
            "default_enabled": False,
            "phrases": list(self.wake_phrases),
            "activation_lifecycle": [
                "disabled",
                "permission_check",
                "passive_listening",
                "wake_detected",
                "active_conversation",
                "muted_or_stopped",
            ],
            "privacy": {
                "raw_audio_stored": False,
                "server_side_passive_listening": False,
                "client_side_opt_in_required": True,
                "mute_must_stop_passive_capture": True,
            },
            "device_capability": {
                "requires_microphone": True,
                "requires_secure_context": True,
                "user_agent": user_agent,
            },
        }


orb_wake_word_service = OrbWakeWordService()
