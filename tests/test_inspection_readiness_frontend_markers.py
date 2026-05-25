from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

INSPECTION_FILES = [
    FRONTEND / "app" / "intelligence" / "inspection-readiness" / "page.tsx",
    FRONTEND / "components" / "inspection-readiness" / "inspection-readiness-workspace.tsx",
    FRONTEND / "components" / "inspection-readiness" / "inspection-pack-selector.tsx",
    FRONTEND / "components" / "inspection-readiness" / "inspection-pack-viewer.tsx",
    FRONTEND / "components" / "inspection-readiness" / "inspection-pack-actions.tsx",
    FRONTEND / "components" / "inspection-readiness" / "inspection-orb-support.tsx",
    FRONTEND / "lib" / "os-api" / "inspection-readiness.ts",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_inspection_readiness_page_exists():
    page = FRONTEND / "app" / "intelligence" / "inspection-readiness" / "page.tsx"
    assert page.is_file()
    text = _read(page)
    assert "Inspection readiness" in text
    assert "does not predict inspection outcomes" in text


def test_inspection_ui_markers():
    combined = "\n".join(_read(p) for p in INSPECTION_FILES)
    for phrase in (
        "Reg 44",
        "Reg 45",
        "Evidence gaps",
        "Draft-only",
        "Ask OS ORB",
        "Save pack",
        "Copy markdown",
        "Generate pack",
    ):
        assert phrase in combined


def test_orb_links_operational_only():
    combined = "\n".join(_read(p) for p in INSPECTION_FILES)
    for href in re.findall(r'href=["\']([^"\']+)["\']', combined):
        if "/orb" not in href:
            continue
        assert href.startswith("/assistant/orb"), f"Must use operational ORB: {href}"


def test_standalone_orb_does_not_import_inspection_client():
    standalone = _read(FRONTEND / "app" / "orb" / "page.tsx")
    standalone_client = _read(FRONTEND / "lib" / "orb" / "standalone-client.ts")
    assert "inspection-readiness" not in standalone
    assert "inspection-readiness" not in standalone_client


def test_care_hub_inspection_links():
    card = _read(FRONTEND / "components" / "command-centre" / "care-hub-inspection-readiness.tsx")
    assert "/intelligence/inspection-readiness" in card
    assert "care-hub-open-inspection-readiness" in card
    assert "Generate Reg 44" in card or "care-hub-generate-reg44" in card
