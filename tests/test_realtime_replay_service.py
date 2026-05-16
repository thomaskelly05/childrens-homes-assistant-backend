from __future__ import annotations

from services.realtime_replay_service import realtime_replay_service


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
        return [
            {
                "id": 1,
                "source_table": "operational_event_log",
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
                "governance_references": [],
                "replay_references": {},
                "metadata": {},
            }
        ]


class FakeConn:
    def __init__(self):
        self.executed = []

    def cursor(self, *_, **__):
        return FakeCursor(self)


def test_realtime_replay_uses_durable_operational_event_log_shape():
    user = {"id": 7, "role": "manager", "provider_id": 99, "home_id": 10, "allowed_home_ids": [10]}

    replay = realtime_replay_service.replay(
        FakeConn(),
        current_user=user,
        home_id=10,
        after_cursor=0,
    )

    assert replay["source"] == "operational_event_log"
    assert replay["events"][0]["cursor"] == 1
    assert replay["events"][0]["payload"]["chronology_references"] == ["chr-1"]
    assert replay["checkpoint"]["cursor"] == 1
