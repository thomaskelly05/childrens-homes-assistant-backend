from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
ORB_PAGE = REPO_ROOT / "frontend-next" / "app" / "orb" / "page.tsx"
ORB_COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
ORB_GLOW = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-glow.tsx"
ORB_VOICE_HOOK = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "use-standalone-orb-voice.ts"
STANDALONE_CLIENT = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-client.ts"
ASSISTANT_ORB_PAGE = REPO_ROOT / "frontend-next" / "app" / "assistant" / "orb" / "page.tsx"
ASSISTANT_ORB_IMPL = REPO_ROOT / "frontend-next" / "app" / "assistant" / "orb" / "operational-orb-page.tsx"
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

STANDALONE_UI_MARKERS = [
    "ORB Care Companion",
    "Standalone ORB Care Companion",
    "No OS records",
]

VOICE_MARKERS = [
    "speechSynthesis",
    "webkitSpeechRecognition",
    "en-GB",
    "British female",
]

OS_ORB_LINK_FILES = [
    REPO_ROOT / "frontend-next" / "components" / "indicare" / "app-shell.tsx",
    REPO_ROOT / "frontend-next" / "lib" / "navigation" / "operational-navigation.ts",
    REPO_ROOT / "frontend-next" / "components" / "indicare" / "operational" / "contextual-orb-panel.tsx",
    REPO_ROOT / "frontend-next" / "components" / "indicare" / "operational" / "operational-quick-actions.tsx",
    REPO_ROOT / "frontend-next" / "components" / "command-centre" / "care-hub-routes.ts",
]

RECORD_HUB = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-hub.ts"
RECORD_HUB_COMPONENT = REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "record-hub.tsx"

FORBIDDEN_RECORD_ORB_QUERY_KEYS = [
    "young_person_id=",
    "child_id=",
    "home_id=",
    "staff_id=",
]

OPERATIONAL_ORB_MARKERS = [
    "OrbConversationExperience",
    "Operational cognition",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_orb_page_has_no_operational_coupling():
    sources = _read(ORB_PAGE) + _read(ORB_COMPANION)
    for marker in FORBIDDEN_ORB_PAGE_MARKERS:
        assert marker not in sources, f"/orb must not reference operational marker: {marker}"


def test_orb_page_uses_standalone_contract():
    sources = (
        _read(ORB_PAGE)
        + _read(ORB_COMPANION)
        + _read(STANDALONE_CLIENT)
    )
    for marker in REQUIRED_STANDALONE_MARKERS:
        assert marker in sources, f"/orb standalone surface must reference {marker}"
    for marker in STANDALONE_UI_MARKERS:
        assert marker in sources, f"/orb standalone UI must include {marker}"


def test_standalone_orb_voice_hook_uses_browser_speech_apis():
    text = _read(ORB_VOICE_HOOK)
    assert "speechSynthesis" in text
    assert "webkitSpeechRecognition" in text or "SpeechRecognition" in text
    assert "en-GB" in text
    assert "British female" in text or "pickBritishFemaleVoice" in text


def test_standalone_orb_glow_component_exists():
    text = _read(ORB_GLOW)
    assert "OrbGlow" in text
    assert "safeguarding" in text
    assert "listening" in text


def test_assistant_orb_page_does_not_redirect_to_standalone_orb():
    text = _read(ASSISTANT_ORB_PAGE) + _read(ASSISTANT_ORB_IMPL)
    assert "redirect('/orb')" not in text
    assert 'redirect("/orb")' not in text


def test_assistant_orb_page_keeps_operational_markers():
    text = _read(ASSISTANT_ORB_PAGE) + _read(ASSISTANT_ORB_IMPL)
    for marker in OPERATIONAL_ORB_MARKERS:
        assert marker in text, f"/assistant/orb must keep operational marker: {marker}"
    assert "LiveDataStatus" in text or "getServerOsYoungPeople" in text


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


def _orb_url_builder_sections(text: str) -> str:
    """Extract only standalone /orb URL builders, not workflow or OS links."""
    chunks: list[str] = []
    for marker in ("export function recordOrbPromptHref", "export function recordCardOrbHref"):
        if marker not in text:
            continue
        section = text.split(marker, 1)[1]
        end = section.find("\nexport function ")
        chunks.append(section if end == -1 else section[:end])
    return "\n".join(chunks)


def test_record_orb_prompts_use_standalone_orb_without_operational_ids():
    for path in (RECORD_HUB, RECORD_HUB_COMPONENT):
        text = _read(path)
        combined = _orb_url_builder_sections(text)
        assert "/orb?" in combined or "recordOrbPromptHref" in text, f"{path.name} should define standalone /orb links"
        for key in FORBIDDEN_RECORD_ORB_QUERY_KEYS:
            assert key not in combined, f"{path.name} must not pass {key} into standalone /orb URLs"


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
