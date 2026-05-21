from __future__ import annotations


class LifeEchoThemeEngine:
    """Maps emotional states to visual atmosphere themes."""

    THEMES = {
        "calm": {
            "gradient": "soft-blue",
            "glow": "gentle",
            "motion": "slow",
        },
        "settled": {
            "gradient": "warm-green",
            "glow": "ambient",
            "motion": "steady",
        },
        "joyful": {
            "gradient": "golden-sunrise",
            "glow": "bright",
            "motion": "uplifting",
        },
        "proud": {
            "gradient": "violet-gold",
            "glow": "focused",
            "motion": "confident",
        },
        "anxious": {
            "gradient": "muted-indigo",
            "glow": "subtle",
            "motion": "careful",
        },
        "dysregulated": {
            "gradient": "storm-grey",
            "glow": "fragmented",
            "motion": "unstable",
        },
    }

    @classmethod
    def resolve(cls, emotional_tone: str) -> dict:
        return cls.THEMES.get(
            emotional_tone,
            {
                "gradient": "neutral",
                "glow": "soft",
                "motion": "steady",
            },
        )
