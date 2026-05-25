from __future__ import annotations

import re
from pathlib import Path

import pytest

from schemas.recording_drafts import RecordingDraftCreate
from services.isn_digest_service import isn_digest_service
from services.os_notification_adapter_service import os_notification_adapter_service
from services.recording_alert_service import recording_alert_service
from services.recording_draft_service import recording_draft_service

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


@pytest.fixture(autouse=True)
def memory_alerts(monkeypatch):
    recording_alert_service._memory = {}
    recording_draft_service._memory = {}
    isn_digest_service._memory_alerts = {}
    monkeypatch.setattr(recording_alert_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_adapter_feed_metadata_only(fake_state):
    user = fake_state["user"]
    secret = "RAW BELL BODY MUST NOT APPEAR"
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Bell test",
            body=secret,
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
        ),
        user,
    )
    recording_alert_service.generate_alerts(user, conn=None)
    feed = os_notification_adapter_service.build_feed(user, conn=None)
    dumped = feed.model_dump_json()
    assert secret not in dumped
    assert feed.recording_alert_count >= 1
    for item in feed.items:
        assert item.safe_summary
        assert "draft_id=" not in item.route
        assert "body=" not in item.route.lower()
        assert item.metadata.get("no_raw_body") is True


def test_daily_brief_item_in_feed(fake_state):
    user = fake_state["user"]
    feed = os_notification_adapter_service.build_feed(user, conn=None)
    types = {item.type for item in feed.items}
    assert "manager_daily_brief_reminder" in types


def test_isn_item_in_feed(fake_state):
    user = fake_state["user"]
    isn_digest_service.seed_memory_alert(risk_level="critical", status="new")
    feed = os_notification_adapter_service.build_feed(user, conn=None)
    isn_items = [i for i in feed.items if i.source == "isn"]
    assert isn_items
    assert any(i.category == "safeguarding_network" for i in isn_items)


def test_notification_bell_ui_markers():
    bell = _read(FRONTEND / "components" / "connect" / "notification-bell.tsx")
    shell = _read(FRONTEND / "components" / "indicare" / "app-shell.tsx")
    assert "data-testid=\"notification-bell\"" in bell
    assert "notification-bell-recording-alerts-link" in bell
    assert "notification-bell-daily-brief-link" in bell
    assert "NotificationBell" in shell
    assert "/command-centre/briefing" in bell
    assert "/record/alerts" in bell
    assert "notification-bell-isn-safeguarding-link" in bell
    assert "Safeguarding network" in bell
    assert "getOperationalNotificationFeed" in bell
    assert "applyOperationalNotificationAction" in bell
    assert "notification-bell-mark-all-read" in bell
    assert "notification-bell-acknowledge" in bell
    assert "notification-bell-resolve" in bell
    assert "categoryLabel" in bell
    assert "draft_id=" not in bell
    orb_hrefs = re.findall(r'["\']([^"\']*/orb[^"\']*)["\']', bell)
    for href in orb_hrefs:
        assert href.startswith("/assistant/orb") or href == "/orb"


def test_operational_feed_route_registered():
    from routers import os_notification_routes

    assert os_notification_routes.router.routes
