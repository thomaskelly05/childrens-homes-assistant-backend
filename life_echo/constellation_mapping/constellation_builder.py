from __future__ import annotations

from collections import Counter

from life_echo.schemas import LifeEchoEvent


class LifeEchoConstellationBuilder:
    """Builds relationship and memory graph structures for frontend rendering."""

    @staticmethod
    def build(events: list[LifeEchoEvent]) -> dict:
        nodes = []
        links = []
        relationship_counter = Counter()

        for event in events:
            nodes.append(
                {
                    "id": event.id,
                    "label": event.title,
                    "emotion": event.emotional_tone.value,
                    "event_type": event.event_type.value,
                }
            )

            for relationship_id in event.relationship_ids:
                relationship_counter.update([relationship_id])
                links.append(
                    {
                        "source": event.id,
                        "target": relationship_id,
                        "kind": "relationship",
                    }
                )

        return {
            "nodes": nodes,
            "links": links,
            "relationship_strengths": [
                {
                    "relationship_id": relationship_id,
                    "count": count,
                }
                for relationship_id, count in relationship_counter.most_common(10)
            ],
        }
