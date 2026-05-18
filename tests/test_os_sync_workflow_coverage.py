from __future__ import annotations

from services.os_sync_dispatcher import TABLE_ALIASES
from services.os_sync_hooks import SUPPORTED_SYNC_TABLES, sync_after_save


def test_os_sync_hook_supports_gold_standard_child_workflow_tables():
    assert {
        "missing_episodes",
        "safeguarding_records",
        "handover_records",
        "documents",
        "statutory_documents",
        "medication_records",
    } <= SUPPORTED_SYNC_TABLES


def test_dispatcher_aliases_new_child_workflows_to_existing_os_paths():
    assert TABLE_ALIASES["missing_episodes"] == "incidents"
    assert TABLE_ALIASES["safeguarding_records"] == "incidents"
    assert TABLE_ALIASES["handover_records"] == "support_plans"
    assert TABLE_ALIASES["documents"] == "support_plans"
    assert TABLE_ALIASES["statutory_documents"] == "support_plans"
    assert TABLE_ALIASES["medication_records"] == "health_records"


def test_sync_after_save_accepts_positional_legacy_call_style_for_supported_tables(monkeypatch):
    calls = []

    def fake_sync(*, source_table, record, recorded_by_name=None):
        calls.append({"source_table": source_table, "record": record, "recorded_by_name": recorded_by_name})
        return True

    monkeypatch.setattr("services.os_sync_hooks.os_sync_dispatcher.sync", fake_sync)

    assert sync_after_save("missing_episodes", {"id": 1, "young_person_id": 1001}) is True
    assert calls == [
        {
            "source_table": "missing_episodes",
            "record": {"id": 1, "young_person_id": 1001},
            "recorded_by_name": None,
        }
    ]
