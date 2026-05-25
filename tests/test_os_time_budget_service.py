from __future__ import annotations

import time

from services.os_time_budget_service import OsTimeBudgetService, TimeBudgetReport


def test_slow_section_returns_fallback():
    service = OsTimeBudgetService()
    report = TimeBudgetReport()

    result = service.run_section(
        "slow",
        50,
        lambda: (time.sleep(0.2) or {"ok": True}),
        fallback={"ok": False},
        report=report,
    )

    assert result.timed_out is True
    assert result.value == {"ok": False}
    assert report.timeout_count == 1
    assert report.warnings


def test_fast_section_does_not_block_others():
    service = OsTimeBudgetService()
    report = TimeBudgetReport()
    outputs = service.run_sections_parallel(
        [
            ("a", 200, lambda: {"a": 1}, {}),
            ("b", 200, lambda: {"b": 2}, {}),
        ],
        report=report,
    )
    assert outputs["a"]["a"] == 1
    assert outputs["b"]["b"] == 2
    assert report.timeout_count == 0
