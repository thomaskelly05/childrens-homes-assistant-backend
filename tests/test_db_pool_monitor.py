from __future__ import annotations

from services import db_pool_monitor


def test_db_pool_snapshot_reports_saturation(monkeypatch):
    monkeypatch.setattr(
        db_pool_monitor,
        "pool_status",
        lambda: {"min": 1, "max": 10, "used": 9, "available": 1, "waiting": 0, "acquisition_failures": 3},
    )

    snapshot = db_pool_monitor.db_pool_snapshot()

    assert snapshot["saturation_pct"] == 90.0
    assert snapshot["saturated"] is True
    assert snapshot["degraded"] is True
    assert snapshot["acquisition_failures"] == 3
