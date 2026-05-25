from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

REG45_FILES = list((FRONTEND / "components" / "reg45").glob("*.tsx")) + [
    FRONTEND / "app" / "intelligence" / "reg45" / "page.tsx",
    FRONTEND / "lib" / "os-api" / "reg45-quality-review.ts",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_reg45_page_exists():
    page = FRONTEND / "app" / "intelligence" / "reg45" / "page.tsx"
    assert page.is_file()
    text = _read(page)
    assert "Reg 45 Quality of Care Review" in text
    assert "does not determine compliance" in text


def test_reg45_ui_markers():
    combined = "\n".join(_read(p) for p in REG45_FILES if p.is_file())
    combined += _read(REPO_ROOT / "services" / "reg45_quality_review_registry_service.py")
    for phrase in (
        "Draft review",
        "Children's views, wishes and feelings",
        "Safeguarding and protection",
        "Workforce and leadership",
        "Improvement actions",
        "RI review",
        "Ask OS ORB",
        "Generate draft review",
    ):
        assert phrase in combined


def test_orb_links_operational_only():
    combined = "\n".join(_read(p) for p in REG45_FILES if p.is_file())
    for href in re.findall(r'href=["\']([^"\']+)["\']', combined):
        if "/orb" not in href:
            continue
        assert href.startswith("/assistant/orb"), f"Must use operational ORB: {href}"


def test_standalone_orb_does_not_import_reg45_client():
    standalone = _read(FRONTEND / "app" / "orb" / "page.tsx")
    standalone_client = _read(FRONTEND / "lib" / "orb" / "standalone-client.ts")
    for marker in ("reg45-quality-review", "/api/reg45", "getReg45Dashboard", "generateReg45Review"):
        assert marker not in standalone
        assert marker not in standalone_client
