from __future__ import annotations

from services.operational_memory_replay_service import operational_memory_replay_service


class FakeCursor:
    def __init__(self, conn):
        self.conn = conn
        self.last_sql = ""

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, sql, params=None):
        self.last_sql = sql
        self.conn.executed.append((sql, params))

    def fetchone(self):
        if "to_regclass" in self.last_sql:
            return {"exists": True}
        return None

    def fetchall(self):
        if "operational_memory" not in self.last_sql:
            return []
        return [
            {
                "id": 2,
                "source_table": "operational_event_log",
                "provider_id": 99,
                "home_id": 10,
                "entity_type": "safeguarding",
                "entity_id": "sg-1",
                "actor_id": 7,
                "correlation_id": "corr-1",
                "schema_version": "2026-05-16.v1",
                "created_at": "2026-05-16T10:01:00+00:00",
                "event_type": "lifecycle.transition",
                "transition_type": "resolve",
                "previous_state": {"status": "open"},
                "next_state": {"status": "resolved"},
                "evidence_references": ["ev-1"],
                "chronology_references": ["chr-1"],
                "governance_references": ["gov-1"],
                "replay_references": {},
                "metadata": {},
            },
            {
                "id": 1,
                "source_table": "operational_lifecycle_history",
                "provider_id": 99,
                "home_id": 10,
                "entity_type": "safeguarding",
                "entity_id": "sg-1",
                "actor_id": 7,
                "correlation_id": "corr-1",
                "schema_version": "2026-05-16.v1",
                "created_at": "2026-05-16T10:00:00+00:00",
                "event_type": "lifecycle.transition",
                "transition_type": "resolve",
                "previous_state": {"status": "open"},
                "next_state": {"status": "resolved"},
                "evidence_references": ["ev-1"],
                "chronology_references": ["chr-1"],
                "governance_references": ["gov-1"],
                "replay_references": {},
                "metadata": {},
            },
        ]


class FakeConn:
    def __init__(self):
        self.executed = []

    def cursor(self, *_, **__):
        return FakeCursor(self)


def test_operational_memory_replay_orders_and_exports_append_only_events():
    user = {"id": 7, "role": "provider_admin", "provider_id": 99, "home_id": 10, "allowed_home_ids": [10]}

    replay = operational_memory_replay_service.replay(
        FakeConn(),
        current_user=user,
        provider_id=99,
        home_id=10,
        tables=("operational_lifecycle_history", "operational_event_log"),
        export=True,
    )

    assert replay.ok is True
    assert [event.replay_key for event in replay.events] == [
        "operational_lifecycle_history:1",
        "operational_event_log:2",
    ]
    assert replay.next_cursor == 2
    assert replay.export and replay.export["event_count"] == 2
    assert replay.integrity.ordering_valid is True
