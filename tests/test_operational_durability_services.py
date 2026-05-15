from __future__ import annotations

from pathlib import Path

from backend.db.migration_runner import run_pending
from services.audit_replay_service import audit_replay_service
from services.export_worker_service import export_worker_service
from services.group_quality_service import group_quality_service
from services.operational_metrics_service import operational_metrics_service
from services.operational_queue_service import operational_queue_service
from services.realtime_recovery_service import realtime_recovery_service
from services.retry_reconciliation_service import retry_reconciliation_service
from services.upload_processing_service import upload_processing_service


class FakeCursor:
    def __init__(self, conn):
        self.conn = conn

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, sql, params=None):
        self.conn.executed.append((sql, params))
        self.conn.last_sql = sql

    def fetchone(self):
        if "audit_replay_cursors" in self.conn.last_sql:
            return {"last_audit_event_id": 1}
        return None

    def fetchall(self):
        if "schema_migrations" in self.conn.last_sql and "SELECT version" in self.conn.last_sql:
            return []
        if "audit_events" in self.conn.last_sql:
            return [{
                "id": 2,
                "created_at": "2026-05-15T00:00:00Z",
                "event_type": "document.export",
                "actor_user_id": 1,
                "actor_role": "manager",
                "home_id": 10,
                "provider_id": 20,
                "resource_type": "document",
                "resource_id": "doc-1",
                "action": "export",
                "outcome": "success",
                "request_id": "req-1",
                "metadata": {"content": "Jamie details", "profile": "pdf"},
            }]
        return []


class FakeConn:
    closed = False

    def __init__(self):
        self.executed = []
        self.last_sql = ""

    def cursor(self, *_, **__):
        return FakeCursor(self)

    def commit(self):
        pass

    def rollback(self):
        pass


def test_migration_runner_tracks_idempotent_sql(tmp_path: Path):
    migrations = tmp_path / "migrations"
    migrations.mkdir()
    (migrations / "20260515_test.sql").write_text("CREATE TABLE IF NOT EXISTS durable_test (id TEXT PRIMARY KEY);", encoding="utf-8")
    conn = FakeConn()

    results = run_pending(conn, migrations_dir=migrations)

    assert results[0].applied is True
    assert any("schema_migrations" in sql for sql, _ in conn.executed)
    assert any("durable_test" in sql for sql, _ in conn.executed)


def test_operational_queue_health_and_retry_reconciliation_memory():
    item = operational_queue_service.queue_item(operation_type="autosave", payload={"field": "value"}, scope="home:1:child:2", client_token="tok-1")
    updated = operational_queue_service.mark_attempt(item, error="temporary outage")
    result = retry_reconciliation_service.reconcile_result(updated, status_code=200)

    assert item.queue_id == updated.queue_id
    assert updated.status == "retrying"
    assert result["item"]["status"] == "completed"
    assert operational_queue_service.health()["completed"] >= 1


def test_export_upload_metrics_and_recovery_contracts(monkeypatch):
    monkeypatch.setenv("ORB_SESSION_STORE_BACKEND", "memory")
    operational_metrics_service.reset_for_tests()

    export = export_worker_service.plan_export(export_type="child_record", scope="home:1:child:2", requested_by=7, payload={"document_id": "doc-1"}, client_token="exp-1")
    upload = upload_processing_service.signed_upload(file_name="evidence.pdf", content_type="application/pdf", scope="home:1:child:2", requested_by=7, client_token="up-1")
    heartbeat = realtime_recovery_service.heartbeat(session_id="orb-op", socket_id="sock-1", user_id=7, home_id=1, worker_id="worker-a")
    reconnect = realtime_recovery_service.reconnect(session_id="orb-op", attempts=2, last_sequence=4, home_id=1)
    health = operational_metrics_service.health_summary()

    assert export["approval_required"] is True
    assert upload["signed_upload"]["available"] is False
    assert heartbeat["ok"] is True
    assert reconnect["child_scope"]["cross_child_lookup_allowed"] is False
    assert health["queue_health"]["queue.upload.queued"] == 1


def test_audit_replay_redacts_sensitive_metadata():
    replay = audit_replay_service.replay_batch(FakeConn(), replay_name="ops")

    assert replay["events"][0]["metadata"]["content"] == "[redacted]"
    assert replay["events"][0]["metadata"]["profile"] == "pdf"
    assert replay["last_audit_event_id"] == 2


def test_provider_group_quality_is_manager_only_and_home_scoped():
    manager = {"id": 1, "role": "manager", "home_id": 10, "allowed_home_ids": [10], "provider_id": 99}
    homes = [
        {"id": 10, "provider_id": 99, "name": "North Home", "inspection_readiness": "sample_ready", "training_overdue": 2},
        {"id": 11, "provider_id": 99, "name": "Other Home", "inspection_readiness": "not_sampled"},
    ]
    summary = group_quality_service.quality_summary(
        current_user=manager,
        homes=homes,
        qa_samples=[{"home_id": 10, "themes": ["child_voice", "follow_up"], "status": "review_required"}],
    )

    assert summary["home_count"] == 1
    assert summary["sample_count"] == 1
    assert summary["cross_home_qa"]["overdue_reviews"] == 1
