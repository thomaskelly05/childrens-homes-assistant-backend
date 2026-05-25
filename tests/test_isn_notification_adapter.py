from __future__ import annotations

import re
from pathlib import Path

import pytest

from services.isn_digest_service import isn_digest_service
from services.isn_notification_adapter_service import isn_notification_adapter_service
from services.os_notification_adapter_service import os_notification_adapter_service

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


@pytest.fixture(autouse=True)
def reset_isn_memory():
    isn_digest_service._memory_alerts = {}
    yield
    isn_digest_service._memory_alerts = {}


def test_isn_adapter_metadata_only(fake_state):
    user = fake_state["user"]
    secret = "RAW ISN SAFEGUARDING NARRATIVE MUST NOT APPEAR"
    isn_digest_service.seed_memory_alert(
        alert_type="recurring_alias_pattern",
        risk_level="critical",
        status="new",
        title=secret,
    )
    items = isn_notification_adapter_service.build_os_items(user, conn=None)
    assert items
    dumped = "".join(i.model_dump_json() for i in items)
    assert secret not in dumped
    for item in items:
        assert item.safe_summary
        assert item.metadata.get("no_raw_body") is True
        assert item.metadata.get("metadata_only") is True
        assert item.source == "isn"
        assert item.category == "Safeguarding network"
        assert "isn_id=" not in item.route.lower()
        assert "child_id=" not in item.route.lower()
        assert not item.route.startswith("/orb")


def test_urgent_isn_maps_to_notification_feed(fake_state):
    user = fake_state["user"]
    isn_digest_service.seed_memory_alert(risk_level="critical", status="new")
    feed = os_notification_adapter_service.build_feed(user, conn=None)
    isn_items = [i for i in feed.items if i.source == "isn"]
    assert isn_items
    assert any(i.severity in ("urgent", "high") for i in isn_items)
    assert feed.isn_count >= 1


def test_routes_are_os_only(fake_state):
    user = fake_state["user"]
    isn_digest_service.seed_memory_alert()
    for item in isn_notification_adapter_service.build_os_items(user, conn=None):
        assert item.route.startswith("/")
        assert not item.route.startswith("/orb")
        orb_refs = re.findall(r"/orb[^/\s\"']*", item.route)
        for ref in orb_refs:
            assert ref.startswith("/assistant/orb")


def test_notification_bell_isn_markers():
    bell = (FRONTEND / "components" / "connect" / "notification-bell.tsx").read_text(encoding="utf-8")
    assert "notification-bell-isn-safeguarding-link" in bell
    assert "Safeguarding network" in bell
    assert "/safeguarding" in bell
    orb_hrefs = re.findall(r'["\']([^"\']*/orb[^"\']*)["\']', bell)
    for href in orb_hrefs:
        assert href.startswith("/assistant/orb") or href == "/orb"
