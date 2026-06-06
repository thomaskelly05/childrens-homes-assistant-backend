from __future__ import annotations

from services.ai_usage_audit_service import _safe_metadata


def test_usage_audit_strips_prompt_and_transcript_metadata():
    metadata = {
        "workflow": "orb_chat",
        "prompt": "child named Jamie said...",
        "transcript": "full session transcript",
        "raw_prompt": "secret",
        "document_text": "care plan body",
        "brain": "internal_route_name",
        "route": "/internal/brain",
        "latency_ms": 120,
    }
    safe = _safe_metadata(metadata)
    assert "prompt" not in safe
    assert "transcript" not in safe
    assert "document_text" not in safe
    assert "brain" not in safe
    assert "route" not in safe
    assert safe.get("latency_ms") == 120
    assert safe.get("workflow") == "orb_chat"


def test_usage_audit_record_defaults_prompt_storage_false():
    from services.ai_usage_audit_service import AIUsageAuditService

    captured: dict = {}

    class FakeCursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return None

        def execute(self, query, params):
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
                "provider_id": 1,
                "home_id": 1,
                "user_id": 2,
                "feature": "orb_dictate",
                "model": "gpt-4.1-mini",
                "redaction_mode": "strict",
                "redaction_applied": True,
                "metadata": {"prompt": "should not persist"},
            }
        )
    finally:
        mod.get_db_connection = original_get
        mod.release_db_connection = original_release

    assert captured["params"][10] is False
    assert captured["params"][11] is False
    assert "prompt" not in (captured["params"][12] or {})


def test_provider_ai_settings_external_ai_disabled_by_default(monkeypatch):
    from services.provider_data_intelligence_settings_service import (
        provider_data_intelligence_settings_service,
    )

    monkeypatch.setattr(
        provider_data_intelligence_settings_service,
        "_fetch_settings_rows",
        lambda *_a, **_k: (None, None),
    )
    effective = provider_data_intelligence_settings_service.get_effective_settings(provider_id=1)
    assert effective.external_ai_enabled is False
    assert effective.prompt_storage is False
    assert effective.transcript_storage is False
