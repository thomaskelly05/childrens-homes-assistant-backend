from __future__ import annotations

from services.realtime_event_bus import realtime_event_bus


def test_realtime_replay_filters_by_cursor_and_home_scope():
    realtime_event_bus.reset_for_tests()
    actor = {"id": 7, "role": "manager", "home_id": 10, "provider_id": 99}

    first = realtime_event_bus.publish(
        event_type="operational_state.lifecycle",
        home_id=10,
        actor=actor,
        payload={"entity_id": "a"},
        required_permission="realtime:subscribe",
    )
    second = realtime_event_bus.publish(
        event_type="audit.timeline",
        home_id=10,
        actor=actor,
        payload={"entity_id": "b"},
        required_permission="realtime:subscribe",
    )

    assert first["published"] is True
    assert second["published"] is True

    replay = realtime_event_bus.replay_for_user(current_user=actor, home_id=10, after_cursor=1)

    assert replay["ok"] is True
    assert [event["type"] for event in replay["events"]] == ["audit.timeline"]
    assert replay["next_cursor"] == 2


def test_realtime_replay_denies_cross_home_reconnect():
    realtime_event_bus.reset_for_tests()
    actor = {"id": 7, "role": "manager", "home_id": 10, "provider_id": 99}

    replay = realtime_event_bus.replay_for_user(current_user=actor, home_id=11)

    assert replay["ok"] is False
    assert replay["reason"] == "home_scope_denied"
