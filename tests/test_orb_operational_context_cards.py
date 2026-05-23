from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from schemas.orb_operational import OrbOperationalContextSummary, OrbOperationalRequest
from services.orb_operational_context_service import orb_operational_context_bridge


def test_manager_daily_brief_card():
    context = {
        "summary": OrbOperationalContextSummary(
            headline="Three items need attention",
            attention_items=["Review plan"],
            degraded=False,
            unavailable=False,
        ),
        "sources": [{"label": "Manager daily brief", "source_type": "registered_manager_daily_brief", "basis": "Brief"}],
        "raw_available": True,
    }
    request = OrbOperationalRequest(message="What needs my attention?", mode="manager_daily_brief")
    cards = orb_operational_context_bridge.build_context_cards(context, request)
    types = [c["type"] for c in cards]
    assert "manager_daily_brief" in types


def test_context_health_card_when_degraded():
    context = {
        "summary": OrbOperationalContextSummary(
            unavailable=False,
            degraded=True,
            permission_warnings=["Database load"],
        ),
        "sources": [],
    }
    request = OrbOperationalRequest(message="Summary", mode="operational_summary")
    cards = orb_operational_context_bridge.build_context_cards(context, request)
    assert any(c["type"] == "context_health" for c in cards)


def test_context_health_card_when_unavailable():
    context = {
        "summary": OrbOperationalContextSummary(unavailable=True, degraded=True),
        "sources": [],
    }
    request = OrbOperationalRequest(message="Summary", mode="operational_summary")
    cards = orb_operational_context_bridge.build_context_cards(context, request)
    assert any(c["type"] == "context_health" for c in cards)
    status = orb_operational_context_bridge.build_context_status(context, request)
    assert status["unavailable"] is True


def test_safeguarding_and_record_quality_cards():
    context = {
        "summary": OrbOperationalContextSummary(
            safeguarding_signals=["Repeated incidents"],
            record_quality_notes=["Weak recording on note 2"],
            attention_items=["Action 1"],
            ofsted_evidence_notes=["Leadership: moderate evidence"],
        ),
        "sources": [],
    }
    request = OrbOperationalRequest(message="Themes", mode="safeguarding_themes")
    cards = orb_operational_context_bridge.build_context_cards(context, request)
    types = {c["type"] for c in cards}
    assert "safeguarding_theme" in types
    assert "record_quality" in types
    assert "action_attention" in types
    assert "ofsted_evidence" in types


def test_evidence_items_no_raw_bodies():
    context = {
        "sources": [
            {
                "label": "Chronology",
                "source_type": "chronology",
                "basis": "Summary label only"[:240],
                "route": "/chronology",
            }
        ],
    }
    request = OrbOperationalRequest(message="Evidence", mode="operational_summary")
    items = orb_operational_context_bridge.build_evidence_items(context, request)
    assert items
    for item in items:
        assert "body" not in (item.get("basis") or "").lower() or len(item.get("basis") or "") <= 240


def test_audit_summary_includes_role():
    context = {"raw_available": True, "summary": {}}
    request = OrbOperationalRequest(message="Audit", scope="home")
    audit = orb_operational_context_bridge.build_audit_summary(
        context,
        request,
        audit_reference="orb-abc",
        current_user={"role": "manager"},
    )
    assert audit["audit_reference"] == "orb-abc"
    assert audit["role"] == "manager"
