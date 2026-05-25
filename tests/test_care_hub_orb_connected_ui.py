from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

CARE_HUB_FILES = [
    FRONTEND / "app" / "command-centre" / "page.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-start-hero.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-routes.ts",
    FRONTEND / "components" / "command-centre" / "care-hub-attention-strip.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-recording-section.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-recording-digest.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-manager-daily-brief.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-notification-oversight.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-isn-digest.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-handover.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-workforce-context.tsx",
    FRONTEND / "components" / "command-centre" / "intelligence-actions-card.tsx",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_care_hub_hero_subtitle_and_orb_hints():
    hero = _read(FRONTEND / "components" / "command-centre" / "care-hub-start-hero.tsx")
    routes = _read(FRONTEND / "components" / "command-centre" / "care-hub-routes.ts")
    assert "ORB is here to guide the shift" in hero
    assert "CARE_HUB_HERO_ORB_HINTS" in routes
    assert "ORB can help with wording" in routes
    assert "ORB can summarise handover" in routes
    assert "Safeguarding concern" in routes
    assert "safeguarding-concern" in routes or "safeguarding/new" in routes
    recording = _read(FRONTEND / "components" / "command-centre" / "care-hub-recording-section.tsx")
    assert "All recording forms" in recording
    assert 'data-testid="care-hub-all-recording-forms"' in recording


def test_care_hub_attention_strip_cards():
    text = _read(FRONTEND / "components" / "command-centre" / "care-hub-attention-strip.tsx")
    routes = _read(FRONTEND / "components" / "command-centre" / "care-hub-routes.ts")
    assert 'data-testid="care-hub-attention-strip"' in text
    assert "What needs attention?" in text
    for label in (
        "Manager review",
        "Safeguarding signals",
        "Record quality",
        "Actions outstanding",
        "Missing episodes",
        "Incidents",
    ):
        assert label in routes


def test_care_hub_operational_orb_links_only():
    combined = "\n".join(_read(path) for path in CARE_HUB_FILES)
    for href in re.findall(r'href=["\']([^"\']+)["\']', combined):
        if "/orb" not in href:
            continue
        assert href.startswith("/assistant/orb"), f"Care Hub must use operational ORB, found {href}"


def test_care_hub_ask_orb_action_targets_assistant():
    routes = _read(FRONTEND / "components" / "command-centre" / "care-hub-routes.ts")
    assert "/assistant/orb?context=care-hub" in routes


def test_care_hub_isn_digest_marker():
    page = _read(FRONTEND / "app" / "command-centre" / "page.tsx")
    digest = _read(FRONTEND / "components" / "command-centre" / "care-hub-isn-digest.tsx")
    assert "CareHubIsnDigest" in page
    assert "care-hub-isn-digest" in digest
    assert "Safeguarding network" in digest
    assert "care-hub-ask-orb-isn" in digest
    assert "/safeguarding" in digest
    assert "isnOrbHref" in digest
    isn_client = _read(FRONTEND / "lib" / "os-api" / "isn-notifications.ts")
    assert "/assistant/orb" in isn_client


def test_care_hub_shift_handover_card():
    page = _read(FRONTEND / "app" / "command-centre" / "page.tsx")
    card = _read(FRONTEND / "components" / "command-centre" / "care-hub-handover.tsx")
    assert "CareHubHandover" in page
    assert "care-hub-shift-handover" in card
    assert "Shift handover" in card
    assert "Prepare handover" in card
    assert "Open current handover" in card
    assert "Ask OS ORB" in card
    assert "/handover" in card
    assert "Handover reviews" in card or "care-hub-handover-reviews" in card


def test_care_hub_inspection_readiness_card():
    page = _read(FRONTEND / "app" / "command-centre" / "page.tsx")
    card = _read(FRONTEND / "components" / "command-centre" / "care-hub-inspection-readiness.tsx")
    assert "CareHubInspectionReadiness" in page
    assert "care-hub-inspection-readiness" in card
    assert "Inspection readiness" in card
    assert "/intelligence/sccif" in card
    assert "Ask OS ORB" in card
    assert "care-hub-open-sccif-alignment" in card


def test_care_hub_manager_daily_brief_marker():
    page = _read(FRONTEND / "app" / "command-centre" / "page.tsx")
    assert "CareHubManagerDailyBrief" in page
    assert "/command-centre/briefing" in _read(
        FRONTEND / "components" / "command-centre" / "care-hub-manager-daily-brief.tsx"
    )


def test_care_hub_recording_oversight_digest():
    page = _read(FRONTEND / "app" / "command-centre" / "page.tsx")
    digest = _read(FRONTEND / "components" / "command-centre" / "care-hub-recording-digest.tsx")
    manager = _read(FRONTEND / "components" / "indicare" / "record" / "recording-manager-digest.tsx")
    assert "CareHubRecordingDigest" in page
    assert "care-hub-recording-digest" in digest
    assert "Recording oversight" in manager
    assert "Run checks now" in manager
    assert "/record/alerts" in manager
    assert "operationalOrbAlertHref" in manager
    assert "Ask OS ORB" in manager
