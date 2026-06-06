from __future__ import annotations

from psycopg2.extras import Json

from services.ai_usage_audit_service import AIUsageAuditService


def test_usage_audit_serializes_nested_dict_metadata():
    captured: dict = {}

    class FakeCursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return None

        def execute(self, _query, params):
            captured["params"] = params

    class FakeConn:
        closed = False

        def cursor(self):
            return FakeCursor()

        def commit(self):
            return None

        def rollback(self):
            return None

    import services.ai_usage_audit_service as mod

    original_get = mod.get_db_connection
    original_release = mod.release_db_connection
    mod.get_db_connection = lambda: FakeConn()
    mod.release_db_connection = lambda _c: None
    try:
        AIUsageAuditService().record(
            {
                "feature": "orb_chat",
                "metadata": {
                    "workflow": "ask_orb",
                    "nested": {"provider": "openai", "latency_ms": 42},
                },
            }
        )
    finally:
        mod.get_db_connection = original_get
        mod.release_db_connection = original_release

    metadata_param = captured["params"][-1]
    assert isinstance(metadata_param, Json)
    adapted = metadata_param.adapted
    assert adapted["workflow"] == "ask_orb"
    assert adapted["nested"]["provider"] == "openai"
