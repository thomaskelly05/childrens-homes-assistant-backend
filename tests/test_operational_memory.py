from __future__ import annotations

from services.operational_lifecycle_service import operational_lifecycle_service
from services.operational_memory_repository import OperationalMemoryEvent, operational_memory_repository


class FakeCursor:
    def __init__(self, conn):
        self.conn = conn

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, sql, params=None):
        self.conn.executed.append((sql, params))

    def fetchone(self):
        self.conn.next_id += 1
        return {"id": self.conn.next_id}


class FakeConn:
    def __init__(self):
        self.executed = []
        self.next_id = 0

    def cursor(self, *_, **__):
        return FakeCursor(self)


def test_operational_memory_event_serialises_required_scope_fields():
    event = OperationalMemoryEvent(
        provider_id=99,
        home_id=10,
        entity_type="safeguarding",
        entity_id="sg-1",
        actor_id=7,
        correlation_id="corr-1",
        previous_state={"status": "open"},
        next_state={"status": "resolved"},
        transition_type="resolve",
    )

    record = event.to_record()

    assert record["provider_id"] == 99
    assert record["home_id"] == 10
    assert record["entity_type"] == "safeguarding"
    assert record["schema_version"]
    assert record["previous_state"]["status"] == "open"


def test_operational_memory_appends_lifecycle_transition_to_history_tables():
    conn = FakeConn()
    user = {"id": 7, "role": "manager", "home_id": 10, "provider_id": 99}
    lifecycle = operational_lifecycle_service.build_transition_context(
        entity_type="safeguarding",
        entity_id="sg-1",
        transition="resolve",
        status="resolved",
        payload={"evidence_ids": ["ev-1"], "chronology_ids": ["chr-1"], "signoff_id": "sig-1"},
        current_user=user,
    )

    inserted = operational_memory_repository.append_lifecycle_transition(
        conn,
        current_user=user,
        entity_type="safeguarding",
        entity_id="sg-1",
        previous_state={"status": "open", "home_id": 10, "provider_id": 99},
        next_state={"status": "resolved", "home_id": 10, "provider_id": 99},
        transition_type="resolve",
        lifecycle_context=lifecycle,
        correlation_id="corr-1",
    )

    sql_text = "\n".join(sql for sql, _ in conn.executed)
    assert "operational_lifecycle_history" in sql_text
    assert "operational_event_log" in sql_text
    assert "operational_audit_timeline" in sql_text
    assert "evidence_relationship_history" in sql_text
    assert inserted["operational_lifecycle_history_id"] == "1"
