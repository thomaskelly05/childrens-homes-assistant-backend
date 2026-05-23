from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

YOUNG_PERSON_ORB_FILES = [
    FRONTEND / "app" / "young-people" / "page.tsx",
    FRONTEND / "app" / "young-people" / "[id]" / "journey" / "page.tsx",
    FRONTEND / "app" / "young-people" / "[id]" / "page.tsx",
    FRONTEND / "lib" / "child-journey" / "child-journey-routes.ts",
    FRONTEND / "components" / "child-journey" / "child-journey-orb-rail.tsx",
    FRONTEND / "components" / "indicare" / "operational" / "operational-quick-actions.tsx",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _orb_hrefs(text: str) -> list[str]:
    return [href for href in re.findall(r'href=["\']([^"\']+)["\']', text) if "/orb" in href]


def test_young_people_list_orb_uses_assistant():
    text = _read(FRONTEND / "app" / "young-people" / "page.tsx")
    for href in _orb_hrefs(text):
        assert href.startswith("/assistant/orb"), f"List page ORB must be operational: {href}"
    assert "child_journey_summary" in text
    assert "young_person_id=" not in text or "/assistant/orb" in text


def test_young_person_journey_ask_orb_mode():
    header = _read(FRONTEND / "components" / "child-journey" / "child-journey-header.tsx")
    assert "/assistant/orb" in header
    assert "child_journey_summary" in _read(FRONTEND / "lib" / "child-journey" / "child-journey-routes.ts")


def test_no_standalone_orb_child_ids_in_young_person_surfaces():
    standalone_pattern = re.compile(r'["\']/orb\?[^"\']*(?:young_person_id|child_id)=')
    for path in YOUNG_PERSON_ORB_FILES:
        text = _read(path)
        assert not standalone_pattern.search(text), f"{path.name} must not pass child IDs to standalone /orb"


def test_operational_orb_child_context_only_on_assistant():
    routes = _read(FRONTEND / "lib" / "child-journey" / "child-journey-routes.ts")
    for href in _orb_hrefs(routes):
        assert href.startswith("/assistant/orb")
        if "young_person_id=" in href:
            assert "scope=child" in href or "mode=" in href
