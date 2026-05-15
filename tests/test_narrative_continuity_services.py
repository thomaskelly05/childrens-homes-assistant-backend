from services.emotional_progression_service import emotional_progression_service
from services.narrative_continuity_service import narrative_continuity_service
from services.relationship_continuity_service import relationship_continuity_service


def test_narrative_continuity_filters_cross_child_records_and_builds_story():
    records = [
        {
            "id": "note-1",
            "home_id": 1,
            "young_person_id": 10,
            "record_type": "daily_note",
            "created_at": "2026-05-13T09:00:00Z",
            "summary": "Jamie said school felt better because staff checked his PE kit. Follow-up is to praise attendance.",
            "mood": "settled",
            "status": "open",
        },
        {
            "id": "incident-1",
            "home_id": 1,
            "young_person_id": 10,
            "record_type": "incident",
            "created_at": "2026-05-12T18:00:00Z",
            "summary": "Unexpected contact triggered anxiety. Staff offered space and keywork, and Jamie repaired with a peer.",
            "status": "review",
        },
        {
            "id": "other-child",
            "home_id": 1,
            "young_person_id": 11,
            "summary": "Noah missing episode with police.",
        },
    ]

    continuity = narrative_continuity_service.summarise(
        records=records,
        child={"preferredName": "Jamie", "placementStatus": "active"},
        young_person_id=10,
        home_id=1,
    )

    assert continuity["record_count"] == 2
    assert "Noah" not in str(continuity)
    assert continuity["unresolved_themes"]
    assert any(item["theme"] in {"education", "relationships", "wellbeing"} for item in continuity["recurring_themes"])
    assert continuity["child_voice_continuity"]
    assert continuity["what_helped"]
    assert continuity["what_still_needs_support"]
    assert continuity["support_effectiveness"]["visible_support_markers"]
    assert continuity["relationship_continuity"]["markers"]
    assert continuity["emotional_wellbeing"]["current_state"] == "settled"
    assert continuity["today_mattered_because"].startswith("Today mattered because Jamie")


def test_relationship_and_emotional_services_explain_cautious_continuity():
    records = [
        {"id": "r1", "young_person_id": "yp-1", "summary": "Mum contact was positive and staff reassured the child.", "mood": "anxious"},
        {"id": "r2", "young_person_id": "yp-1", "summary": "Key worker debrief helped the child feel settled.", "mood": "settled"},
        {"id": "r3", "young_person_id": "yp-2", "summary": "Peer conflict for another child.", "mood": "heightened"},
    ]

    relationships = relationship_continuity_service.markers(records=records, young_person_id="yp-1")
    emotions = emotional_progression_service.progression(records=records, young_person_id="yp-1")

    assert relationships["recurring_relationships"]
    assert relationships["guardrail"].startswith("Relationship continuity")
    assert emotions["what_changed"] == "Presentation moved from anxious to settled in the visible records."
    assert "not a diagnosis" in emotions["guardrail"]
