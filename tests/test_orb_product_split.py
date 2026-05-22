from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
ORB_PAGE = REPO_ROOT / "frontend-next" / "app" / "orb" / "page.tsx"
ORB_COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
ASSISTANT_ORB_PAGE = REPO_ROOT / "frontend-next" / "app" / "assistant" / "orb" / "page.tsx"
ASSISTANT_PAGE = REPO_ROOT / "frontend-next" / "app" / "assistant" / "page.tsx"
STANDALONE_ROUTES = REPO_ROOT / "routers" / "orb_standalone_routes.py"
PRODUCT_MAP = REPO_ROOT / "routers" / "assistant_product_map_routes.py"

FORBIDDEN_ORB_PAGE_MARKERS = [
    "getServerOsYoungPeople",
    "OrbConversationExperience",
    "LiveDataStatus",
    "/api/orb/conversation",
    "/orb/conversation",
    "Canonical ORB Runtime",
    "One operational cognition system",
    "Operational cognition",
]

REQUIRED_STANDALONE_MARKERS = [
    "/orb/standalone/conversation",
    "/orb/standalone/config",
]

OS_ORB_LINK_FILES = [
    REPO_ROOT / "frontend-next" / "components" / "indicare" / "app-shell.tsx",
    REPO_ROOT / "frontend-next" / "lib" / "navigation" / "operational-navigation.ts",
    REPO_ROOT / "frontend-next" / "components" / "indicare" / "operational" / "contextual-orb-panel.tsx",
    REPO_ROOT / "frontend-next" / "components" / "indicare" / "operational" / "operational-quick-actions.tsx",
    REPO_ROOT / "frontend-next" / "components" / "command-centre" / "care-hub-routes.ts",
]

RECORD_HUB = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-hub.ts"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_orb_page_has_no_operational_coupling():
    sources = _read(ORB_PAGE) + _read(ORB_COMPANION)
    for marker in FORBIDDEN_ORB_PAGE_MARKERS:
        assert marker not in sources, f"/orb must not reference operational marker: {marker}"


def test_orb_page_uses_standalone_contract():
    sources = _read(ORB_PAGE) + _read(ORB_COMPANION)
    assert "ORB Care Companion" in sources or "Care Companion" in sources
    for marker in REQUIRED_STANDALONE_MARKERS:
        assert marker in sources, f"/orb standalone surface must reference {marker}"


def test_assistant_orb_page_does_not_redirect_to_standalone_orb():
    text = _read(ASSISTANT_ORB_PAGE) + _read(REPO_ROOT / "frontend-next" / "app" / "assistant" / "orb" / "operational-orb-page.tsx")
    assert "redirect('/orb')" not in text
    assert 'redirect("/orb")' not in text


def test_assistant_page_does_not_redirect_to_orb():
    text = _read(ASSISTANT_PAGE)
    assert "redirect('/orb')" not in text
    assert 'redirect("/orb")' not in text


def test_os_navigation_orb_links_target_assistant_orb():
    for path in OS_ORB_LINK_FILES:
        text = _read(path)
        for href in re.findall(r'href=["\']([^"\']+)["\']', text):
            if "/orb" not in href:
                continue
            assert href.startswith("/assistant/orb"), (
                f"{path.name} must use /assistant/orb for OS ORB links, found {href}"
            )


def test_record_orb_prompts_use_standalone_orb_without_young_person_id():
    text = _read(RECORD_HUB)
    assert "context=recording" in text
    assert "young_person_id" not in text.split("recordOrbPromptHref")[1].split("export function")[0]


def test_orb_standalone_backend_contract_flags():
    text = _read(STANDALONE_ROUTES)
    for flag in ("os_linked", "care_record_access", "chronology_access", "dashboard_access", "direct_writes"):
        assert f'"{flag}": False' in text or f'"{flag}": false' in text


def test_assistants_map_differentiates_products():
    text = _read(PRODUCT_MAP)
    assert '"/orb"' in text
    assert '"/assistant"' in text
    assert '"/assistant/orb"' in text
    assert "ORB Care Companion" in text
    assert "IndiCare OS ORB" in text
    assert "operational_os_orb" in text
