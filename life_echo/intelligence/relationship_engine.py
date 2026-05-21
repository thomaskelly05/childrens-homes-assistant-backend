from __future__ import annotations

from collections import Counter

from life_echo.schemas import LifeEchoEvent


class LifeEchoRelationshipEngine:
    """Maps relational consistency and emotional safety indicators."""

    @staticmethod
    def analyse_relationships(events: list[LifeEchoEvent]) -> dict:
        relationship_counter = Counter()
        staff_counter = Counter()

        for event in events:
            relationship_counter.update(event.relationship_ids)
            staff_counter.update(event.staff_ids)

        strongest_relationships = [
            relationship
            for relationship, _count in relationship_counter.most_common(5)
        ]

        most_present_staff = [
            staff_id
            for staff_id, _count in staff_counter.most_common(5)
        ]

        return {
            "relationship_count": len(relationship_counter),
            "staff_count": len(staff_counter),
            "strongest_relationships": strongest_relationships,
            "most_present_staff": most_present_staff,
            "summary": (
                "Relationship continuity indicators generated from emotional timeline data."
            ),
        }
