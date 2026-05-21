from __future__ import annotations

from collections import Counter

from life_echo.schemas import EmotionalTone, LifeEchoEvent


class LifeEchoPatternEngine:
    """Detects emotional and behavioural patterns from timeline events."""

    @staticmethod
    def detect_patterns(events: list[LifeEchoEvent]) -> list[str]:
        if not events:
            return ["No emotional patterns detected yet."]

        patterns: list[str] = []

        emotion_counts = Counter(event.emotional_tone.value for event in events)
        event_counts = Counter(event.event_type.value for event in events)

        dominant_emotion = emotion_counts.most_common(1)[0][0]
        dominant_event_type = event_counts.most_common(1)[0][0]

        patterns.append(f"Dominant emotional presentation: {dominant_emotion}.")
        patterns.append(f"Most frequent event category: {dominant_event_type}.")

        dysregulated_total = sum(
            emotion_counts.get(value, 0)
            for value in [
                EmotionalTone.anxious.value,
                EmotionalTone.angry.value,
                EmotionalTone.dysregulated.value,
            ]
        )

        settled_total = sum(
            emotion_counts.get(value, 0)
            for value in [
                EmotionalTone.calm.value,
                EmotionalTone.settled.value,
                EmotionalTone.joyful.value,
                EmotionalTone.proud.value,
            ]
        )

        if dysregulated_total > settled_total:
            patterns.append(
                "Recent emotional entries suggest heightened distress or instability."
            )
        else:
            patterns.append(
                "Recent emotional entries suggest increasing emotional safety or regulation."
            )

        trigger_counter = Counter()
        for event in events:
            trigger_counter.update(event.triggers)

        if trigger_counter:
            trigger, count = trigger_counter.most_common(1)[0]
            patterns.append(
                f"Most referenced trigger or stressor: '{trigger}' ({count} mentions)."
            )

        return patterns
