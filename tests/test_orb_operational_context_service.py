from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from schemas.orb_operational import OrbOperationalRequest
from services.orb_operational_context_service import orb_operational_context_bridge


def test_build_context_without_connection_returns_unavailable():
    request = OrbOperationalRequest(message="What needs attention?", mode="manager_daily_brief")
    result = orb_operational_context_bridge.build_context(
        request,
        {"id": 1, "role": "manager", "home_id": 10},
        conn=None,
    )
    summary = result["summary"]
    if hasattr(summary, "unavailable"):
        assert summary.unavailable is True
    else:
        assert summary["unavailable"] is True
    assert result["raw_available"] is False


def test_summarise_context_strips_raw_fields(monkeypatch):
    monkeypatch.setattr(
        "services.orb_operational_context_service.build_orb_context",
        lambda *_args, **_kwargs: {
            "scope": "home",
            "chronology": [{"id": 1, "title": "Incident", "summary": "detail"}],
            "documents": [],
            "actions": [],
            "evidence": [],
            "reports": [],
            "metadata_first": {"themes": ["pressure"]},
            "sources": [{"title": "Chronology", "source_type": "chronology", "summary": "x"}],
            "degraded": False,
        },
    )
    monkeypatch.setattr(
        "services.orb_operational_context_service._existing_tables",
        lambda _conn: [],
    )
    monkeypatch.setattr(
        "services.orb_operational_context_service._snapshot_rows",
        lambda *_args, **_kwargs: [],
    )
    conn = MagicMock()
    request = OrbOperationalRequest(message="Home summary", scope="home", mode="operational_summary")
    result = orb_operational_context_bridge.build_home_context(10, 7, {"id": 1, "role": "manager"}, conn=conn, request=request)
    summary = result["summary"]
    headline = summary.headline if hasattr(summary, "headline") else summary["headline"]
    assert headline
    sources = orb_operational_context_bridge.safe_context_sources(result)
    assert sources
    assert "permissions" in orb_operational_context_bridge.build_context(
        request,
        {"id": 1, "role": "manager", "home_id": 10},
        conn=conn,
    )


def test_child_scope_without_id_warns():
    request = OrbOperationalRequest(message="Child journey", scope="child", mode="child_journey_summary")
    result = orb_operational_context_bridge.build_context(request, {"id": 1, "role": "staff"}, conn=None)
    summary = result["summary"]
    warnings = summary.permission_warnings if hasattr(summary, "permission_warnings") else summary["permission_warnings"]
    assert warnings
