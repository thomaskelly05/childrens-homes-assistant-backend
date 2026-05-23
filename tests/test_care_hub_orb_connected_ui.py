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
