from __future__ import annotations

from unittest.mock import MagicMock

from services.os_chronology_service import (
    PRIORITY_CHRONOLOGY_SOURCES,
    SUPPLEMENTAL_CHRONOLOGY_SOURCES,
    list_chronology_for_connection,
)


def _priority_item(event_id: str = "os_chronology:1", source_id: str = "1") -> dict:
    return {
        "id": event_id,
        "source_type": "os_chronology",
        "source_id": source_id,
        "source_table": "os_chronology_events",
        "canonical_source_key": f"os_chronology_events:{source_id}",
        "date_time": "2026-05-20T10:00:00",
        "title": "Event",
        "summary": "Summary",
        "full_text": "Summary",
        "young_person_ids": ["1"],
        "staff_ids": [],
        "home_id": "1",
        "category": "OS chronology",
        "severity": "medium",
        "tags": ["os_chronology"],
        "safeguarding_flags": [],
        "risk_flags": [],
        "regulation_links": [],
        "sccif_links": [],
        "quality_standard_links": [],
        "evidence_ids": [],
        "action_ids": [],
        "document_ids": [],
        "report_ids": [],
        "created_by": None,
        "citation_label": "OS chronology #1",
        "source_url": "/chronology/os_chronology:1",
        "metadata": {},
    }


def test_chronology_skips_supplemental_when_priority_satisfies_page(monkeypatch) -> None:
    conn = MagicMock()
    calls: list[str] = []

    def fake_query(_conn, source, **kwargs):
        calls.append(source["table"])
        if source in PRIORITY_CHRONOLOGY_SOURCES:
            limit = kwargs["source_limit"]
            return [
                _priority_item(f"{source['table']}:{index}", source_id=str(index))
                for index in range(limit)
            ]
        return []

    monkeypatch.setattr("services.os_chronology_service._query_source", fake_query)

    result = list_chronology_for_connection(
        conn,
        current_user={"role": "admin", "id": 1},
        page=1,
        page_size=25,
    )

    assert result["total"] >= 25
    assert result["timing"]["supplemental_skipped"] is True
    assert all(table in {s["table"] for s in PRIORITY_CHRONOLOGY_SOURCES} for table in calls)
    assert not any(table in {s["table"] for s in SUPPLEMENTAL_CHRONOLOGY_SOURCES} for table in calls)


def test_chronology_includes_timing_metrics(monkeypatch) -> None:
    conn = MagicMock()
    monkeypatch.setattr("services.os_chronology_service._query_source", lambda *_a, **_k: [_priority_item()])

    result = list_chronology_for_connection(
        conn,
        current_user={"role": "admin", "id": 1},
        page=1,
        page_size=10,
    )

    timing = result["timing"]
    assert "query_ms" in timing
    assert "total_ms" in timing
    assert timing["source_limit"] <= 120
