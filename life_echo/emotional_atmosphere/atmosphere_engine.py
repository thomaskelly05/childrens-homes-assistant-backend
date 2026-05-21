from __future__ import annotations

from collections import Counter

from life_echo.schemas import EmotionalTone, LifeEchoEvent


class LifeEchoAtmosphereEngine:
    """Builds emotional atmosphere summaries from LifeEcho events."""

    WARM_TONES = {
        EmotionalTone.calm.value,
        EmotionalTone.settled.value,
        EmotionalTone.joyful.value,
        EmotionalTone.proud.value,
    }

    HEAVY_TONES = {
        EmotionalTone.anxious.value,
        EmotionalTone.sad.value,
        EmotionalTone.angry.value,
        EmotionalTone.withdrawn.value,
        EmotionalTone.dysregulated.value,
    }

    @classmethod
    def build(cls, events: list[LifeEchoEvent]) -> dict:
        if not events:
            return {
                "atmosphere": "quiet_beginning",
                "description": "LifeEcho is waiting for meaningful emotional moments to be added.",
                "themes": [],
            }

        tone_counter = Counter(event.emotional_tone.value for event in events)
        tag_counter = Counter()
        protective_counter = Counter()

        for event in events:
            tag_counter.update(event.tags)
            protective_counter.update(event.protective_factors)

        warm = sum(tone_counter.get(tone, 0) for tone in cls.WARM_TONES)
        heavy = sum(tone_counter.get(tone, 0) for tone in cls.HEAVY_TONES)

        if warm > heavy:
            atmosphere = "warming_and_settling"
            description = "The emotional atmosphere suggests growing safety, connection or regulation."
        elif heavy > warm:
            atmosphere = "heavy_and_uncertain"
            description = "The emotional atmosphere suggests distress, uncertainty or unmet emotional need."
        else:
            atmosphere = "mixed_reflective"
            description = "The emotional atmosphere is mixed, with both challenge and signs of growth."

        return {
            "atmosphere": atmosphere,
            "description": description,
            "dominant_emotion": tone_counter.most_common(1)[0][0],
            "themes": [theme for theme, _ in tag_counter.most_common(5)],
            "protective_factors": [
                factor for factor, _ in protective_counter.most_common(5)
            ],
        }
