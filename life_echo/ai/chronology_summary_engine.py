from __future__ import annotations

from collections import Counter

from life_echo.schemas import LifeEchoEvent


class LifeEchoChronologySummaryEngine:
    """Creates concise therapeutic chronology summaries from LifeEcho events."""

    @staticmethod
    def summarise(events: list[LifeEchoEvent]) -> dict:
        if not events:
            return {
                "summary": "No LifeEcho chronology entries are available yet.",
                "key_themes": [],
                "event_count": 0,
            }

        ordered = sorted(events, key=lambda event: event.occurred_at)
        event_counter = Counter(event.event_type.value for event in ordered)
        tone_counter = Counter(event.emotional_tone.value for event in ordered)

        first = ordered[0]
        latest = ordered[-1]

        key_themes = [
            f"Most common event type: {event_counter.most_common(1)[0][0]}",
            f"Most common emotional tone: {tone_counter.most_common(1)[0][0]}",
            f"Timeline span: {first.occurred_at.date()} to {latest.occurred_at.date()}",
        ]

        return {
            "summary": (
                f"LifeEcho reviewed {len(ordered)} emotional chronology entries, "
                f"from {first.occurred_at.date()} to {latest.occurred_at.date()}."
            ),
            "key_themes": key_themes,
            "event_count": len(ordered),
            "first_event_id": first.id,
            "latest_event_id": latest.id,
        }
