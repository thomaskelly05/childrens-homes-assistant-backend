from __future__ import annotations

from collections import Counter

from life_echo.schemas import LifeEchoEvent


class LifeEchoTriggerHeatmapBuilder:
    """Builds trigger heatmap datasets for frontend visualisation."""

    @staticmethod
    def build(events: list[LifeEchoEvent]) -> dict:
        trigger_counter = Counter()

        for event in events:
            trigger_counter.update(event.triggers)

        return {
            "triggers": [
                {
                    "trigger": trigger,
                    "count": count,
                }
                for trigger, count in trigger_counter.most_common()
            ]
        }
