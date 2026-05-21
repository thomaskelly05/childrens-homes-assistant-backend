from __future__ import annotations


class LifeEchoAtmosphereEngine:
    """Calculates emotional atmosphere states for immersive UI rendering."""

    @staticmethod
    def resolve(*, emotional_tone: str) -> dict:
        atmosphere_map = {
            "calm": {
                "atmosphere": "warming_and_settling",
                "ui_glow": "soft_blue",
            },
            "proud": {
                "atmosphere": "uplifting_and_confident",
                "ui_glow": "golden",
            },
            "reflective": {
                "atmosphere": "quiet_reflection",
                "ui_glow": "violet",
            },
        }

        return atmosphere_map.get(
            emotional_tone,
            {
                "atmosphere": "emotionally_present",
                "ui_glow": "neutral",
            },
        )
