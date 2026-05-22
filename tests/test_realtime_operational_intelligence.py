from __future__ import annotations

from unittest.mock import MagicMock

from routers import care_hub_routes, platform_observability_routes, realtime_operational_routes
from services.intelligence.event_bus.operational_event_bus import OperationalEvent, operational_event_bus
from services.predictive_safeguarding_service import predictive_safeguarding_service
from services.realtime_event_bus import REALTIME_EVENT_TYPES, realtime_event_bus
from services.realtime_operational_stream_service import realtime_operational_stream_service


def _paths(router) -> set[str]:
    return {getattr(route, "path", "") for route in router.routes}


def test_realtime_event_types_include_operational_streams() -> None:
    for event_type in (
        "safeguarding.alert",
        "missing_episode.alert",
        "workflow.escalation",
        "care_hub.update",
        "orb.summary",
    ):
        assert event_type in REALTIME_EVENT_TYPES


def test_realtime_operational_routes_expose_ws_and_intelligence_paths() -> None:
    paths = _paths(realtime_operational_routes.router)
    assert "/os/realtime/ws" in paths
    assert "/os/realtime/stream" in paths
    assert "/os/realtime/replay" in paths
    assert "/os/realtime/predictive-safeguarding" in paths
    assert "/os/realtime/provider-command-centre" in paths


def test_platform_observability_routes() -> None:
    paths = _paths(platform_observability_routes.router)
    assert "/os/platform-health" in paths
    assert "/os/performance-metrics" in paths


def test_care_hub_routes_include_inspection_and_workforce_slices() -> None:
    paths = _paths(care_hub_routes.router)
    assert "/os/care-hub/inspection-readiness" in paths
    assert "/os/care-hub/workforce" in paths


def test_operational_event_bus_replay_protection(monkeypatch) -> None:
    operational_event_bus.reset_for_tests()
    published: list[dict] = []

    def fake_publish(**kwargs):
        published.append(kwargs)
        return {"published": True, "event_id": "evt_test"}

    monkeypatch.setattr("services.realtime_event_bus.realtime_event_bus.publish", fake_publish)
    event = OperationalEvent(
        domain="safeguarding",
        entity_type="alert",
        entity_id="1",
        transition_type="escalate",
        home_id=3,
        actor={"id": 1, "home_id": 3, "provider_id": 2},
        payload={},
    )
    first = operational_event_bus.publish(event)
    second = operational_event_bus.publish(event)
    third = operational_event_bus.publish(event)
    fourth = operational_event_bus.publish(event)

    assert first["ok"] is True
    assert second["ok"] is True
    assert third["ok"] is True
    assert fourth["ok"] is False
    assert fourth["reason"] == "replay_protection"


def test_predictive_safeguarding_from_feed(monkeypatch) -> None:
    sample_event = {
        "event_id": "evt_1",
        "source_table": "incidents",
        "safeguarding": True,
        "emotional_tags": ["dysregulated", "distressed"],
        "risk_tags": ["missing"],
        "event_at": "2026-05-20T10:00:00+00:00",
    }
    feed = {
        "event_count": 1,
        "events": [sample_event],
        "manager_queue": {"items": [{"category": "workflow"}], "total": 1},
        "home_operational_intelligence": {
            "home_climate": {
                "safeguarding_pressure": {"state": "elevated", "pressure_score": 40},
                "workforce_pressure": {"state": "high", "queue_items": 4},
                "emotional_climate": {"state": "unsettled"},
            }
        },
        "orb_operational_memory": {"conversation_summary": "Operational memory active."},
    }
    monkeypatch.setattr(
        "services.predictive_safeguarding_service.build_operational_feed",
        lambda *args, **kwargs: feed,
    )
    monkeypatch.setattr(
        "services.predictive_safeguarding_service.chronology_pattern_service.analyse",
        lambda events: {
            "escalation_before_incidents": [{"target_event_id": "evt_1"}],
            "escalation_before_missing_episodes": [],
            "repeat_dysregulation_cycles": [{"theme": "dysregulated"}],
            "repeat_safeguarding_themes": [{"theme": "safeguarding"}],
            "placement_instability": {"state": "watching", "pressure_score": 2},
            "orb_questions": {"interventions_reduce_dysregulation": "Restorative repair noted before incidents."},
            "summary": "Patterns detected.",
        },
    )
    conn = MagicMock()
    result = predictive_safeguarding_service.analyse(conn, home_id=3, limit=10)

    assert result["ok"] is True
    assert result["forecasts"]
    assert result["operational_attention_scores"]["overall_attention_score"] > 0
    assert "emerging" in result["orb_answers"]["emerging_risks"].lower()


def test_realtime_stream_extracts_signals(monkeypatch) -> None:
    feed = {
        "event_count": 2,
        "events": [
            {"safeguarding": True, "home_id": 5, "risk_tags": ["missing"], "source_table": "missing_episodes"},
            {"safeguarding": False, "home_id": 5},
        ],
        "manager_queue": {"items": [{"category": "workflow"}], "total": 1},
        "home_operational_intelligence": {
            "home_climate": {
                "emotional_climate": {"state": "unsettled"},
                "workforce_pressure": {"state": "high", "queue_items": 3},
                "safeguarding_pressure": {"state": "unstable"},
            }
        },
        "orb_operational_memory": {"conversation_summary": "Summary"},
    }
    monkeypatch.setattr(
        "services.realtime_operational_stream_service.build_operational_feed",
        lambda *args, **kwargs: feed,
    )
    conn = MagicMock()
    snapshot = realtime_operational_stream_service.build_stream_snapshot(
        conn,
        current_user={"id": 1, "home_id": 5},
        home_id=5,
    )

    assert snapshot["ok"] is True
    categories = {signal["category"] for signal in snapshot["stream_signals"]}
    assert "safeguarding" in categories
    assert "care_hub" in categories


def test_realtime_replay_still_home_scoped() -> None:
    realtime_event_bus.reset_for_tests()
    actor = {"id": 7, "role": "manager", "home_id": 10, "provider_id": 99, "permissions": ["realtime:subscribe"]}
    realtime_event_bus.publish(
        event_type="care_hub.update",
        home_id=10,
        actor=actor,
        payload={"refresh": True},
        required_permission="realtime:subscribe",
    )
    replay = realtime_event_bus.replay_for_user(current_user=actor, home_id=10)
    assert replay["ok"] is True
    assert replay["events"][0]["type"] == "care_hub.update"
