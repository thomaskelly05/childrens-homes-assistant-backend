from __future__ import annotations

from collections import defaultdict

from life_echo.schemas import LifeEchoEvent


class LifeEchoWellbeingTrajectoryBuilder:
    """Builds frontend wellbeing trajectory datasets."""

    @staticmethod
    def build(events: list[LifeEchoEvent]) -> dict:
        trajectory = defaultdict(int)

        for event in events:
            key = event.occurred_at.date().isoformat()

            if event.emotional_tone.value in {
                "calm",
                "settled",
                "joyful",
                "proud",
            }:
                trajectory[key] += 1
            elif event.emotional_tone.value in {
                "anxious",
                "angry",
                "withdrawn",
                "dysregulated",
            }:
                trajectory[key] -= 1

        return {
            "points": [
                {
                    "date": date,
                    "score": score,
                }
                for date, score in sorted(trajectory.items())
            ]
        }
