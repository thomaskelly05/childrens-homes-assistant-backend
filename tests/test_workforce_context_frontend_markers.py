from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

WORKFORCE_FILES = [
    FRONTEND / "components" / "command-centre" / "care-hub-workforce-context.tsx",
    FRONTEND / "app" / "command-centre" / "page.tsx",
    FRONTEND / "lib" / "os-api" / "workforce-context.ts",
    FRONTEND / "components" / "command-centre" / "manager-daily-brief-page.tsx",
    FRONTEND / "components" / "handover" / "handover-intelligence-panel.tsx",
    FRONTEND / "lib" / "handover" / "handover-sections.ts",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_care_hub_workforce_card_exists():
    card = _read(FRONTEND / "components" / "command-centre" / "care-hub-workforce-context.tsx")
    page = _read(FRONTEND / "app" / "command-centre" / "page.tsx")
    assert 'data-testid="care-hub-workforce-shift"' in card
    assert "Workforce and shift" in card
    assert "CareHubWorkforceContext" in page
    assert 'data-testid="care-hub-open-staff"' in card
    assert "/staff/training-matrix" in card
    assert "/staff/supervision" in card


def test_handover_staff_shift_section():
    sections = _read(FRONTEND / "lib" / "handover" / "handover-sections.ts")
    panel = _read(FRONTEND / "components" / "handover" / "handover-intelligence-panel.tsx")
    assert "staff-shift-context" in sections
    assert "Staff and shift context" in sections
    assert "'staff_shift'" in panel


def test_daily_brief_workforce_section():
    brief_page = _read(FRONTEND / "components" / "command-centre" / "manager-daily-brief-page.tsx")
    care_brief = _read(FRONTEND / "components" / "command-centre" / "care-hub-manager-daily-brief.tsx")
    assert "manager-daily-brief-workforce-summary" in brief_page
    assert "workforce_shift" in care_brief


def test_orb_links_use_assistant_orb():
    combined = "\n".join(_read(p) for p in WORKFORCE_FILES)
    for href in re.findall(r'href=["\']([^"\']+)["\']', combined):
        if "/orb" not in href:
            continue
        assert href.startswith("/assistant/orb"), f"Workforce UI must use operational ORB: {href}"


def test_standalone_orb_does_not_import_workforce_client():
    standalone = _read(FRONTEND / "lib" / "orb" / "standalone-client.ts")
    orb_page = _read(FRONTEND / "app" / "orb" / "page.tsx")
    assert "workforce-context" not in standalone
    assert "workforce-context" not in orb_page
    assert "/api/workforce/context" not in standalone
