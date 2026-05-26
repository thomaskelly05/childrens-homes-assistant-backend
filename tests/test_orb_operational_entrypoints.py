from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

OPERATIONAL_ENTRY_FILES = [
    FRONTEND / "components" / "indicare" / "app-shell.tsx",
    FRONTEND / "lib" / "navigation" / "operational-navigation.ts",
    FRONTEND / "components" / "indicare" / "operational" / "contextual-orb-panel.tsx",
    FRONTEND / "components" / "indicare" / "operational" / "orb-companion-panel.tsx",
    FRONTEND / "components" / "indicare" / "operational" / "operational-quick-actions.tsx",
    FRONTEND / "components" / "indicare" / "command-search.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-routes.ts",
    FRONTEND / "lib" / "child-journey" / "child-journey-routes.ts",
    FRONTEND / "components" / "child-journey" / "child-journey-orb-rail.tsx",
]

RECORD_HUB = FRONTEND / "lib" / "record" / "recording-hub.ts"
STANDALONE_CLIENT = FRONTEND / "lib" / "orb" / "standalone-client.ts"

FORBIDDEN_STANDALONE_OS_API = ["/api/os", "fetchOs", "getCareHub"]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _orb_hrefs(text: str) -> list[str]:
    return [href for href in re.findall(r'href=["\']([^"\']+)["\']', text) if "/orb" in href]


def test_operational_surfaces_link_assistant_orb():
    for path in OPERATIONAL_ENTRY_FILES:
        text = _read(path)
        for href in _orb_hrefs(text):
            assert href.startswith("/assistant/orb"), (
                f"{path.name} must route OS ORB links to /assistant/orb, found {href}"
            )


def test_operational_navigation_orb_domain():
    text = _read(FRONTEND / "lib" / "navigation" / "operational-navigation.ts")
    assert "href: '/assistant/orb'" in text


def test_record_hub_orb_prompts_use_assistant_without_child_ids():
    text = _read(RECORD_HUB)
    assert "recordOperationalOrbPromptHref" in text
    op_section = text.split("export function recordOperationalOrbPromptHref", 1)[1].split("\nexport function ", 1)[0]
    assert "/assistant/orb" in op_section
    assert "/orb?context=recording" not in text
    for key in ("young_person_id=", "child_id=", "home_id=", "staff_id="):
        assert key not in op_section


def test_record_hub_operational_quality_review_without_child_ids():
    text = _read(RECORD_HUB)
    section = text.split("export function recordOperationalOrbPromptHref", 1)[1].split("\nexport function ", 1)[0]
    assert "/assistant/orb" in section
    for key in ("young_person_id=", "child_id="):
        assert key not in section


def test_standalone_client_does_not_call_os_apis():
    text = _read(STANDALONE_CLIENT)
    for marker in FORBIDDEN_STANDALONE_OS_API:
        assert marker not in text, f"standalone client must not reference {marker}"


def test_orb_companion_panel_entry_actions():
    text = _read(FRONTEND / "components" / "indicare" / "operational" / "orb-companion-panel.tsx")
    assert "Open ORB with this context" in text
    assert "/assistant/orb?panel=outputs" in text
    assert "Create a recording prompt" in text
