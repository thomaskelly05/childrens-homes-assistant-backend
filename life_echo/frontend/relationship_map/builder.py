from __future__ import annotations

from collections import Counter

from life_echo.schemas import LifeEchoEvent


class LifeEchoRelationshipMapBuilder:
    """Builds relationship mapping data for frontend visualisation."""

    @staticmethod
    def build(events: list[LifeEchoEvent]) -> dict:
        relationship_counter = Counter()
        staff_counter = Counter()

        for event in events:
            relationship_counter.update(event.relationship_ids)
            staff_counter.update(event.staff_ids)

        return {
            "relationships": [
                {
                    "relationship_id": relationship_id,
                    "interaction_count": count,
                }
                for relationship_id, count in relationship_counter.items()
            ],
            "staff_connections": [
                {
                    "staff_id": staff_id,
                    "interaction_count": count,
                }
                for staff_id, count in staff_counter.items()
            ],
        }
