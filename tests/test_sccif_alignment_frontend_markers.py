from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

SCCIF_FILES = [
    FRONTEND / "app" / "intelligence" / "sccif" / "page.tsx",
    FRONTEND / "components" / "intelligence-sccif" / "sccif-labels.ts",
    FRONTEND / "components" / "intelligence-sccif" / "sccif-alignment-dashboard.tsx",
    FRONTEND / "components" / "intelligence-sccif" / "sccif-judgement-card.tsx",
    FRONTEND / "components" / "intelligence-sccif" / "sccif-quality-standard-card.tsx",
    FRONTEND / "components" / "intelligence-sccif" / "sccif-evidence-list.tsx",
    FRONTEND / "components" / "intelligence-sccif" / "sccif-gap-list.tsx",
    FRONTEND / "components" / "intelligence-sccif" / "sccif-source-note.tsx",
    FRONTEND / "components" / "intelligence-sccif" / "sccif-orb-support.tsx",
    FRONTEND / "lib" / "os-api" / "sccif-alignment.ts",
]

STANDALONE_ORB = FRONTEND / "app" / "orb"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_sccif_page_exists():
    page = FRONTEND / "app" / "intelligence" / "sccif" / "page.tsx"
    assert page.is_file()
    text = _read(page)
    assert "SCCIF and Quality Standards alignment" in text
    assert "does not predict inspection outcomes" in text
    assert "sccif-alignment-page" in text


def test_sccif_ui_markers():
    combined = "\n".join(_read(p) for p in SCCIF_FILES)
    for phrase in (
        "Overall experiences and progress of children",
        "How well children are helped and protected",
        "Effectiveness of leaders and managers",
        "Quality and purpose of care",
        "Children's views, wishes and feelings",
        "Protection of children",
        "Leadership and management",
        "Evidence gaps",
        "Ask OS ORB",
    ):
        assert phrase in combined or phrase.replace("'", "'") in combined


def test_orb_links_operational_only():
    combined = "\n".join(_read(p) for p in SCCIF_FILES)
    for href in re.findall(r'href=["\']([^"\']+)["\']', combined):
        if "/orb" not in href:
            continue
        assert href.startswith("/assistant/orb"), f"Must use operational ORB: {href}"


def test_sccif_inspection_readiness_cross_links():
    page = _read(FRONTEND / "app" / "intelligence" / "sccif" / "page.tsx")
    assert "sccif-open-inspection-readiness" in page
    assert "/intelligence/inspection-readiness" in page
    assert "sccif-generate-reg44" in page
    assert "sccif-generate-reg45" in page
    assert "sccif-evidence-pack-note" in page


def test_standalone_orb_does_not_import_sccif_client():
    if not STANDALONE_ORB.exists():
        return
    for path in STANDALONE_ORB.rglob("*.tsx"):
        text = _read(path)
        assert "sccif-alignment" not in text
    standalone_client = FRONTEND / "lib" / "orb" / "standalone-client.ts"
    if standalone_client.exists():
        assert "sccif-alignment" not in _read(standalone_client)
